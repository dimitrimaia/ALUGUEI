import "server-only";
import type { Linha } from "@/db/tipos";
import { supabaseAdmin } from "./supabase/admin";
import { supabaseServidor } from "./supabase/servidor";
import type { Usuario } from "./sessao";

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
