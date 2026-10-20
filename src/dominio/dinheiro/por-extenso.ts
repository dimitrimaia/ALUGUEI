import { type Centavos, centavos } from "./centavos";

const UNIDADES = [
  "zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
  "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove",
];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = [
  "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
  "seiscentos", "setecentos", "oitocentos", "novecentos",
];

/** 1 a 999 por extenso. */
function ate999(n: number): string {
  if (n === 100) return "cem";
  const partes: string[] = [];
  const c = Math.floor(n / 100);
  const resto = n % 100;
  if (c > 0) partes.push(CENTENAS[c]!);
  if (resto > 0) {
    if (resto < 20) {
      partes.push(UNIDADES[resto]!);
    } else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      partes.push(u > 0 ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]!);
    }
  }
  return partes.join(" e ");
}

/** Inteiro de 0 a 999.999.999 por extenso. */
export function numeroPorExtenso(n: number): string {
  if (!Number.isSafeInteger(n) || n < 0 || n >= 1_000_000_000) {
    throw new Error(`Fora da faixa suportada: ${n}`);
  }
  if (n === 0) return "zero";

  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const unidades = n % 1000;

  const grupos: { texto: string; valor: number }[] = [];
  if (milhoes > 0) {
    grupos.push({ texto: milhoes === 1 ? "um milhão" : `${ate999(milhoes)} milhões`, valor: milhoes });
  }
  if (milhares > 0) {
    grupos.push({ texto: milhares === 1 ? "mil" : `${ate999(milhares)} mil`, valor: milhares });
  }
  if (unidades > 0) grupos.push({ texto: ate999(unidades), valor: unidades });

  // Regra usual: "e" antes do último grupo quando ele é menor que 100
  // ou uma centena redonda ("mil e duzentos", "mil e cinquenta");
  // caso contrário, sem conectivo ("mil duzentos e trinta").
  return grupos
    .map((g, i) => {
      if (i === 0) return g.texto;
      const ultimo = i === grupos.length - 1;
      const usaE = ultimo && (g.valor < 100 || g.valor % 100 === 0);
      return usaE ? `e ${g.texto}` : g.texto;
    })
    .join(" ");
}

/**
 * Valor monetário por extenso, gerado do MESMO dado que o valor numérico,
 * para que o contrato nunca diga "R$ 600,00 (seiscentos e cinquenta reais)".
 */
export function reaisPorExtenso(valor: Centavos): string {
  centavos(valor);
  if (valor < 0) throw new Error("Valor negativo não tem extenso de contrato");
  const reais = Math.floor(valor / 100);
  const cents = valor % 100;

  const partes: string[] = [];
  if (reais > 0) {
    const redondoEmMilhoes = reais >= 1_000_000 && reais % 1_000_000 === 0;
    const moeda = reais === 1 ? "real" : redondoEmMilhoes ? "de reais" : "reais";
    partes.push(`${numeroPorExtenso(reais)} ${moeda}`);
  }
  if (cents > 0) {
    partes.push(`${numeroPorExtenso(cents)} ${cents === 1 ? "centavo" : "centavos"}`);
  }
  return partes.length > 0 ? partes.join(" e ") : "zero real";
}
