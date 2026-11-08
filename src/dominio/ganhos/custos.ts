import { z } from "zod";
import { arredondar, type Centavos } from "../dinheiro/centavos";

/**
 * Custos do carro do motorista, para o lucro real de cada corrida e do dia.
 *
 * Dinheiro sempre em centavos inteiros. As TAXAS (centavos por km, centavos por
 * hora) podem ter fração: R$ 5,80 ÷ 12,5 km/l = 46,4 centavos por km. Elas só
 * viram dinheiro multiplicadas por km ou horas, e aí são arredondadas.
 */

export const COMBUSTIVEIS = ["gasolina", "etanol", "gnv", "diesel", "eletrico"] as const;
export type Combustivel = (typeof COMBUSTIVEIS)[number];

export const UNIDADE_COMBUSTIVEL: Record<Combustivel, { unidade: string; consumo: string }> = {
  gasolina: { unidade: "litro", consumo: "km/l" },
  etanol: { unidade: "litro", consumo: "km/l" },
  diesel: { unidade: "litro", consumo: "km/l" },
  gnv: { unidade: "m³", consumo: "km/m³" },
  eletrico: { unidade: "kWh", consumo: "km/kWh" },
};

/** Gasto que acontece a cada tantos km (troca de óleo, pneus, revisão, depreciação). */
export type ItemDesgaste = { nome: string; valor: Centavos; cadaKm: number };
/** Gasto fixo por mês (aluguel, seguro, internet, IPVA ÷ 12). */
export type ItemFixo = { nome: string; valor: Centavos; doContrato?: boolean };

export type PerfilCusto = {
  combustivel: Combustivel;
  /** km por litro (ou m³, ou kWh). */
  consumo: number;
  /** Preço por litro (ou m³, ou kWh). */
  precoCombustivel: Centavos;
  desgaste: ItemDesgaste[];
  fixosMensais: ItemFixo[];
  diasPorMes: number;
  horasPorDia: number;
};

/** Faixa de horário com mínimos próprios (ex.: madrugada, pico). Horas "HH:MM", pode virar a meia-noite. */
export type FaixaHorario = { nome: string; de: string; ate: string; minimoPorKm: Centavos; minimoPorHora: Centavos; bomPorKm: Centavos; bomPorHora: Centavos };

/**
 * Régua do Copiloto: o que o próprio motorista considera uma boa corrida.
 * Cada métrica tem duas linhas: abaixo do mínimo é ruim (vermelho), a partir
 * do "bom" é boa (verde) e no meio é para avaliar (amarelo). Com o "bom" em 0,
 * vale a régua simples: o mínimo é o verde e até 15% abaixo dele é amarelo.
 */
export type Criterios = {
  minimoPorKm: Centavos;
  minimoPorHora: Centavos;
  /** Verde a partir de (0 = régua simples). */
  bomPorKm: Centavos;
  bomPorHora: Centavos;
  /** Distância e tempo máximos até o passageiro (0 = sem limite). */
  buscaMaximaKm: number;
  buscaMaximaMin: number;
  /** Viagem longa demais (0 = sem limite). */
  viagemMaximaKm: number;
  viagemMaximaMin: number;
  /** Corrida abaixo deste valor é vermelha (0 = sem). */
  valorMinimo: Centavos;
  /** Lucro mínimo em reais e em % do valor (bps). Abaixo: amarelo. */
  lucroMinimo: Centavos;
  lucroMinimoBps: number;
  /** Nota mínima do passageiro (0 = não olha a nota). */
  notaMinima: number;
  /** Avisar passageiro com menos de 5 corridas e corrida com parada. */
  alertaPassageiroNovo: boolean;
  alertaParadas: boolean;
  /** Ruas, bairros ou palavras que o motorista evita (embarque ou destino): vermelho. */
  evitar: string[];
  /** Destinos que interessam (perto de casa, aeroporto): selo positivo. */
  destinosDesejados: string[];
  /** Mínimos por horário: na faixa, valem no lugar dos de cima. */
  porHorario: FaixaHorario[];
  /** Contar o custo de voltar para a base (casa) no lucro. */
  contarVolta: boolean;
  /** Régua própria de cada app (opcional): o que estiver preenchido vale no lugar da geral. */
  porApp: Partial<Record<AppRegua, ReguaApp>>;
};

