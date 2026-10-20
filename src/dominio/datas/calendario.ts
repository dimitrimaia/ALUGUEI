import { type DataISO, data, diaDaSemana, somarDias } from "./data";

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
export function pascoa(ano: number): DataISO {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return data(`${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`);
}

const FIXOS_NACIONAIS = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"];

export interface OpcoesCalendario {
  /** Carnaval (seg/ter) e Corpus Christi: sem expediente bancário. */
  incluirBancarios?: boolean;
  /** Feriados estaduais e municipais do locador (ex.: Sete Lagoas/MG). */
  extras?: readonly DataISO[];
}

export function feriados(ano: number, opcoes: OpcoesCalendario = {}): Set<DataISO> {
  const p = pascoa(ano);
  const lista: DataISO[] = FIXOS_NACIONAIS.map((md) => data(`${ano}-${md}`));
  lista.push(somarDias(p, -2)); // Sexta-feira Santa
  if (opcoes.incluirBancarios) {
    lista.push(somarDias(p, -48), somarDias(p, -47), somarDias(p, 60)); // Carnaval e Corpus Christi
  }
  for (const extra of opcoes.extras ?? []) {
    if (extra.startsWith(`${ano}-`)) lista.push(extra);
  }
  return new Set(lista);
}

export function ehDiaUtil(d: DataISO, opcoes: OpcoesCalendario = {}): boolean {
  const dia = diaDaSemana(d);
  if (dia === 0 || dia === 6) return false;
  return !feriados(Number(d.slice(0, 4)), opcoes).has(d);
}

/** Ex.: prazo de devolução da caução, "até 30 dias úteis" (cláusula 3.5). */
export function somarDiasUteis(d: DataISO, dias: number, opcoes: OpcoesCalendario = {}): DataISO {
  let atual = d;
  let restantes = dias;
  while (restantes > 0) {
    atual = somarDias(atual, 1);
    if (ehDiaUtil(atual, opcoes)) restantes--;
  }
  return atual;
}

export function proximoDiaUtil(d: DataISO, opcoes: OpcoesCalendario = {}): DataISO {
  let atual = d;
  while (!ehDiaUtil(atual, opcoes)) atual = somarDias(atual, 1);
  return atual;
}
