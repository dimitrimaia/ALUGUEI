import { arredondar, type Centavos } from "../dinheiro/centavos";
import { bateLista, type Criterios, custoDe, type Taxas } from "./custos";

/**
 * Avaliação da oferta (o semáforo do Copiloto). É a mesma regra do app
 * Android (android/.../plantao/Calculo.kt e Copiloto.kt): mudou aqui, mude lá,
 * e os casos de ganhos.test.ts têm espelho nos testes JUnit.
 */

/** Velocidade média na cidade, para estimar o tempo quando a oferta não mostra. */
export const KM_POR_HORA_CIDADE = 24;
/** Passageiro com menos corridas que isso é "novo". */
export const CORRIDAS_PASSAGEIRO_NOVO = 5;

export type Oferta = {
  valor: Centavos;
  kmCorrida: number;
  /** Tempo da corrida. Sem ele, estima pela velocidade média. */
  minutosCorrida?: number | null;
  kmBusca?: number | null;
  minutosBusca?: number | null;
  /** Do cartão do app, quando aparecem. */
  nota?: number | null;
  corridasPassageiro?: number | null;
  paradas?: number | null;
  embarque?: string | null;
  destino?: string | null;
  /** Volta do destino até a base (casa), quando calculada. */
  kmVolta?: number | null;
  minutosVolta?: number | null;
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
  /** Custo de voltar vazio para a base (0 se não conta a volta). */
  custoVolta: Centavos;
  /** Lucro descontando a volta, quando a régua conta a volta. */
  lucro: Centavos;
  lucroPorHora: Centavos;
  motivos: string[];
  /** Pontos a favor (destino desejado). */
  destaques: string[];
};

/** Régua simples: até 15% abaixo do mínimo ainda é amarelo. */
const TOLERANCIA = 0.85;

type Nivel = 0 | 1 | 2; // 0 ok, 1 amarelo, 2 vermelho

/** Duas linhas (mínimo e bom) ou a régua simples (bom = 0). */
function nivelMetrica(valor: number, minimo: number, bom: number): Nivel {
  if (bom > 0) return valor < minimo ? 2 : valor < bom ? 1 : 0;
  if (minimo <= 0) return 0;
  return valor < minimo * TOLERANCIA ? 2 : valor < minimo ? 1 : 0;
}

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
  const kmVolta = c.contarVolta ? Math.max(0, o.kmVolta ?? 0) : 0;
  const custoVolta = kmVolta > 0 ? custoDe(t, kmVolta, o.minutosVolta ?? (kmVolta / KM_POR_HORA_CIDADE) * 60) : 0;
  const lucro = o.valor - custo - custoVolta;
  const lucroPorHora = arredondar((lucro * 60) / minutosTotal);

  const motivos: string[] = [];
  const destaques: string[] = [];
  let nivel = 0 as Nivel;
  const marcar = (n: Nivel, motivo: string) => {
    if (n === 0) return;
    nivel = Math.max(nivel, n) as Nivel;
    motivos.push(motivo);
  };

  if (lucro <= 0) marcar(2, custoVolta ? "Não paga os custos com a volta" : "Não paga os custos");
  if (c.valorMinimo > 0 && o.valor < c.valorMinimo) marcar(2, "Abaixo do seu valor mínimo");
  marcar(nivelMetrica(porKm, c.minimoPorKm, c.bomPorKm), "Abaixo do seu mínimo por km");
  marcar(nivelMetrica(porHora, c.minimoPorHora, c.bomPorHora), "Abaixo do seu mínimo por hora");
  if (lucro > 0 && c.lucroMinimo > 0 && lucro < c.lucroMinimo) marcar(1, "Lucro abaixo do seu mínimo");
  if (lucro > 0 && c.lucroMinimoBps > 0 && lucro * 10_000 < c.lucroMinimoBps * o.valor) marcar(1, "Margem de lucro baixa");
  if (c.buscaMaximaKm > 0 && kmBusca > c.buscaMaximaKm) marcar(kmBusca > c.buscaMaximaKm * 1.5 ? 2 : 1, "Passageiro longe");
  if (c.buscaMaximaMin > 0 && minBusca > c.buscaMaximaMin) marcar(minBusca > c.buscaMaximaMin * 1.5 ? 2 : 1, "Embarque demorado");
  if (c.viagemMaximaKm > 0 && o.kmCorrida > c.viagemMaximaKm) marcar(1, "Viagem longa");
  if (c.viagemMaximaMin > 0 && minCorrida > c.viagemMaximaMin) marcar(1, "Viagem demorada");
  if (c.notaMinima > 0 && o.nota != null && o.nota < c.notaMinima) marcar(1, "Nota baixa");
  if (c.alertaPassageiroNovo && o.corridasPassageiro != null && o.corridasPassageiro < CORRIDAS_PASSAGEIRO_NOVO) marcar(1, "Passageiro novo");
  if (c.alertaParadas && (o.paradas ?? 0) > 0) marcar(1, "Corrida com parada");
  const evitado = bateLista(o.embarque, c.evitar) ?? bateLista(o.destino, c.evitar);
  if (evitado) marcar(2, `Lugar que você evita: ${evitado}`);
  const desejado = bateLista(o.destino, c.destinosDesejados);
  if (desejado) destaques.push(`Destino desejado: ${desejado}`);

  const final = nivel as Nivel; // alterado dentro de marcar()
  const sinal: Sinal = final === 2 ? "vermelho" : final === 1 ? "amarelo" : "verde";
  return { sinal, kmTotal, minutosTotal: Math.round(minutosTotal), tempoEstimado, porKm, porHora, custo, custoVolta, lucro, lucroPorHora, motivos, destaques };
}

/**
 * Contraproposta (inDrive): o menor valor em reais inteiros que deixa a
 * corrida verde, até o dobro da oferta. Null se nem o dobro fica verde.
 */
export function precoIdeal(o: Oferta, t: Taxas, c: Criterios): Centavos | null {
  if (avaliarCorrida(o, t, c).sinal === "verde") return o.valor;
  const maximo = o.valor * 2;
  for (let v = Math.ceil(o.valor / 100) * 100; v <= maximo; v += 100) {
    if (avaliarCorrida({ ...o, valor: v }, t, c).sinal === "verde") return v;
  }
  return null;
}
