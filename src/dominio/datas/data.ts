/**
 * Datas de calendário (sem hora) como "AAAA-MM-DD". Vencimentos, check-ins e
 * prazos são dias civis em America/Sao_Paulo (RNF-043); manter a data sem
 * hora evita que fuso ou horário de verão empurrem um vencimento de dia.
 */
export type DataISO = string & { readonly __dataISO: unique symbol };

export const FUSO = "America/Sao_Paulo";

const PADRAO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function data(texto: string): DataISO {
  const m = PADRAO.exec(texto);
  if (!m) throw new Error(`Data inválida: ${texto}`);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (paraISO(d) !== texto) throw new Error(`Data inexistente: ${texto}`);
  return texto as DataISO;
}

function paraUTC(d: DataISO): Date {
  const [a, m, dia] = d.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, dia));
}

function paraISO(d: Date): DataISO {
  return d.toISOString().slice(0, 10) as DataISO;
}

export function somarDias(d: DataISO, dias: number): DataISO {
  const u = paraUTC(d);
  u.setUTCDate(u.getUTCDate() + dias);
  return paraISO(u);
}

export function somarMeses(d: DataISO, meses: number): DataISO {
  const u = paraUTC(d);
  const diaOriginal = u.getUTCDate();
  u.setUTCDate(1);
  u.setUTCMonth(u.getUTCMonth() + meses);
  // 31/01 + 1 mês = 28/02 (ou 29), nunca 03/03.
  const ultimoDia = new Date(Date.UTC(u.getUTCFullYear(), u.getUTCMonth() + 1, 0)).getUTCDate();
  u.setUTCDate(Math.min(diaOriginal, ultimoDia));
  return paraISO(u);
}

/** Dias corridos de `de` até `ate` (positivo se `ate` for depois). */
export function diasEntre(de: DataISO, ate: DataISO): number {
  return Math.round((paraUTC(ate).getTime() - paraUTC(de).getTime()) / 86_400_000);
}

/** 0 = domingo … 6 = sábado. */
export type DiaDaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function diaDaSemana(d: DataISO): DiaDaSemana {
  return paraUTC(d).getUTCDay() as DiaDaSemana;
}

/** Primeira data >= `d` que cai no dia da semana pedido. */
export function proximoDiaDaSemana(d: DataISO, alvo: DiaDaSemana): DataISO {
  return somarDias(d, (alvo - diaDaSemana(d) + 7) % 7);
}

/** Data civil de agora em São Paulo, independente do fuso do servidor. */
export function hoje(agora: Date = new Date()): DataISO {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
  return data(partes);
}

export function formatarData(d: DataISO): string {
  const [a, m, dia] = d.split("-");
  return `${dia}/${m}/${a}`;
}

/** Meses inteiros de `de` até `ate` (21/04 → 21/07 = 3). */
export function mesesEntre(de: DataISO, ate: DataISO): number {
  let meses = 0;
  while (somarMeses(de, meses + 1) <= ate) meses++;
  return meses;
}
