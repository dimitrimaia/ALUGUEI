import { type Centavos, arredondar } from "../dinheiro/centavos";

/**
 * Parte da plataforma (split) em cada cobrança de aluguel. A mensalidade do
 * locador é por carro com contrato ativo; ela é dividida por dia e cobrada
 * junto de cada aluguel, proporcional aos dias que o aluguel cobre.
 * Carro parado não gera aluguel, logo não gera taxa.
 *
 * Mensal × 12 / 365 por dia: R$ 250/mês → R$ 57,53 numa semana cheia,
 * e R$ 3.000 ao longo de um ano de aluguel.
 */
export function taxaPlataformaDoPeriodo(mensalidadePorCarro: Centavos, diasCobertos: number): Centavos {
  if (!Number.isInteger(diasCobertos) || diasCobertos < 0) {
    throw new Error(`Dias cobertos inválidos: ${diasCobertos}`);
  }
  return arredondar((mensalidadePorCarro * 12 * diasCobertos) / 365);
}
