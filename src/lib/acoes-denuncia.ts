"use server";

import { z } from "zod";
import { enviarEmail } from "@/integracoes/email";
import { auditar } from "./auditoria";
import { participacao } from "./conversas";
import { MOTIVOS_DENUNCIA } from "./denuncia";
import { emailsDaEquipe } from "./equipe-aluguei";
import { usuarioAtual } from "./sessao";
import { supabaseAdmin } from "./supabase/admin";

const Entrada = z.object({
  alvo: z.enum(["conversa", "anuncio"]),
  id: z.string().uuid(),
  motivo: z.enum(MOTIVOS_DENUNCIA),
  texto: z.string().trim().max(1500).default(""),
});

/**
 * Denúncia de um usuário (pela conversa) ou de um anúncio. Vira um atendimento
 * do suporte, que a equipe vê em /admin/suporte e decide o que fazer (bloquear a
 * conta, tirar o anúncio do ar). Nada é bloqueado automaticamente.
 */
export async function denunciar(dados: z.input<typeof Entrada>): Promise<{ ok?: true; erro?: string }> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erro: "Entre na sua conta para denunciar." };
  const lido = Entrada.safeParse(dados);
  if (!lido.success) return { erro: "Escolha o motivo da denúncia." };
  const { alvo, id, motivo, texto } = lido.data;
  const admin = supabaseAdmin();

  let modo: "motorista" | "locador" = "motorista";
  let organizacaoId: string | null = null;
  let descricao: string;
  if (alvo === "conversa") {
    const p = await participacao(id, usuario);
    if (!p) return { erro: "Conversa não encontrada." };
    modo = p.papel;
    organizacaoId = p.conversa.organizacao_id;
    descricao = p.papel === "motorista" ? `a locadora da conversa ${id}` : `o motorista ${p.conversa.nome_motorista} (conversa ${id})`;
  } else {
    const { data: a } = await admin.from("anuncios").select("id, organizacao_id").eq("id", id).maybeSingle();
    if (!a) return { erro: "Anúncio não encontrado." };
    organizacaoId = a.organizacao_id;
    descricao = `o anúncio ${id}`;
  }

  const { data: at, error } = await admin
    .from("atendimentos")
    .insert({ usuario_id: usuario.id, modo, organizacao_id: modo === "locador" ? organizacaoId : null, assunto: `Denúncia: ${motivo}`, lido_usuario_em: new Date().toISOString() })
    .select("id")
    .single();
  if (error || !at) return { erro: "Não foi possível enviar. Tente de novo." };
  const corpo = `Denúncia contra ${descricao}.\nMotivo: ${motivo}${texto ? `\n\n${texto}` : ""}`;
  await admin.from("mensagens_suporte").insert([
    { atendimento_id: at.id, autor: "usuario", usuario_id: usuario.id, texto: corpo },
    { atendimento_id: at.id, autor: "sistema", texto: "Recebemos a sua denúncia. A equipe do Aluguei analisa e pode bloquear a conta ou tirar o anúncio do ar. Você recebe a resposta por aqui." },
  ]);
  await auditar({ organizacaoId, usuarioId: usuario.id, acao: "denuncia.criada", entidade: alvo, entidadeId: id, depois: { motivo, atendimento: at.id } });
  for (const para of emailsDaEquipe()) await enviarEmail({ para, assunto: `Denúncia: ${motivo}`, texto: corpo, link: `/admin/suporte/${at.id}`, chave: `denuncia:${at.id}:${para}` });
  return { ok: true };
}
