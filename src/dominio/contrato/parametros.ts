import { z } from "zod";
import { data as parseData } from "../datas/data";

const dataISO = z.string().transform((s, ctx) => {
  try {
    return parseData(s);
  } catch {
    ctx.addIssue({ code: "custom", message: `Data inválida: ${s}` });
    return z.NEVER;
  }
});
const centavos = z.number().int().nonnegative();
const bps = z.number().int().min(0).max(10_000);
const diaDaSemana = z.union([0, 1, 2, 3, 4, 5, 6].map((d) => z.literal(d)) as [
  z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>,
  z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>,
]);

/**
 * Parâmetros de um contrato. São copiados para o contrato no momento da
 * assinatura (RF-033): alterar o modelo depois não altera contratos assinados.
 * Toda regra do contrato que vira automação precisa estar aqui, e não no código.
 */
export const parametrosContratoSchema = z
  .object({
    inicio: dataISO,
    fim: dataISO,
    aluguelSemanal: centavos,
    /** Dia da semana do pagamento antecipado (cláusula 3.1). */
    diaVencimento: diaDaSemana,
    caucao: z.object({
      total: centavos,
      parcelas: z.array(z.object({ vencimento: dataISO, valor: centavos })).min(1),
    }),
    km: z.object({
      franquiaMensal: z.number().int().positive(),
      valorExcedente: centavos,
    }),
    encargos: z.object({
      multaBps: bps,
      jurosMensaisBps: bps,
      /** Índice da correção monetária do débito em atraso (cláusula 3.6). */
      indiceCorrecao: z.enum(["IPCA", "IGPM", "INPC", "nenhum"]),
    }),
    prazos: z.object({
      diasParaInadimplencia: z.number().int().nonnegative(),
      horasParaRegularizar: z.number().int().positive(),
      horasAvisoProtesto: z.number().int().positive(),
      diasUteisDevolucaoCaucao: z.number().int().positive(),
      diasSemCheckinParaNotificar: z.number().int().positive(),
    }),
    checkin: z.object({ diaSemana: diaDaSemana }),
    manutencao: z.object({
      revisaoACadaKm: z.number().int().positive(),
      trocaPneusACadaKm: z.number().int().positive(),
      lavagemACadaDias: z.number().int().positive(),
    }),
    reajuste: z.object({
      indice: z.enum(["IPCA", "IGPM", "INPC"]),
      aCadaMeses: z.number().int().positive(),
    }),
    taxaAdministracaoMultaBps: bps,
    franquiaSeguro: centavos,
    areaCirculacao: z.string().min(1),
    /** O que fazer quando um vencimento cai em dia não útil. A validar com o advogado. */
    vencimentoEmDiaNaoUtil: z.enum(["manter", "proximo_dia_util"]),
  })
  .refine((p) => p.fim > p.inicio, { message: "Fim precisa ser depois do início", path: ["fim"] })
  .refine((p) => p.caucao.parcelas.reduce((s, x) => s + x.valor, 0) === p.caucao.total, {
    message: "A soma das parcelas da caução precisa ser igual ao total",
    path: ["caucao", "parcelas"],
  });

export type ParametrosContrato = z.output<typeof parametrosContratoSchema>;

/** Valores do contrato analisado (Fiat Uno, Sete Lagoas/MG, 21/04/2026). */
export const PARAMETROS_CONTRATO_REFERENCIA = parametrosContratoSchema.parse({
  inicio: "2026-04-21",
  fim: "2026-07-21",
  aluguelSemanal: 60000,
  diaVencimento: 2,
  caucao: {
    total: 120000,
    parcelas: [
      { vencimento: "2026-04-21", valor: 60000 },
      { vencimento: "2026-05-10", valor: 60000 },
    ],
  },
  km: { franquiaMensal: 6000, valorExcedente: 47 },
  encargos: { multaBps: 500, jurosMensaisBps: 100, indiceCorrecao: "IGPM" },
  prazos: {
    diasParaInadimplencia: 5,
    horasParaRegularizar: 24,
    horasAvisoProtesto: 48,
    diasUteisDevolucaoCaucao: 30,
    diasSemCheckinParaNotificar: 5,
  },
  checkin: { diaSemana: 1 },
  manutencao: { revisaoACadaKm: 7000, trocaPneusACadaKm: 40000, lavagemACadaDias: 30 },
  reajuste: { indice: "IGPM", aCadaMeses: 12 },
  taxaAdministracaoMultaBps: 1000,
  franquiaSeguro: 500000,
  areaCirculacao: "Sete Lagoas e Região Metropolitana de Belo Horizonte",
  vencimentoEmDiaNaoUtil: "manter",
});
