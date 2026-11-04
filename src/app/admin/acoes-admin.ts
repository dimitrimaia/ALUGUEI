"use server";

import { revalidatePath } from "next/cache";
import { lerReais } from "@/dominio/dinheiro/centavos";
import { auditar } from "@/lib/auditoria";
import { conciliar } from "@/lib/cobrancas";
import { exigirEquipeAluguei } from "@/lib/equipe-aluguei";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Ações da equipe do Aluguei. Cada uma confere se quem chama é da equipe e grava
 * na auditoria (antes e depois). Nada drástico de contrato acontece aqui:
 * rescisão e retomada continuam sendo decisão do locador (acoes_pendentes).
 */

export async function bloquearUsuario(usuarioId: string, bloquear: boolean) {
  const equipe = await exigirEquipeAluguei();
  if (usuarioId === equipe.id) throw new Error("Você não pode bloquear a sua própria conta.");
  const { error } = await supabaseAdmin().auth.admin.updateUserById(usuarioId, { ban_duration: bloquear ? "876000h" : "none" });
  if (error) throw error;
  await auditar({ organizacaoId: null, usuarioId: equipe.id, acao: bloquear ? "admin.usuario.bloquear" : "admin.usuario.desbloquear", entidade: "usuario", entidadeId: usuarioId });
  revalidatePath(`/admin/usuarios/${usuarioId}`);
}

export async function confirmarEmail(usuarioId: string) {
  const equipe = await exigirEquipeAluguei();
  const { error } = await supabaseAdmin().auth.admin.updateUserById(usuarioId, { email_confirm: true });
  if (error) throw error;
  await auditar({ organizacaoId: null, usuarioId: equipe.id, acao: "admin.usuario.confirmar_email", entidade: "usuario", entidadeId: usuarioId });
  revalidatePath(`/admin/usuarios/${usuarioId}`);
}

/** Mensalidade por carro e modo assistido de uma locadora. */
export async function ajustarLocadora(organizacaoId: string, form: FormData) {
  const equipe = await exigirEquipeAluguei();
  const admin = supabaseAdmin();
  const { data: antes } = await admin.from("organizacoes").select("mensalidade_por_carro_centavos, modo_assistido").eq("id", organizacaoId).single();
  const mensalidade = lerReais(String(form.get("mensalidade") ?? ""));
  const depois = {
    mensalidade_por_carro_centavos: mensalidade !== null && mensalidade >= 0 ? mensalidade : (antes?.mensalidade_por_carro_centavos ?? 0),
    modo_assistido: form.get("assistido") === "on",
  };
  const { error } = await admin.from("organizacoes").update(depois).eq("id", organizacaoId);
  if (error) throw error;
  await auditar({ organizacaoId, usuarioId: equipe.id, acao: "admin.locadora.ajustar", entidade: "organizacao", entidadeId: organizacaoId, antes: antes ?? null, depois });
  revalidatePath(`/admin/locadoras/${organizacaoId}`);
}

/** Moderação do marketplace: pausa ou reativa um anúncio. */
export async function moderarAnuncio(anuncioId: string, pausar: boolean) {
  const equipe = await exigirEquipeAluguei();
  const admin = supabaseAdmin();
  const { data: a } = await admin.from("anuncios").select("organizacao_id, status").eq("id", anuncioId).single();
  if (!a) return;
  const status = pausar ? "pausado" : "ativo";
  await admin.from("anuncios").update({ status, atualizado_em: new Date().toISOString() }).eq("id", anuncioId);
  await auditar({ organizacaoId: a.organizacao_id, usuarioId: equipe.id, acao: pausar ? "admin.anuncio.pausar" : "admin.anuncio.reativar", entidade: "anuncio", entidadeId: anuncioId, antes: { status: a.status }, depois: { status } });
  revalidatePath("/admin/anuncios");
}

/** Confere a cobrança no Asaas agora (pagamento perdido no webhook). */
export async function conferirCobranca(cobrancaId: string) {
  const equipe = await exigirEquipeAluguei();
  const admin = supabaseAdmin();
  const { data: c } = await admin.from("cobrancas").select("*").eq("id", cobrancaId).single();
  if (!c) return;
  const depois = await conciliar(c);
  await auditar({ organizacaoId: c.organizacao_id, usuarioId: equipe.id, acao: "admin.cobranca.conferir", entidade: "cobranca", entidadeId: cobrancaId, antes: { status: c.status }, depois: { status: depois.status } });
  revalidatePath("/admin/cobrancas");
}
