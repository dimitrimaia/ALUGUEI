import "server-only";
import type { Linha } from "@/db/tipos";
import { supabaseAdmin } from "./supabase/admin";
import { supabaseServidor } from "./supabase/servidor";
import type { Usuario } from "./sessao";
import { after } from "next/server";
import { notificar, notificarEquipe } from "./notificacoes";

export type Papel = "motorista" | "locador";

/** Garante que o usuário participa da conversa e diz em qual papel. */
export async function participacao(conversaId: string, usuario: Usuario): Promise<{ conversa: Linha<"conversas">; papel: Papel } | null> {
  const admin = supabaseAdmin();
  const { data: conversa } = await admin.from("conversas").select("*").eq("id", conversaId).maybeSingle();
  if (!conversa) return null;
  if (conversa.usuario_id === usuario.id) return { conversa, papel: "motorista" };
  const { data: membro } = await admin.from("membros").select("id").eq("organizacao_id", conversa.organizacao_id).eq("usuario_id", usuario.id).maybeSingle();
  return membro ? { conversa, papel: "locador" } : null;
}

export async function registrarMensagem(conversaId: string, autor: Papel | "sistema", usuarioId: string | null, texto: string) {
  const admin = supabaseAdmin();
  const agora = new Date().toISOString();
  const { data, error } = await admin.from("mensagens").insert({ conversa_id: conversaId, autor, usuario_id: usuarioId, texto }).select("*").single();
  if (error || !data) throw new Error(`Falha ao enviar mensagem: ${error?.message}`);
  await admin
    .from("conversas")
    .update({ ultima_mensagem_em: agora, ...(autor === "motorista" ? { lida_motorista_em: agora } : autor === "locador" ? { lida_locador_em: agora } : {}) })
    .eq("id", conversaId);
  // Avisa a outra parte depois de responder, para o envio não esperar o push.
  after(async () => {
    const { data: c } = await admin.from("conversas").select("organizacao_id, usuario_id, nome_motorista").eq("id", conversaId).single();
    if (!c) return;
    const trecho = texto.length > 120 ? `${texto.slice(0, 117)}…` : texto;
    if (autor === "motorista") {
      await notificarEquipe(c.organizacao_id, { modelo: "chat.mensagem", titulo: `Mensagem de ${c.nome_motorista}`, texto: trecho, link: `/painel/conversas/${conversaId}`, assunto: "mensagens", chave: `msg:${data.id}` });
    } else {
      const { data: org } = await admin.from("organizacoes").select("nome").eq("id", c.organizacao_id).single();
      await notificar({ usuarioId: c.usuario_id, organizacaoId: c.organizacao_id, modelo: "chat.mensagem", titulo: autor === "sistema" ? `${org?.nome ?? "Locador"}: novidade na conversa` : `Mensagem de ${org?.nome ?? "locador"}`, texto: trecho.replace(/\s\/m\/\S+/g, ""), link: `/m/conversas/${conversaId}`, assunto: "mensagens", chave: `msg:${data.id}` });
    }
  });
  return data;
}

export async function marcarLida(conversaId: string, papel: Papel) {
  const agora = new Date().toISOString();
  await supabaseAdmin().from("conversas").update(papel === "motorista" ? { lida_motorista_em: agora } : { lida_locador_em: agora }).eq("id", conversaId);
}

/** Conversas com mensagem nova para o locador (para o contador do menu). */
export async function conversasNaoLidasDoLocador(organizacaoId: string): Promise<number> {
  const supabase = await supabaseServidor();
  const { data } = await supabase.from("conversas").select("ultima_mensagem_em, lida_locador_em").eq("organizacao_id", organizacaoId);
  return (data ?? []).filter((c) => !c.lida_locador_em || c.lida_locador_em < c.ultima_mensagem_em).length;
}

/** Conversas com mensagem nova para o motorista. */
export async function conversasNaoLidasDoMotorista(usuarioId: string): Promise<number> {
  const { data } = await supabaseAdmin().from("conversas").select("ultima_mensagem_em, lida_motorista_em").eq("usuario_id", usuarioId);
  return (data ?? []).filter((c) => !c.lida_motorista_em || c.lida_motorista_em < c.ultima_mensagem_em).length;
}

export interface ResumoConversa {
  id: string;
  carro: string;
  locador: string;
  ultimaMensagemEm: string;
  naoLida: boolean;
}

/** Conversas do motorista, da mais recente para a mais antiga, com o carro e o locador. */
export async function conversasDoMotorista(usuarioId: string, limite = 50): Promise<ResumoConversa[]> {
  const admin = supabaseAdmin();
  const { data: conversas } = await admin.from("conversas").select("*").eq("usuario_id", usuarioId).order("ultima_mensagem_em", { ascending: false }).limit(limite);
  const lista = conversas ?? [];
  if (!lista.length) return [];
  const [{ data: anuncios }, { data: orgs }] = await Promise.all([
    admin.from("anuncios").select("id, veiculo_id").in("id", lista.map((c) => c.anuncio_id)),
    admin.from("organizacoes").select("id, nome").in("id", lista.map((c) => c.organizacao_id)),
  ]);
  const { data: veiculos } = anuncios?.length ? await admin.from("veiculos").select("id, modelo").in("id", anuncios.map((a) => a.veiculo_id)) : { data: [] };
  return lista.map((c) => ({
    id: c.id,
    carro: veiculos?.find((v) => v.id === anuncios?.find((a) => a.id === c.anuncio_id)?.veiculo_id)?.modelo ?? "Carro",
    locador: orgs?.find((o) => o.id === c.organizacao_id)?.nome ?? "Locador",
    ultimaMensagemEm: c.ultima_mensagem_em,
    naoLida: !c.lida_motorista_em || c.lida_motorista_em < c.ultima_mensagem_em,
  }));
}
