import { hoje, somarDias } from "@/dominio/datas/data";
import { conciliar, contaDoLocador, emitirCobranca } from "@/lib/cobrancas";
import { supabaseAdmin } from "@/lib/supabase/admin";

const DIAS_DE_ANTECEDENCIA = 3;

/**
 * Rotina diária (Vercel Cron, 06:00 de São Paulo). Cada passo é idempotente,
 * então rodar duas vezes no mesmo dia não cobra nem lança nada em dobro (RNF-032).
 *  1. emite as cobranças que vencem nos próximos 3 dias;
 *  2. concilia as cobranças em aberto com o Asaas (cobre aviso de pagamento perdido);
 *  3. marca como atrasadas as obrigações vencidas e não pagas.
 */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("não autorizado", { status: 401 });
  }
  const admin = supabaseAdmin();
  const dia = hoje();
  const resultado = { emitidas: 0, conciliadas: 0, atrasadas: 0, erros: [] as string[] };

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
    .in("tipo", ["aluguel", "caucao_parcela"])
    .lt("vencimento", dia)
    .select("id");
  resultado.atrasadas = vencidas?.length ?? 0;

  return Response.json(resultado);
}
