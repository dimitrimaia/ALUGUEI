import "server-only";
import type { ParametrosContrato } from "@/dominio/contrato/parametros";
import { type DataISO, data } from "@/dominio/datas/data";
import type { ChecklistVistoria } from "@/dominio/vistoria/roteiro";
import { supabaseAdmin } from "./supabase/admin";

/**
 * Tudo o que o encerramento precisa saber do contrato: km da entrega e da
 * devolução, saldo do extrato, caução lançada e paga, e os aluguéis vencidos
 * até a devolução que ainda não viraram lançamento.
 */
export async function dadosEncerramento(contratoId: string, organizacaoId: string, devolucao: DataISO) {
  const admin = supabaseAdmin();
  const { data: c } = await admin.from("contratos").select("*").eq("id", contratoId).eq("organizacao_id", organizacaoId).maybeSingle();
  if (!c) return null;
  const [{ data: vistorias }, { data: lancamentos }, { data: obrigacoes }] = await Promise.all([
    admin.from("vistorias").select("*").eq("contrato_id", contratoId),
    admin.from("lancamentos").select("tipo, valor_centavos, obrigacao_id, chave").eq("contrato_id", contratoId),
    admin.from("obrigacoes").select("id, chave, tipo, vencimento, valor_centavos, status").eq("contrato_id", contratoId),
  ]);
  const entrega = vistorias?.find((v) => v.tipo === "entrega") ?? null;
  const devolucaoV = vistorias?.find((v) => v.tipo === "devolucao") ?? null;
  const ls = lancamentos ?? [];
  const chaves = new Set(ls.map((l) => l.chave));
  const parcelasCaucao = new Set((obrigacoes ?? []).filter((o) => o.tipo === "caucao_parcela").map((o) => o.id));
  const aluguelNaoLancado = (obrigacoes ?? []).filter(
    (o) => o.tipo === "aluguel" && ["pendente", "atrasada"].includes(o.status) && o.vencimento <= devolucao && !chaves.has(`${o.chave}:debito`),
  );
  const saldoLancado = ls.reduce((s, l) => s + l.valor_centavos, 0);
  return {
    contrato: c,
    parametros: c.parametros as unknown as ParametrosContrato,
    entrega,
    devolucao: devolucaoV,
    checklistEntrega: (entrega?.checklist ?? null) as unknown as ChecklistVistoria | null,
    checklistDevolucao: (devolucaoV?.checklist ?? null) as unknown as ChecklistVistoria | null,
    aluguelNaoLancado,
    saldoAberto: saldoLancado + aluguelNaoLancado.reduce((s, o) => s + (o.valor_centavos ?? 0), 0),
    caucaoLancada: ls.filter((l) => l.tipo === "caucao").reduce((s, l) => s + l.valor_centavos, 0),
    caucaoPaga: -ls.filter((l) => l.tipo === "pagamento" && l.obrigacao_id && parcelasCaucao.has(l.obrigacao_id)).reduce((s, l) => s + l.valor_centavos, 0),
    obrigacoesFuturas: (obrigacoes ?? []).filter((o) => ["pendente", "atrasada"].includes(o.status) && o.vencimento > devolucao).map((o) => o.id),
    vencimentoDe: (id: string) => data((obrigacoes ?? []).find((o) => o.id === id)!.vencimento),
  };
}
