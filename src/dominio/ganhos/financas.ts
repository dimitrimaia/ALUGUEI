import { z } from "zod";
import { type DataISO, diaDaSemana, hoje, somarDias } from "../datas/data";
import { arredondar, type Centavos } from "../dinheiro/centavos";

/** Configuração das finanças do motorista (perfis_custo.financas). */
export type ConfigFinancas = {
  /** Meta de lucro do mês (0 = sem meta). */
  metaMensal: Centavos;
  /** Dias da semana em que trabalha (0 = domingo). */
  diasTrabalho: number[];
  /** Hora em que o dia "vira" (0 = meia-noite, 4 = como a Uber): corrida às 2h conta no dia anterior. */
  virada: 0 | 4;
};

export const FINANCAS_PADRAO: ConfigFinancas = { metaMensal: 0, diasTrabalho: [1, 2, 3, 4, 5, 6], virada: 0 };

const esquema = z.object({
  metaMensal: z.coerce.number().int().min(0).max(100_000_000).catch(0),
  diasTrabalho: z
    .array(z.coerce.number().int().min(0).max(6))
    .catch(FINANCAS_PADRAO.diasTrabalho)
    .transform((l) => [...new Set(l)].sort()),
  virada: z.union([z.literal(0), z.literal(4)]).catch(0),
});

export function normalizarFinancas(entrada: unknown): ConfigFinancas {
  const r = esquema.safeParse(entrada ?? {});
  return r.success ? r.data : FINANCAS_PADRAO;
}

/** Dia de trabalho de agora: com a virada às 4h, 2h da manhã ainda é ontem. */
export function diaOperacional(virada: 0 | 4, agora: Date = new Date()): DataISO {
  return hoje(new Date(agora.getTime() - virada * 3_600_000));
}

/** Dias de trabalho entre `de` e `ate` (inclusivos). */
export function diasDeTrabalho(de: DataISO, ate: DataISO, dias: readonly number[]): number {
  let n = 0;
  for (let d = de; d <= ate; d = somarDias(d, 1)) if (dias.includes(diaDaSemana(d))) n++;
  return n;
}

/**
 * Meta do mês: quanto falta e quanto precisa por dia de trabalho que resta
 * (contando hoje, se hoje é dia de trabalho).
 */
export function progressoMetaMensal(meta: Centavos, lucroMes: Centavos, diasRestantes: number) {
  const falta = Math.max(0, meta - lucroMes);
  return {
    falta,
    percentual: meta > 0 ? Math.max(0, Math.min(100, Math.floor((lucroMes * 100) / meta))) : 0,
    batida: meta > 0 && lucroMes >= meta,
    porDia: falta > 0 && diasRestantes > 0 ? arredondar(falta / diasRestantes) : 0,
  };
}

/** Reserva para manutenção: o desgaste dos km rodados é o que deveria estar guardado. */
export function sugestaoReserva(desgastePorKm: number, kmRodados: number, guardado: Centavos): { deveria: Centavos; falta: Centavos } {
  const deveria = arredondar(desgastePorKm * kmRodados);
  return { deveria, falta: Math.max(0, deveria - guardado) };
}
