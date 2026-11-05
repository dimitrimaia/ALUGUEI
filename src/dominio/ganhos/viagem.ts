import { arredondar, type Centavos } from "../dinheiro/centavos";
import { custoDe, type Criterios, type Taxas } from "./custos";
import { avaliarCorrida, type Oferta } from "./corrida";

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

/** Corrida particular (alguém pediu para levar): o que cobrar e como dividir. */
export type ResultadoParticular = {
  /** Custo de rodar (combustível, desgaste e fixos pelo tempo), com a volta se contar, mais os pedágios. */
  custo: Centavos;
  /** Menor valor que deixa a corrida verde pela régua do motorista (já com os pedágios). */
  valor: Centavos;
  lucro: Centavos;
  porPessoa: (passageiros: number) => Centavos;
};

/**
 * Preço da corrida particular pela régua do motorista: o menor valor (em reais
 * inteiros) com sinal verde, como se fosse uma oferta de app com esses km e
 * minutos. Os pedágios entram por cima (são repassados, não dão lucro). Com
 * `volta`, conta também o retorno vazio ao ponto de partida (km e tempo em dobro).
 */
export function precoCorridaParticular(
  e: { km: number; minutos: number; pedagios: Centavos; volta: boolean },
  t: Taxas,
  c: Criterios,
): ResultadoParticular {
  // A volta vazia também é trabalho: a régua (R$/km e R$/h) vale sobre ida + volta.
  const vezes = e.volta ? 2 : 1;
  const regua: Criterios = { ...c, contarVolta: false };
  const oferta = (valor: Centavos): Oferta => ({ valor, kmCorrida: e.km * vezes, minutosCorrida: e.minutos * vezes });
  const custoRodar = custoDe(t, e.km * vezes, e.minutos * vezes);
  // Do custo para cima, de R$ 1 em R$ 1, até ficar verde (limite: 1.000 passos).
  let valor = Math.max(100, Math.ceil(custoRodar / 100) * 100);
  for (let i = 0; i < 1000 && avaliarCorrida(oferta(valor), t, regua).sinal !== "verde"; i++) valor += 100;
  const lucro = avaliarCorrida(oferta(valor), t, regua).lucro;
  const total = valor + e.pedagios;
  return {
    custo: arredondar(custoRodar + e.pedagios),
    valor: total,
    lucro,
    // Arredonda para cima em R$ 1: a soma das partes nunca fica abaixo do total.
    porPessoa: (n) => Math.ceil(total / Math.max(1, n) / 100) * 100,
  };
}
