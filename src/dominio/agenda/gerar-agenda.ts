import { proximoDiaUtil } from "../datas/calendario";
import { type DataISO, diasEntre, proximoDiaDaSemana, somarDias } from "../datas/data";
import { type Centavos, arredondar } from "../dinheiro/centavos";
import type { ParametrosContrato } from "../contrato/parametros";

export type TipoObrigacao = "aluguel" | "caucao_parcela" | "checkin";

export interface Obrigacao {
  /**
   * Chave única "contrato:tipo:data". O banco tem índice único nela, então
   * gerar a agenda de novo, ou um job rodar duas vezes, nunca duplica uma
   * cobrança (RNF-032).
   */
  chave: string;
  tipo: TipoObrigacao;
  vencimento: DataISO;
  valor: Centavos | null;
  /** Período coberto, quando a obrigação é um aluguel: [inicio, fim). */
  periodo?: { inicio: DataISO; fim: DataISO };
}

function chave(contratoId: string, tipo: TipoObrigacao, d: DataISO): string {
  return `${contratoId}:${tipo}:${d}`;
}

/**
 * Agenda de obrigações gerada na assinatura do contrato: aluguéis semanais
 * antecipados, parcelas da caução e check-ins semanais. Períodos incompletos
 * (início fora do dia de vencimento, ou fim no meio da semana) são cobrados
 * proporcionalmente por dia, 1/7 do aluguel semanal.
 */
export function gerarAgenda(contratoId: string, p: ParametrosContrato): Obrigacao[] {
  const obrigacoes: Obrigacao[] = [];

  let inicioPeriodo = p.inicio;
  while (inicioPeriodo < p.fim) {
    const proximoVencimento = proximoDiaDaSemana(somarDias(inicioPeriodo, 1), p.diaVencimento);
    const fimPeriodo = proximoVencimento < p.fim ? proximoVencimento : p.fim;
    const dias = diasEntre(inicioPeriodo, fimPeriodo);
    obrigacoes.push({
      chave: chave(contratoId, "aluguel", inicioPeriodo),
      tipo: "aluguel",
      vencimento: inicioPeriodo,
      valor: dias === 7 ? p.aluguelSemanal : arredondar((p.aluguelSemanal * dias) / 7),
      periodo: { inicio: inicioPeriodo, fim: fimPeriodo },
    });
    inicioPeriodo = fimPeriodo;
  }

  for (const parcela of p.caucao.parcelas) {
    const vencimento =
      p.vencimentoEmDiaNaoUtil === "proximo_dia_util" ? proximoDiaUtil(parcela.vencimento) : parcela.vencimento;
    obrigacoes.push({
      chave: chave(contratoId, "caucao_parcela", vencimento),
      tipo: "caucao_parcela",
      vencimento,
      valor: parcela.valor,
    });
  }

  for (
    let d = proximoDiaDaSemana(somarDias(p.inicio, 1), p.checkin.diaSemana);
    d < p.fim;
    d = somarDias(d, 7)
  ) {
    obrigacoes.push({ chave: chave(contratoId, "checkin", d), tipo: "checkin", vencimento: d, valor: null });
  }

  return obrigacoes.sort((a, b) => a.vencimento.localeCompare(b.vencimento) || a.tipo.localeCompare(b.tipo));
}
