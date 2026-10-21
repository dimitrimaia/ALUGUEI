"use server";

import { conciliar } from "@/lib/cobrancas";
import { contratosDoMotorista } from "@/lib/motorista";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { notificarEquipe } from "@/lib/notificacoes";

/** "Já paguei": consulta o Asaas na hora, sem esperar o aviso de pagamento. */
export async function verificarPagamento(obrigacaoId: string): Promise<{ pago: boolean }> {
  const usuario = await exigirUsuario(`/m/pagar/${obrigacaoId}`);
  const admin = supabaseAdmin();
  const { data: cob } = await admin.from("cobrancas").select("*").eq("obrigacao_id", obrigacaoId).neq("status", "cancelada").maybeSingle();
  if (!cob || !(await contratosDoMotorista(usuario.id)).some((c) => c.id === cob.contrato_id)) return { pago: false };
  const atual = await conciliar(cob);
  return { pago: atual.status === "paga" };
}

/** Pix direto: o motorista avisa que pagou. O locador confere no banco dele e dá baixa. */
export async function informarPagamento(obrigacaoId: string): Promise<{ ok: boolean }> {
  const usuario = await exigirUsuario(`/m/pagar/${obrigacaoId}`);
  const admin = supabaseAdmin();
  const { data: o } = await admin.from("obrigacoes").select("id, contrato_id, status").eq("id", obrigacaoId).maybeSingle();
  if (!o || o.status === "cumprida" || !(await contratosDoMotorista(usuario.id)).some((c) => c.id === o.contrato_id)) return { ok: false };
  const { error } = await admin.from("obrigacoes").update({ pagamento_informado_em: new Date().toISOString() }).eq("id", obrigacaoId).is("pagamento_informado_em", null);
  if (!error) {
    const { data: ob } = await admin.from("obrigacoes").select("organizacao_id, valor_centavos").eq("id", obrigacaoId).single();
    if (ob) await notificarEquipe(ob.organizacao_id, { contratoId: o.contrato_id, modelo: "pix.informado", titulo: "Motorista avisou que pagou", texto: `Pix direto de ${formatarBRL(ob.valor_centavos ?? 0)}. Confira no seu banco e dê baixa.`, link: "/painel/financeiro", assunto: "lembretes", chave: `pix-informado:${obrigacaoId}` });
  }
  return { ok: !error };
}
