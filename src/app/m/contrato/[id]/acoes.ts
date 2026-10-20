"use server";

import { redirect } from "next/navigation";
import { gerarAgenda } from "@/dominio/agenda/gerar-agenda";
import type { ParametrosContrato } from "@/dominio/contrato/parametros";
import { auditar } from "@/lib/auditoria";
import { guardarEvidencia } from "@/lib/evidencias";
import { contratoDoMotorista } from "@/lib/motorista";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type EstadoAssinatura = { erro?: string };

/**
 * Assinatura eletrônica do motorista (Lei 14.063/2020): o aceite vai para o
 * cofre com o hash do PDF que ele viu, IP e dispositivo. Assinado, a agenda
 * de obrigações é gerada (idempotente pela chave).
 */
export async function assinarContrato(contratoId: string, _: EstadoAssinatura, form: FormData): Promise<EstadoAssinatura> {
  const usuario = await exigirUsuario(`/m/contrato/${contratoId}`);
  const c = await contratoDoMotorista(usuario.id, contratoId);
  if (!c || c.status !== "aguardando_assinatura") return { erro: "Este contrato não está aguardando sua assinatura." };
  if (form.get("concordo") !== "sim") return { erro: "Marque que leu e concorda com o contrato." };
  if (form.get("pdfSha256") !== c.pdf_sha256) return { erro: "O contrato mudou desde que você abriu. Recarregue a página." };

  const admin = supabaseAdmin();
  const { data: l } = await admin.from("locatarios").select("nome, cpf").eq("id", c.locatario_id).single();
  const latitude = Number(form.get("latitude")) || undefined;
  const longitude = Number(form.get("longitude")) || undefined;

  await guardarEvidencia(
    new Blob([JSON.stringify({ contratoId, papel: "locatario", usuarioId: usuario.id, nome: l?.nome, cpf: l?.cpf, telefone: usuario.telefone, email: usuario.email, pdfSha256: c.pdf_sha256, aceitoEm: new Date().toISOString() })], { type: "application/json" }),
    { organizacaoId: c.organizacao_id, enviadoPor: usuario.id, finalidade: "contrato.aceite.locatario", tipo: "aceite", contratoId, latitude, longitude },
  );

  const { error } = await admin
    .from("contratos")
    .update({ status: "assinado", assinado_em: new Date().toISOString() })
    .eq("id", contratoId)
    .eq("status", "aguardando_assinatura");
  if (error) return { erro: "Não foi possível registrar a assinatura. Tente de novo." };

  const agenda = gerarAgenda(contratoId, c.parametros as unknown as ParametrosContrato);
  await admin.from("obrigacoes").upsert(
    agenda.map((o) => ({
      organizacao_id: c.organizacao_id,
      contrato_id: contratoId,
      chave: o.chave,
      tipo: o.tipo,
      vencimento: o.vencimento,
      valor_centavos: o.valor,
      periodo_inicio: o.periodo?.inicio ?? null,
      periodo_fim: o.periodo?.fim ?? null,
    })),
    { onConflict: "chave", ignoreDuplicates: true },
  );

  await auditar({ organizacaoId: c.organizacao_id, usuarioId: usuario.id, acao: "contrato.assinar", entidade: "contratos", entidadeId: contratoId, depois: { pdfSha256: c.pdf_sha256, obrigacoes: agenda.length } });
  redirect("/m");
}
