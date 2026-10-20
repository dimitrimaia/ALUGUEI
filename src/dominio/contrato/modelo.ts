/**
 * Modelo de contrato em texto simples, com numeração automática (RF-030):
 *
 *   # Título do documento
 *   ## Título da cláusula        → CLÁUSULA 1ª – TÍTULO
 *   - item                       → 1.1, 1.2…
 *     - alínea                   → a), b)… z), aa), bb)…
 *   texto solto                  → parágrafo da cláusula, sem número
 *
 * Variáveis: {{nome}}. Variável sem valor é erro: o contrato nunca sai com lacuna.
 */

export interface Alinea { letra: string; texto: string }
export interface Item { numero: string; texto: string; alineas: Alinea[] }
export interface Clausula { numero: number; titulo: string; paragrafos: string[]; itens: Item[] }
export interface DocumentoContrato { titulo: string; preambulo: string[]; clausulas: Clausula[] }

export class VariavelAusente extends Error {}

/** a…z, depois aa, bb, cc… (como nos contratos em papel). */
export function letraAlinea(indice: number): string {
  const letra = String.fromCharCode(97 + (indice % 26));
  return letra.repeat(Math.floor(indice / 26) + 1);
}

export function substituirVariaveis(texto: string, variaveis: Record<string, string>): string {
  return texto.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/g, (_, nome: string) => {
    const valor = variaveis[nome];
    if (valor === undefined || valor === "") throw new VariavelAusente(`Variável sem valor no contrato: ${nome}`);
    return valor;
  });
}

export function renderizarModelo(corpo: string, variaveis: Record<string, string>): DocumentoContrato {
  const doc: DocumentoContrato = { titulo: "", preambulo: [], clausulas: [] };
  let clausula: Clausula | null = null;
  let item: Item | null = null;

  for (const linhaBruta of corpo.split("\n")) {
    if (!linhaBruta.trim()) continue;
    const linha = substituirVariaveis(linhaBruta, variaveis);

    if (linha.startsWith("# ")) {
      doc.titulo = linha.slice(2).trim();
    } else if (linha.startsWith("## ")) {
      clausula = { numero: doc.clausulas.length + 1, titulo: linha.slice(3).trim(), paragrafos: [], itens: [] };
      doc.clausulas.push(clausula);
      item = null;
    } else if (/^\s{2,}- /.test(linha)) {
      if (!item) throw new Error(`Alínea fora de um item: ${linha.trim()}`);
      item.alineas.push({ letra: letraAlinea(item.alineas.length), texto: linha.trim().slice(2) });
    } else if (linha.startsWith("- ")) {
      if (!clausula) throw new Error(`Item fora de uma cláusula: ${linha}`);
      item = { numero: `${clausula.numero}.${clausula.itens.length + 1}`, texto: linha.slice(2).trim(), alineas: [] };
      clausula.itens.push(item);
    } else if (clausula) {
      clausula.paragrafos.push(linha.trim());
    } else {
      doc.preambulo.push(linha.trim());
    }
  }
  return doc;
}

const UNIDADES = ["", "PRIMEIRA", "SEGUNDA", "TERCEIRA", "QUARTA", "QUINTA", "SEXTA", "SÉTIMA", "OITAVA", "NONA"];
const DEZENAS = ["", "DÉCIMA", "VIGÉSIMA", "TRIGÉSIMA"];

/** 1 → PRIMEIRA, 11 → DÉCIMA PRIMEIRA, 20 → VIGÉSIMA. */
export function ordinalFeminino(n: number): string {
  if (n < 1 || n > 39) return `${n}ª`;
  return [DEZENAS[Math.floor(n / 10)], UNIDADES[n % 10]].filter(Boolean).join(" ");
}

export function tituloClausula(c: Clausula): string {
  const ordinal = ordinalFeminino(c.numero);
  return `CLÁUSULA ${ordinal} – ${c.titulo.toUpperCase()}`;
}

/** Texto corrido do documento, usado para busca, comparação e testes. */
export function documentoEmTexto(doc: DocumentoContrato): string {
  const linhas = [doc.titulo, ...doc.preambulo];
  for (const c of doc.clausulas) {
    linhas.push("", tituloClausula(c), ...c.paragrafos);
    for (const i of c.itens) {
      linhas.push(`${i.numero}. ${i.texto}`);
      for (const a of i.alineas) linhas.push(`   ${a.letra}) ${a.texto}`);
    }
  }
  return linhas.join("\n");
}
