/**
 * Todo valor monetário do sistema é um inteiro em centavos (RNF-061).
 * Percentuais são inteiros em pontos-base: 1% = 100 bps.
 */
export type Centavos = number;
export type PontosBase = number;

export function centavos(valor: number): Centavos {
  if (!Number.isSafeInteger(valor)) {
    throw new Error(`Valor em centavos precisa ser inteiro: ${valor}`);
  }
  return valor;
}

export function deReais(reais: number): Centavos {
  return centavos(Math.round(reais * 100));
}

/**
 * Arredondamento definido do sistema: meio para cima, em centavos.
 * Usado sempre que um cálculo gera fração de centavo.
 */
export function arredondar(valor: number): Centavos {
  return centavos(Math.sign(valor) * Math.round(Math.abs(valor)));
}

/** Aplica um percentual (em bps) a um valor, com o arredondamento padrão. */
export function percentual(valor: Centavos, bps: PontosBase): Centavos {
  return arredondar((valor * bps) / 10_000);
}

const formatador = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** "R$ 1.200,00" (com espaço não separável, como o Intl gera). */
export function formatarBRL(valor: Centavos): string {
  return formatador.format(valor / 100);
}
