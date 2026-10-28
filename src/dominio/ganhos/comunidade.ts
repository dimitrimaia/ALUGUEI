/**
 * Lugares que os motoristas evitam, somados de forma anônima. Cada motorista
 * conta uma vez por lugar e período; o app só mostra o lugar quando
 * [MINIMO_MOTORISTAS] ou mais evitam. Nunca diz quem marcou.
 *
 * Puro (sem banco): testado em comunidade.test.ts.
 */

export type Periodo = "dia" | "noite" | "sempre";
export type MarcaLugar = { usuario: string; lugar: string; periodo: Periodo };
export type LugarComunidade = { nome: string; dia: number; noite: number };

export const MINIMO_MOTORISTAS = 3;
export const MAXIMO_LUGARES = 500;

/** Mesma comparação da lista "evitar": sem acento, minúsculas, espaços únicos. */
export function chaveLugar(nome: string): string {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Noite das 19h às 5h (hora de Brasília). */
export function periodoDaHora(hora: number): "dia" | "noite" {
  return hora >= 19 || hora < 5 ? "noite" : "dia";
}

/** Junta as marcas: quantos motoristas evitam cada lugar de dia e de noite. */
export function agregarLugares(marcas: MarcaLugar[], minimo = MINIMO_MOTORISTAS): LugarComunidade[] {
  const por = new Map<string, { dia: Set<string>; noite: Set<string>; grafias: Map<string, number> }>();
  for (const m of marcas) {
    const chave = chaveLugar(m.lugar);
    if (chave.length < 3) continue;
    const g = por.get(chave) ?? { dia: new Set(), noite: new Set(), grafias: new Map() };
    if (m.periodo !== "noite") g.dia.add(m.usuario);
    if (m.periodo !== "dia") g.noite.add(m.usuario);
    const grafia = m.lugar.trim().replace(/\s+/g, " ");
    g.grafias.set(grafia, (g.grafias.get(grafia) ?? 0) + 1);
    por.set(chave, g);
  }
  return [...por.values()]
    .map((g) => ({ nome: [...g.grafias].sort((a, b) => b[1] - a[1])[0]![0], dia: g.dia.size, noite: g.noite.size }))
    .filter((l) => Math.max(l.dia, l.noite) >= minimo)
    .sort((a, b) => Math.max(b.dia, b.noite) - Math.max(a.dia, a.noite))
    .slice(0, MAXIMO_LUGARES);
}
