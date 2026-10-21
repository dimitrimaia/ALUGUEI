"use server";

import { revalidatePath } from "next/cache";
import { auditar } from "@/lib/auditoria";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/servidor";

/** O locador viu as fotos do check-in. */
export async function marcarRevisado(contratoId: string, checkinId: string): Promise<{ ok?: string; erro?: string }> {
  const { organizacao, usuario } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const { error } = await supabase.from("checkins").update({ revisado_por: usuario.id }).eq("id", checkinId).eq("organizacao_id", organizacao.id);
  if (error) return { erro: "Não foi possível marcar agora." };
  await auditar({ organizacaoId: organizacao.id, usuarioId: usuario.id, acao: "checkin.revisado", entidade: "checkins", entidadeId: checkinId });
  revalidatePath(`/painel/contratos/${contratoId}`);
  revalidatePath("/painel");
  return { ok: "Revisado." };
}

/**
 * Decisão humana sobre uma ação sugerida pelo sistema (ex.: check-in atrasado).
 * "Registrar" só anota a infração no histórico (RF-073); nada é enviado ou cobrado.
 */
export async function decidirAcao(acaoId: string, decisao: "registrar" | "dispensar"): Promise<{ ok?: string; erro?: string }> {
  const { organizacao, usuario } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const { data: a } = await supabase.from("acoes_pendentes").select("*").eq("id", acaoId).eq("organizacao_id", organizacao.id).eq("status", "pendente").maybeSingle();
  if (!a) return { erro: "Já foi decidida." };
  const status = decisao === "registrar" ? "aprovada" : "recusada";
  await supabase.from("acoes_pendentes").update({ status, decidido_por: usuario.id, decidido_em: new Date().toISOString() }).eq("id", acaoId);
  await auditar({ organizacaoId: organizacao.id, usuarioId: usuario.id, acao: decisao === "registrar" ? "contrato.infracao_registrada" : "acao.dispensada", entidade: "acoes_pendentes", entidadeId: acaoId, depois: { tipo: a.tipo, motivo: a.motivo } });
  if (a.contrato_id) revalidatePath(`/painel/contratos/${a.contrato_id}`);
  revalidatePath("/painel");
  return { ok: decisao === "registrar" ? "Infração registrada no histórico." : "Dispensada." };
}
