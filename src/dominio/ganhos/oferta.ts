import type { Centavos } from "../dinheiro/centavos";
import type { Oferta } from "./corrida";

/**
 * Lê o texto de um cartão de oferta de corrida (Uber, 99, inDrive) e tira valor,
 * distâncias e tempos. É a mesma regra do leitor do app Android
 * (android/.../plantao/LeitorOferta.kt): mudou aqui, mude lá.
 *
 * Os cartões trazem pares "tempo (distância)" na ordem: primeiro até o
 * passageiro, depois a viagem. Ex.: "8 min (2,3 km)" e "Viagem: 15 min (7,4 km)".
 */

const NUM = String.raw`(\d{1,4}(?:[.,]\d{1,2})?)`;
const DINHEIRO = /R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/;
const PAR = new RegExp(String.raw`${NUM}\s*min(?:utos?)?\s*\(?\s*(?:[•·-]\s*)?${NUM}\s*km\b`, "gi");
const PAR_INVERTIDO = new RegExp(String.raw`${NUM}\s*km\s*\)?\s*(?:[•·,-]\s*)?${NUM}\s*min`, "gi");
const KM = new RegExp(String.raw`${NUM}\s*km\b`, "gi");
const MIN = new RegExp(String.raw`${NUM}\s*min`, "gi");
const METROS = /(\d{2,4})\s*m\b(?!in)/gi;

const numero = (s: string) => Number(s.replace(",", "."));

function lerValor(texto: string): Centavos | null {
  const m = DINHEIRO.exec(texto);
  if (!m) return null;
  const bruto = m[1]!;
  // "1.234,56" ou "12,50" (vírgula decimal); "12.50" (ponto decimal, raro)
  const reais = bruto.includes(",") ? Number(bruto.replace(/\./g, "").replace(",", ".")) : /\.\d{1,2}$/.test(bruto) ? Number(bruto) : Number(bruto.replace(/\./g, ""));
  return Number.isFinite(reais) && reais > 0 ? Math.round(reais * 100) : null;
}

export type OfertaLida = Oferta & { completa: boolean };

export function lerOferta(texto: string): OfertaLida | null {
  const t = texto.replace(/\s+/g, " ");
  const valor = lerValor(t);
  if (valor === null) return null;

  let pares: { min: number; km: number }[] = [...t.matchAll(PAR)].map((m) => ({ min: numero(m[1]!), km: numero(m[2]!) }));
  if (!pares.length) pares = [...t.matchAll(PAR_INVERTIDO)].map((m) => ({ km: numero(m[1]!), min: numero(m[2]!) }));
  if (pares.length >= 2) {
    const [busca, corrida] = pares;
    return { valor, kmBusca: busca!.km, minutosBusca: busca!.min, kmCorrida: corrida!.km, minutosCorrida: corrida!.min, completa: true };
  }
  const kms = [...t.matchAll(KM)].map((m) => numero(m[1]!));
  const metros = [...t.matchAll(METROS)].map((m) => Number(m[1]) / 1000);
  const mins = [...t.matchAll(MIN)].map((m) => numero(m[1]!));
  if (pares.length === 1) {
    // Um par só: é a viagem; a busca pode vir em metros ("a 800 m").
    return { valor, kmCorrida: pares[0]!.km, minutosCorrida: pares[0]!.min, kmBusca: metros[0] ?? null, minutosBusca: null, completa: true };
  }
  const distancias = [...metros, ...kms];
  if (!kms.length) return null;
  if (distancias.length >= 2) {
    return { valor, kmBusca: distancias[0]!, kmCorrida: distancias[1]!, minutosBusca: mins.length >= 2 ? mins[0]! : null, minutosCorrida: mins.length >= 2 ? mins[1]! : (mins[0] ?? null), completa: mins.length >= 2 };
  }
  return { valor, kmCorrida: kms[0]!, minutosCorrida: mins.at(-1) ?? null, kmBusca: null, minutosBusca: null, completa: false };
}
