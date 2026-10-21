import { type OpcoesCalendario, somarDiasUteis } from "../datas/calendario";
import { type DataISO, diasEntre } from "../datas/data";
import type { Centavos } from "../dinheiro/centavos";
import type { ParametrosContrato } from "../contrato/parametros";
import { ITENS_CHECKLIST, type ChecklistVistoria, type IdItem } from "../vistoria/roteiro";

/**
 * Encerramento do contrato (RF-035, RF-045, RF-060): o demonstrativo de
 * pendências da devolução e o quanto da caução volta para o motorista.
 * O ledger mantém o sinal de sempre: positivo é débito do motorista.
 */

export type MotivoEncerramento = "fim_do_prazo" | "pedido_do_motorista" | "rescisao_pelo_locador" | "acordo";

export const MOTIVOS_ENCERRAMENTO: Record<MotivoEncerramento, { rotulo: string; rescisao: boolean }> = {
  fim_do_prazo: { rotulo: "Fim do prazo do contrato", rescisao: false },
  acordo: { rotulo: "Acordo entre as partes", rescisao: false },
  pedido_do_motorista: { rotulo: "O motorista pediu para sair antes", rescisao: true },
  rescisao_pelo_locador: { rotulo: "Rescisão pelo locador (descumprimento)", rescisao: true },
};

export interface Pendencia {
  tipo: "km_excedente" | "avaria" | "combustivel" | "multa_rescisoria" | "outro";
  descricao: string;
  valor: Centavos;
}

export interface EntradaEncerramento {
  parametros: Pick<ParametrosContrato, "inicio" | "km" | "prazos">;
  devolucao: DataISO;
  kmEntrega: number;
  kmDevolucao: number;
  /** Soma de todos os lançamentos do contrato até agora (inclui caução lançada e paga). */
  saldoAberto: Centavos;
  caucaoLancada: Centavos;
  caucaoPaga: Centavos;
  /** Avarias, combustível, multa rescisória: valores definidos pelo locador, com descrição. */
  outras: Pendencia[];
  calendario?: OpcoesCalendario;
}

export interface Demonstrativo {
  dias: number;
  franquiaKm: number;
  kmRodados: number;
  kmExcedente: number;
  pendencias: Pendencia[];
  /** Caução lançada e não paga: sai do saldo, porque o contrato acabou. */
  estornoCaucaoNaoPaga: Centavos;
  totalDevido: Centavos;
  usoCaucao: Centavos;
  devolverAoMotorista: Centavos;
  /** O que o motorista ainda deve depois de usar a caução. */
  saldoFinal: Centavos;
  devolverAte: DataISO;
}

/** Franquia proporcional aos dias corridos do contrato (mês de 30 dias). */
export function franquiaDoPeriodo(franquiaMensal: number, dias: number): number {
  return Math.round((franquiaMensal * dias) / 30);
}

export function calcularEncerramento(e: EntradaEncerramento): Demonstrativo {
  const dias = Math.max(1, diasEntre(e.parametros.inicio, e.devolucao));
  const franquiaKm = franquiaDoPeriodo(e.parametros.km.franquiaMensal, dias);
  const kmRodados = Math.max(0, e.kmDevolucao - e.kmEntrega);
  const kmExcedente = Math.max(0, kmRodados - franquiaKm);
  const pendencias: Pendencia[] = [];
  if (kmExcedente > 0) {
    pendencias.push({ tipo: "km_excedente", descricao: `${kmExcedente.toLocaleString("pt-BR")} km além da franquia de ${franquiaKm.toLocaleString("pt-BR")} km`, valor: kmExcedente * e.parametros.km.valorExcedente });
  }
  for (const p of e.outras) if (p.valor > 0) pendencias.push(p);

  const estornoCaucaoNaoPaga = Math.max(0, e.caucaoLancada - e.caucaoPaga);
  const totalDevido = Math.max(0, e.saldoAberto - estornoCaucaoNaoPaga) + pendencias.reduce((s, p) => s + p.valor, 0);
  const usoCaucao = Math.min(e.caucaoPaga, totalDevido);
  return {
    dias,
    franquiaKm,
    kmRodados,
    kmExcedente,
    pendencias,
    estornoCaucaoNaoPaga,
    totalDevido,
    usoCaucao,
    devolverAoMotorista: e.caucaoPaga - usoCaucao,
    saldoFinal: totalDevido - usoCaucao,
    devolverAte: somarDiasUteis(e.devolucao, e.parametros.prazos.diasUteisDevolucaoCaucao, e.calendario),
  };
}

/**
 * Itens que pioraram entre a entrega e a devolução: o que estava OK e voltou
 * com avaria ou faltando. É a base das cobranças de avaria (com as fotos).
 */
export function itensQuePioraram(entrega: ChecklistVistoria, devolucao: ChecklistVistoria): { item: IdItem; rotulo: string; estado: "avaria" | "ausente"; observacao?: string }[] {
  const saida: { item: IdItem; rotulo: string; estado: "avaria" | "ausente"; observacao?: string }[] = [];
  for (const d of devolucao.itens) {
    if (d.estado === "ok") continue;
    const antes = entrega.itens.find((x) => x.item === d.item);
    if (antes && antes.estado === d.estado) continue; // já estava assim na entrega
    saida.push({ item: d.item, rotulo: ITENS_CHECKLIST.find((i) => i.id === d.item)?.rotulo ?? d.item, estado: d.estado, observacao: d.observacao });
  }
  return saida;
}
