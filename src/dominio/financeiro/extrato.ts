import { calcularEncargos } from "../contrato/encargos";
import type { ParametrosContrato } from "../contrato/parametros";
import { type DataISO, diasEntre } from "../datas/data";
import type { Centavos } from "../dinheiro/centavos";

export type Situacao = "paga" | "atrasada" | "vence_hoje" | "a_vencer" | "cancelada";

export function situacao(o: { vencimento: DataISO; status: string }, hoje: DataISO): Situacao {
  if (o.status === "cumprida" || o.status === "isenta") return "paga";
  if (o.status === "cancelada") return "cancelada";
  if (o.vencimento < hoje) return "atrasada";
  return o.vencimento === hoje ? "vence_hoje" : "a_vencer";
}

export function diasDeAtraso(vencimento: DataISO, hoje: DataISO): number {
  return Math.max(0, diasEntre(vencimento, hoje));
}

/**
 * Quando um Pix é pago depois do vencimento, o Asaas soma multa e juros. Esta
 * função separa o excedente em multa e juros, para o extrato mostrar cada um
 * com sua origem. A multa nunca passa da do contrato; o resto é juro.
 */
export function separarEncargos(
  original: Centavos,
  pago: Centavos,
  vencimento: DataISO,
  pagoEm: DataISO,
  encargos: ParametrosContrato["encargos"],
): { multa: Centavos; juros: Centavos } {
  const excedente = Math.max(0, pago - original);
  if (excedente === 0) return { multa: 0, juros: 0 };
  const esperado = calcularEncargos(original, vencimento, pagoEm, encargos);
  const multa = Math.min(esperado.multa, excedente);
  return { multa, juros: excedente - multa };
}

/** Saldo do extrato: débitos positivos, créditos negativos. Positivo = o motorista deve. */
export function saldo(lancamentos: { valor: Centavos }[]): Centavos {
  return lancamentos.reduce((s, l) => s + l.valor, 0);
}
