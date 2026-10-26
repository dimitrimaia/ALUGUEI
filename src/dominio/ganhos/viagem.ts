import { arredondar, type Centavos } from "../dinheiro/centavos";
import { custoDe, type Taxas } from "./custos";

/** Calculadora de viagem ou de jornada: quanto custa rodar, quanto sobra e quanto cobrar. */
export type EntradaViagem = {
  km: number;
  idaEVolta: boolean;
  /** Tempo ao volante, para o custo fixo (aluguel, seguro) da viagem. */
  horas: number;
  pedagios: Centavos;
  alimentacao: Centavos;
  hospedagem: Centavos;
  outros: Centavos;
  /** Quanto vai receber (opcional). */
  receita: Centavos | null;
  /** Margem de lucro desejada, em bps, para sugerir o preço. */
  margemDesejada: number;
};

export type ResultadoViagem = {
  kmTotal: number;
  combustivel: Centavos;
  desgaste: Centavos;
  fixos: Centavos;
  extras: Centavos;
  total: Centavos;
  custoPorKm: Centavos;
  /** Preço que cobre todos os custos (ponto de equilíbrio). */
  equilibrio: Centavos;
  /** Preço com a margem desejada. */
  precoSugerido: Centavos;
  lucro: Centavos | null;
  /** Margem sobre a receita, em bps. */
  margem: number | null;
};

export function calcularViagem(e: EntradaViagem, t: Taxas): ResultadoViagem {
  const kmTotal = e.idaEVolta ? e.km * 2 : e.km;
  const combustivel = arredondar(t.combustivelPorKm * kmTotal);
  const desgaste = arredondar(t.desgastePorKm * kmTotal);
  const fixos = arredondar(t.fixoPorHora * e.horas);
  const extras = e.pedagios + e.alimentacao + e.hospedagem + e.outros;
  const total = combustivel + desgaste + fixos + extras;
  const margem = Math.min(Math.max(e.margemDesejada, 0), 9000);
  // Preço com margem sobre o preço: custo ÷ (1 − margem), arredondado para cima no real.
  const precoSugerido = Math.ceil((total * 10_000) / (10_000 - margem) / 100) * 100;
  const lucro = e.receita === null ? null : e.receita - total;
  return {
    kmTotal,
    combustivel,
    desgaste,
    fixos,
    extras,
    total,
    custoPorKm: kmTotal > 0 ? arredondar(total / kmTotal) : 0,
    equilibrio: total,
    precoSugerido,
    lucro,
    margem: e.receita ? Math.round(((e.receita - total) * 10_000) / e.receita) : null,
  };
}

/** Etanol × gasolina pelo custo por km de verdade (com o consumo do carro, não só a regra dos 70%). */
export function compararCombustivel(etanol: { preco: Centavos; consumo: number }, gasolina: { preco: Centavos; consumo: number }) {
  const porKmEtanol = etanol.preco / etanol.consumo;
  const porKmGasolina = gasolina.preco / gasolina.consumo;
  const melhor = porKmEtanol < porKmGasolina ? ("etanol" as const) : porKmEtanol > porKmGasolina ? ("gasolina" as const) : ("tanto_faz" as const);
  return {
    melhor,
    porKmEtanol: arredondar(porKmEtanol * 100) / 100,
    porKmGasolina: arredondar(porKmGasolina * 100) / 100,
    /** Relação de preço etanol ÷ gasolina, em bps (7000 = 70%). */
    relacaoPreco: Math.round((etanol.preco * 10_000) / gasolina.preco),
    /** Até que preço do etanol ele ainda compensa, com estes consumos. */
    etanolCompensaAte: Math.floor((gasolina.preco * etanol.consumo) / gasolina.consumo),
    economiaPor1000Km: arredondar(Math.abs(porKmEtanol - porKmGasolina) * 1000),
  };
}

/** Custo de uma jornada já rodada (para o lucro estimado do dia). */
export const custoJornada = (t: Taxas, km: number, horas: number) => custoDe(t, km, horas * 60);
