"use server";

import { conciliar } from "@/lib/cobrancas";
import { contratosDoMotorista } from "@/lib/motorista";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** "Já paguei": consulta o Asaas na hora, sem esperar o aviso de pagamento. */
export async function verificarPagamento(obrigacaoId: string): Promise<{ pago: boolean }> {
  const usuario = await exigirUsuario(`/m/pagar/${obrigacaoId}`);
  const admin = supabaseAdmin();
  const { data: cob } = await admin.from("cobrancas").select("*").eq("obrigacao_id", obrigacaoId).neq("status", "cancelada").maybeSingle();
  if (!cob || !(await contratosDoMotorista(usuario.id)).some((c) => c.id === cob.contrato_id)) return { pago: false };
  const atual = await conciliar(cob);
  return { pago: atual.status === "paga" };
}