export const APPS_REGUA = ["uber", "99", "indrive", "37city"] as const;
export type AppRegua = (typeof APPS_REGUA)[number];
export const NOME_APP_REGUA: Record<AppRegua, string> = { uber: "Uber", "99": "99", indrive: "inDrive", "37city": "37 City" };
/** null = usa o valor da régua geral. */
export type ReguaApp = { minimoPorKm: Centavos | null; minimoPorHora: Centavos | null; bomPorKm: Centavos | null; bomPorHora: Centavos | null; valorMinimo: Centavos | null; buscaMaximaKm: number | null };
export const REGUA_APP_VAZIA: ReguaApp = { minimoPorKm: null, minimoPorHora: null, bomPorKm: null, bomPorHora: null, valorMinimo: null, buscaMaximaKm: null };

/** Critérios que valem para uma oferta deste app (a régua do app por cima da geral). Igual ao paraApp do Android. */
export function criteriosDoApp(c: Criterios, app: string | null | undefined): Criterios {
  const r = app ? c.porApp[app as AppRegua] : undefined;
  if (!r) return c;
  return {
    ...c,
    minimoPorKm: r.minimoPorKm ?? c.minimoPorKm,
    minimoPorHora: r.minimoPorHora ?? c.minimoPorHora,
    bomPorKm: r.bomPorKm ?? c.bomPorKm,
    bomPorHora: r.bomPorHora ?? c.bomPorHora,
    valorMinimo: r.valorMinimo ?? c.valorMinimo,
    buscaMaximaKm: r.buscaMaximaKm ?? c.buscaMaximaKm,
  };
}

export const PERFIL_PADRAO: PerfilCusto = {
  combustivel: "gasolina",
  consumo: 11,
  precoCombustivel: 619,
  desgaste: [
    { nome: "Troca de óleo e filtros", valor: 30000, cadaKm: 10000 },
    { nome: "Pneus", valor: 160000, cadaKm: 40000 },
    { nome: "Revisão, freios e suspensão", valor: 150000, cadaKm: 20000 },
  ],
  fixosMensais: [],
  diasPorMes: 26,
  horasPorDia: 10,
};

export const CRITERIOS_PADRAO: Criterios = {
  minimoPorKm: 200,
  minimoPorHora: 4000,
  bomPorKm: 0,
  bomPorHora: 0,
  buscaMaximaKm: 4,
  buscaMaximaMin: 0,
  viagemMaximaKm: 0,
  viagemMaximaMin: 0,
  valorMinimo: 0,
  lucroMinimo: 0,
  lucroMinimoBps: 0,
  notaMinima: 0,
  alertaPassageiroNovo: false,
  alertaParadas: false,
  evitar: [],
  destinosDesejados: [],
  porHorario: [],
  contarVolta: false,
  porApp: {},
};

const reais = z.coerce.number().int().min(0).max(100_000_000);
const esquemaPerfil = z.object({
  combustivel: z.enum(COMBUSTIVEIS).catch(PERFIL_PADRAO.combustivel),
  consumo: z.coerce.number().min(0.5).max(100).catch(PERFIL_PADRAO.consumo),
  precoCombustivel: reais.catch(PERFIL_PADRAO.precoCombustivel),
  desgaste: z.array(z.object({ nome: z.string().trim().min(1).max(60), valor: reais, cadaKm: z.coerce.number().int().min(100).max(1_000_000) })).max(20).catch(PERFIL_PADRAO.desgaste),
  fixosMensais: z.array(z.object({ nome: z.string().trim().min(1).max(60), valor: reais, doContrato: z.boolean().optional() })).max(20).catch([]),
  diasPorMes: z.coerce.number().int().min(1).max(31).catch(PERFIL_PADRAO.diasPorMes),
  horasPorDia: z.coerce.number().min(1).max(24).catch(PERFIL_PADRAO.horasPorDia),
});
const listaPalavras = z
  .array(z.string())
  .catch([])
  .transform((l) => [...new Set(l.map((x) => x.trim().replace(/\s+/g, " ").slice(0, 60)).filter((x) => x.length >= 3))].slice(0, 100));
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const esquemaCriterios = z.object({
  minimoPorKm: reais.catch(CRITERIOS_PADRAO.minimoPorKm),
  minimoPorHora: reais.catch(CRITERIOS_PADRAO.minimoPorHora),
  bomPorKm: reais.catch(0),
  bomPorHora: reais.catch(0),
  buscaMaximaKm: z.coerce.number().min(0).max(100).catch(CRITERIOS_PADRAO.buscaMaximaKm),
  buscaMaximaMin: z.coerce.number().int().min(0).max(120).catch(0),
  viagemMaximaKm: z.coerce.number().min(0).max(2000).catch(0),
  viagemMaximaMin: z.coerce.number().int().min(0).max(1440).catch(0),
  valorMinimo: reais.catch(0),
  lucroMinimo: reais.catch(0),
  lucroMinimoBps: z.coerce.number().int().min(0).max(9000).catch(0),
  notaMinima: z.coerce.number().min(0).max(5).catch(0),
  alertaPassageiroNovo: z.boolean().catch(false),
  alertaParadas: z.boolean().catch(false),
  evitar: listaPalavras,
  destinosDesejados: listaPalavras,
  porHorario: z
    .array(z.object({ nome: z.string().trim().min(1).max(30), de: hora, ate: hora, minimoPorKm: reais, minimoPorHora: reais, bomPorKm: reais.catch(0), bomPorHora: reais.catch(0) }))
    .max(6)
    .catch([]),
  contarVolta: z.boolean().catch(false),
  porApp: z
    .record(z.string(), z.unknown())
    .catch({})
    .transform((o) => {
      const opc = (esq: z.ZodType<number>) => esq.nullable().catch(null);
      const regua = z.object({
        minimoPorKm: opc(reais), minimoPorHora: opc(reais), bomPorKm: opc(reais), bomPorHora: opc(reais), valorMinimo: opc(reais),
        buscaMaximaKm: opc(z.coerce.number().min(0).max(100)),
      });
      const saida: Partial<Record<AppRegua, ReguaApp>> = {};
      for (const app of APPS_REGUA) {
        const r = regua.safeParse(o[app] ?? null);
        if (r.success && Object.values(r.data).some((v) => v !== null)) saida[app] = r.data;
      }
      return saida;
    }),
});

