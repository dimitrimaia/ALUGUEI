import { arredondar, type Centavos } from "../dinheiro/centavos";
import type { Taxas } from "./custos";

/**
 * Carona com divisão de custos (carona solidária). Quem oferece não pode
 * lucrar: a contribuição de cada pessoa é no máximo a parte dela no custo
 * da viagem (combustível, desgaste e pedágios), dividido por todos no carro,
 * incluindo o motorista. É isso que separa a carona do transporte pago.
 */
export function contribuicaoMaxima(t: Taxas, km: number, pedagios: Centavos, vagas: number): Centavos {
  const custo = (t.combustivelPorKm + t.desgastePorKm) * km + pedagios;
  const pessoas = Math.max(1, vagas) + 1;
  // Para baixo, em múltiplos de R$ 0,50: nunca passa do custo.
  return Math.floor(arredondar(custo / pessoas) / 50) * 50;
}

export function validarContribuicao(valor: Centavos, maximo: Centavos): string | null {
  if (valor < 0) return "Valor inválido.";
  if (valor > maximo) return "A contribuição passa da sua parte no custo da viagem. Na carona, ninguém lucra: ajuste para o máximo sugerido ou menos.";
  return null;
}
