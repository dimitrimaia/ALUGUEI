import { diasDeAtraso } from "@/dominio/checkin/checkin";
import type { ParametrosContrato } from "@/dominio/contrato/parametros";
import { data, formatarData, hoje, somarDias } from "@/dominio/datas/data";
import { conciliar, contaDoLocador, emitirCobranca } from "@/lib/cobrancas";
import { supabaseAdmin } from "@/lib/supabase/admin";

const DIAS_DE_ANTECEDENCIA = 3;

/**
 * Rotina diária (Vercel Cron, 06:00 de São Paulo). Cada passo é idempotente,
 * então rodar duas vezes no mesmo dia não cobra nem lança nada em dobro (RNF-032).
 *  1. emite as cobranças que vencem nos próximos 3 dias;
 *  2. concilia as cobranças em aberto com o Asaas (cobre aviso de pagamento perdido);
 *  3. marca como atrasadas as obrigações vencidas e não pagas;
 *  4. check-in sem envio há mais dias que o contrato tolera vira uma decisão
 *     pendente para o locador (RF-073). O sistema só sugere; não notifica nem multa.
 */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("não autorizado", { status: 401 });
  }
  const admin = supabaseAdmin();
  const dia = hoje();
  const resultado = { emitidas: 0, conciliadas: 0, atrasadas: 0, checkinsAtrasados: 0, erros: [] as string[] };

  const { data: ativos } = await admin.from("contratos").select("id, organizacao_id").eq("status", "ativo");
  const comConta = new Set<string>();
  for (const org of new Set((ativos ?? []).map((c) => c.organizacao_id))) {
    if (await contaDoLocador(org)) comConta.add(org);
  }
  const contratos = (ativos ?? []).filter((c) => comConta.has(c.organizacao_id)).map((c) => c.id);

  if (contratos.length) {
    const { data: aVencer } = await admin
      .from("obrigacoes")
      .select("id")
      .in("contrato_id", contratos)
      .in("tipo", ["aluguel", "caucao_parcela"])
      .in("status", ["pendente", "atrasada"])
      .lte("vencimento", somarDias(dia, DIAS_DE_ANTECEDENCIA));
    for (const o of aVencer ?? []) {
      try {
        await emitirCobranca(o.id);
        resultado.emitidas++;
      } catch (e) {
        resultado.erros.push(`emitir ${o.id}: ${String(e)}`);
      }
    }
  }

  const { data: abertas } = await admin.from("cobrancas").select("*").in("status", ["emitida", "vencida"]).lte("vencimento", somarDias(dia, DIAS_DE_ANTECEDENCIA));
  for (const c of abertas ?? []) {
    try {
      await conciliar(c);
      resultado.conciliadas++;
    } catch (e) {
      resultado.erros.push(`conciliar ${c.id}: ${String(e)}`);
    }
  }

  const { data: vencidas } = await admin
    .from("obrigacoes")
    .update({ status: "atrasada" })
    .eq("status", "pendente")
    .in("tipo", ["aluguel", "caucao_parcela", "checkin"])
    .lt("vencimento", dia)
    .select("id");
  resultado.atrasadas = vencidas?.length ?? 0;

  const { data: semCheckin } = await admin.from("obrigacoes").select("id, organizacao_id, contrato_id, vencimento").eq("tipo", "checkin").eq("status", "atrasada");
  for (const o of semCheckin ?? []) {
    const { data: c } = await admin.from("contratos").select("parametros, status").eq("id", o.contrato_id).single();
    if (c?.status !== "ativo") continue;
    const tolerancia = (c.parametros as unknown as ParametrosContrato).prazos.diasSemCheckinParaNotificar;
    const atraso = diasDeAtraso(data(o.vencimento), dia);
    if (atraso < tolerancia) continue;
    // Idempotente: uma sugestão por check-in.
    const { data: existe } = await admin.from("acoes_pendentes").select("id").eq("contrato_id", o.contrato_id).eq("tipo", "checkin_atrasado").contains("proposta", { obrigacaoId: o.id }).maybeSingle();
    if (existe) continue;
    await admin.from("acoes_pendentes").insert({
      organizacao_id: o.organizacao_id,
      contrato_id: o.contrato_id,
      tipo: "checkin_atrasado",
      proposta: { obrigacaoId: o.id, vencimento: o.vencimento, diasDeAtraso: atraso },
      motivo: `Check-in de ${formatarData(data(o.vencimento))} sem envio há ${atraso} dias. O contrato trata como infração grave: registre ou dispense.`,
    });
    resultado.checkinsAtrasados++;
  }

  return Response.json(resultado);
}