/** Lê o que veio do banco ou do formulário; o que estiver inválido volta ao padrão. */
export function normalizarPerfil(entrada: unknown): PerfilCusto {
  const r = esquemaPerfil.safeParse(entrada ?? {});
  return r.success ? r.data : PERFIL_PADRAO;
}
export function normalizarCriterios(entrada: unknown): Criterios {
  const r = esquemaCriterios.safeParse(entrada ?? {});
  return r.success ? r.data : CRITERIOS_PADRAO;
}

/** Aluguel semanal → custo mensal médio (52 semanas ÷ 12 meses). */
export function aluguelMensal(semanal: Centavos): Centavos {
  return arredondar((semanal * 52) / 12);
}

export type Taxas = {
  combustivelPorKm: number;
  desgastePorKm: number;
  /** Combustível + desgaste: o que cada km a mais custa. */
  variavelPorKm: number;
  fixoMensal: Centavos;
  /** Custo fixo de cada hora trabalhada (fixos ÷ horas do mês). */
  fixoPorHora: number;
};

export function taxas(p: PerfilCusto): Taxas {
  const combustivelPorKm = p.consumo > 0 ? p.precoCombustivel / p.consumo : 0;
  const desgastePorKm = p.desgaste.reduce((s, i) => s + (i.cadaKm > 0 ? i.valor / i.cadaKm : 0), 0);
  const fixoMensal = p.fixosMensais.reduce((s, i) => s + i.valor, 0);
  const horasMes = p.diasPorMes * p.horasPorDia;
  return { combustivelPorKm, desgastePorKm, variavelPorKm: combustivelPorKm + desgastePorKm, fixoMensal, fixoPorHora: horasMes > 0 ? fixoMensal / horasMes : 0 };
}

/** Custo de rodar `km` em `minutos` (variável pelo km, fixo pelo tempo). */
export function custoDe(t: Taxas, km: number, minutos: number): Centavos {
  return arredondar(t.variavelPorKm * km + (t.fixoPorHora * minutos) / 60);
}

/** Taxa em centavos (com fração) → centavos para mostrar. */
export const taxaEmCentavos = (taxa: number): Centavos => arredondar(taxa);

/** "23:30" → minutos do dia. */
const minutosDoDia = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

/**
 * Régua que vale agora: a faixa de horário que cobre `minutoDoDia` (0..1439)
 * substitui os mínimos gerais. Faixas que viram a meia-noite (22:00 → 05:00) valem.
 */
export function criteriosNoHorario(c: Criterios, minutoDoDia: number): Criterios & { faixa: string | null } {
  const f = c.porHorario.find((x) => {
    const de = minutosDoDia(x.de);
    const ate = minutosDoDia(x.ate);
    return de <= ate ? minutoDoDia >= de && minutoDoDia < ate : minutoDoDia >= de || minutoDoDia < ate;
  });
  return f ? { ...c, minimoPorKm: f.minimoPorKm, minimoPorHora: f.minimoPorHora, bomPorKm: f.bomPorKm, bomPorHora: f.bomPorHora, faixa: f.nome } : { ...c, faixa: null };
}

/** Comparação sem acento e sem maiúscula: a primeira palavra da lista que aparece no texto. */
export function bateLista(texto: string | null | undefined, lista: readonly string[]): string | null {
  if (!texto) return null;
  const n = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const t = n(texto);
  return lista.find((l) => t.includes(n(l))) ?? null;
}
