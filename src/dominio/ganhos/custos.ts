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

/** Critérios do semáforo: o que o próprio motorista considera uma boa corrida. */
export type Criterios = {
  /** Mínimo por km rodado (contando o caminho até o passageiro). */
  minimoPorKm: Centavos;
  /** Mínimo por hora (contando o tempo até o passageiro). */
  minimoPorHora: Centavos;
  /** Distância máxima até o passageiro. */
  buscaMaximaKm: number;
  /** Nota mínima do passageiro (0 = não olha a nota). */
  notaMinima: number;
  /** Ruas, bairros ou palavras que o motorista evita (embarque ou destino). */
  evitar: string[];
};

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

export const CRITERIOS_PADRAO: Criterios = { minimoPorKm: 200, minimoPorHora: 4000, buscaMaximaKm: 4, notaMinima: 0, evitar: [] };

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
const esquemaCriterios = z.object({
  minimoPorKm: reais.catch(CRITERIOS_PADRAO.minimoPorKm),
  minimoPorHora: reais.catch(CRITERIOS_PADRAO.minimoPorHora),
  buscaMaximaKm: z.coerce.number().min(0).max(100).catch(CRITERIOS_PADRAO.buscaMaximaKm),
  notaMinima: z.coerce.number().min(0).max(5).catch(0),
  evitar: z
    .array(z.string())
    .catch([])
    .transform((l) => [...new Set(l.map((x) => x.trim().replace(/\s+/g, " ").slice(0, 60)).filter((x) => x.length >= 3))].slice(0, 100)),
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
