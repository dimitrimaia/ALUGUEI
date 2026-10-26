import { arredondar, type Centavos } from "../dinheiro/centavos";
import { type Criterios, custoDe, type Taxas } from "./custos";

/** Velocidade média na cidade, para estimar o tempo quando a oferta não mostra. */
export const KM_POR_HORA_CIDADE = 24;

export type Oferta = {
  valor: Centavos;
  kmCorrida: number;
  /** Tempo da corrida. Sem ele, estima pela velocidade média. */
  minutosCorrida?: number | null;
  kmBusca?: number | null;
  minutosBusca?: number | null;
};

export type Sinal = "verde" | "amarelo" | "vermelho";

export type Avaliacao = {
  sinal: Sinal;
  kmTotal: number;
  minutosTotal: number;
  tempoEstimado: boolean;
  /** Valor ÷ km total (corrida + busca), como os apps de motorista mostram. */
  porKm: Centavos;
  /** Valor ÷ horas totais (corrida + busca). */
  porHora: Centavos;
  custo: Centavos;
  lucro: Centavos;
  lucroPorHora: Centavos;
  motivos: string[];
};

/** Margem abaixo do mínimo que ainda é "amarelo" (avaliar). Abaixo disso, vermelho. */
const TOLERANCIA = 0.85;

export function avaliarCorrida(o: Oferta, t: Taxas, c: Criterios): Avaliacao {
  const kmBusca = Math.max(0, o.kmBusca ?? 0);
  const kmTotal = Math.max(0.1, o.kmCorrida + kmBusca);
  const tempoEstimado = o.minutosCorrida == null;
  const minCorrida = o.minutosCorrida ?? (o.kmCorrida / KM_POR_HORA_CIDADE) * 60;
  const minBusca = o.minutosBusca ?? (kmBusca / KM_POR_HORA_CIDADE) * 60;
  const minutosTotal = Math.max(1, minCorrida + minBusca);
  const porKm = arredondar(o.valor / kmTotal);
  const porHora = arredondar((o.valor * 60) / minutosTotal);
  const custo = custoDe(t, kmTotal, minutosTotal);
  const lucro = o.valor - custo;
  const lucroPorHora = arredondar((lucro * 60) / minutosTotal);

  const motivos: string[] = [];
  let pontos = 0; // 0 = verde; cada critério abaixo soma
  let vermelho = lucro <= 0;
  if (lucro <= 0) motivos.push("Não paga os custos");
  for (const [valor, minimo, rotulo] of [
    [porKm, c.minimoPorKm, "por km"],
    [porHora, c.minimoPorHora, "por hora"],
  ] as const) {
    if (minimo > 0 && valor < minimo) {
      pontos++;
      if (valor < minimo * TOLERANCIA) vermelho = true;
      motivos.push(`Abaixo do seu mínimo ${rotulo}`);
    }
  }
  if (c.buscaMaximaKm > 0 && kmBusca > c.buscaMaximaKm) {
    pontos++;
    if (kmBusca > c.buscaMaximaKm * 1.5) vermelho = true;
    motivos.push("Passageiro longe");
  }
  const sinal: Sinal = vermelho ? "vermelho" : pontos ? "amarelo" : "verde";
  return { sinal, kmTotal, minutosTotal: Math.round(minutosTotal), tempoEstimado, porKm, porHora, custo, lucro, lucroPorHora, motivos };
}
