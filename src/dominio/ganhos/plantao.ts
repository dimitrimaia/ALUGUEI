import { arredondar, type Centavos } from "../dinheiro/centavos";
import { type DataISO, hoje } from "../datas/data";
import type { Taxas } from "./custos";

export const PLATAFORMAS = ["uber", "99", "indrive", "37city", "ifood", "particular", "outra"] as const;
export type Plataforma = (typeof PLATAFORMAS)[number];
export const NOME_PLATAFORMA: Record<Plataforma, string> = { uber: "Uber", "99": "99", indrive: "inDrive", "37city": "37 City", ifood: "iFood", particular: "Particular", outra: "Outra" };

export const CATEGORIAS_DESPESA = ["combustivel", "manutencao", "lavagem", "alimentacao", "pedagio", "estacionamento", "multa", "aluguel", "seguro", "celular", "outra"] as const;
export type CategoriaDespesa = (typeof CATEGORIAS_DESPESA)[number];
export const NOME_DESPESA: Record<CategoriaDespesa, string> = {
  combustivel: "Combustível",
  manutencao: "Manutenção",
  lavagem: "Lavagem",
  alimentacao: "Alimentação",
  pedagio: "Pedágio",
  estacionamento: "Estacionamento",
  multa: "Multa",
  aluguel: "Aluguel do carro",
  seguro: "Seguro",
  celular: "Celular e internet",
  outra: "Outra",
};

export type Ganho = { plataforma: Plataforma; valor: Centavos; corridas: number; dia: string };
export type Despesa = { categoria: CategoriaDespesa; valor: Centavos; dia: string };
export type Jornada = { inicio: string; fim: string | null; kmRodados: number | null };

/** Minutos de uma jornada (aberta: até `agora`). */
export function minutosJornada(j: Jornada, agora: Date): number {
  const fim = j.fim ? new Date(j.fim) : agora;
  return Math.max(0, Math.round((fim.getTime() - new Date(j.inicio).getTime()) / 60_000));
}

export type Resumo = {
  bruto: Centavos;
  corridas: number;
  porPlataforma: { plataforma: Plataforma; valor: Centavos; corridas: number }[];
  despesas: Centavos;
  porCategoria: { categoria: CategoriaDespesa; valor: Centavos }[];
  /** Custos fixos do período (aluguel, seguro...) que não foram lançados como despesa. */
  fixosDoPeriodo: Centavos;
  lucro: Centavos;
  horas: number;
  km: number;
  porHora: Centavos | null;
  porKm: Centavos | null;
  lucroPorHora: Centavos | null;
  /** Combustível estimado pelo km rodado, quando não houve abastecimento lançado. */
  combustivelEstimado: Centavos;
};

/**
 * Resumo de um período (dia, semana, mês). Lucro = bruto − despesas lançadas
 * − fixos mensais proporcionais aos dias (só os que não foram lançados) −
 * combustível estimado, se nenhum abastecimento foi lançado.
 */
export function resumir(ganhos: Ganho[], despesas: Despesa[], jornadas: Jornada[], t: Taxas, dias: number, agora: Date, fixosLancados = false): Resumo {
  const bruto = ganhos.reduce((s, g) => s + g.valor, 0);
  const corridas = ganhos.reduce((s, g) => s + g.corridas, 0);
  const porPlataforma = Object.values(
    ganhos.reduce<Record<string, { plataforma: Plataforma; valor: Centavos; corridas: number }>>((acc, g) => {
      const a = (acc[g.plataforma] ??= { plataforma: g.plataforma, valor: 0, corridas: 0 });
      a.valor += g.valor;
      a.corridas += g.corridas;
      return acc;
    }, {}),
  ).sort((a, b) => b.valor - a.valor);
  const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0);
  const porCategoria = Object.values(
    despesas.reduce<Record<string, { categoria: CategoriaDespesa; valor: Centavos }>>((acc, d) => {
      (acc[d.categoria] ??= { categoria: d.categoria, valor: 0 }).valor += d.valor;
      return acc;
    }, {}),
  ).sort((a, b) => b.valor - a.valor);
  const minutos = jornadas.reduce((s, j) => s + minutosJornada(j, agora), 0);
  const km = jornadas.reduce((s, j) => s + (j.kmRodados ?? 0), 0);
  const fixosDoPeriodo = fixosLancados ? 0 : arredondar((t.fixoMensal * dias) / 30);
  const temAbastecimento = despesas.some((d) => d.categoria === "combustivel");
  const combustivelEstimado = temAbastecimento ? 0 : arredondar(t.combustivelPorKm * km);
  const lucro = bruto - totalDespesas - fixosDoPeriodo - combustivelEstimado;
  const horas = minutos / 60;
  return {
    bruto,
    corridas,
    porPlataforma,
    despesas: totalDespesas,
    porCategoria,
    fixosDoPeriodo,
    lucro,
    horas,
    km,
    porHora: horas >= 0.1 ? arredondar(bruto / horas) : null,
    porKm: km > 0 ? arredondar(bruto / km) : null,
    lucroPorHora: horas >= 0.1 ? arredondar(lucro / horas) : null,
    combustivelEstimado,
  };
}

/** Meta do dia: quanto falta e, no ritmo atual, em quantas horas chega. */
export function progressoMeta(meta: Centavos, feito: Centavos, minutos: number) {
  const falta = Math.max(0, meta - feito);
  const ritmo = minutos >= 15 ? (feito * 60) / minutos : null; // centavos por hora
  return {
    falta,
    percentual: meta > 0 ? Math.min(100, Math.floor((feito * 100) / meta)) : 0,
    batida: meta > 0 && feito >= meta,
    minutosRestantes: falta === 0 ? 0 : ritmo && ritmo > 0 ? Math.ceil((falta / ritmo) * 60) : null,
  };
}

/** Corrida que o motorista aceitou no Copiloto (ou na calculadora). */
export type CorridaAceita = { app: string | null; valor: Centavos; quando: string };
export type GanhoCopiloto = { dia: DataISO; plataforma: Plataforma; valor: Centavos; corridas: number; ultimo: string };

/**
 * As corridas aceitas viram receita sozinhas: um ganho por dia e por app. Se o
 * motorista já lançou à mão o ganho daquele app naquele dia (ex.: no "Fechar o
 * dia"), vale o lançamento dele e as corridas daquele app e dia não entram (sem
 * contar em dobro). Dia civil de Brasília.
 */
export function ganhosDoCopiloto(aceitas: CorridaAceita[], manuais: { dia: string; plataforma: string }[]): GanhoCopiloto[] {
  const lancados = new Set(manuais.map((m) => `${m.dia}|${m.plataforma}`));
  const por = new Map<string, GanhoCopiloto>();
  for (const c of aceitas) {
    const plataforma = ((PLATAFORMAS as readonly string[]).includes(c.app ?? "") ? c.app : "outra") as Plataforma;
    const dia = hoje(new Date(c.quando));
    const k = `${dia}|${plataforma}`;
    if (lancados.has(k)) continue;
    const g = por.get(k) ?? { dia, plataforma, valor: 0 as Centavos, corridas: 0, ultimo: c.quando };
    g.valor = (g.valor + c.valor) as Centavos;
    g.corridas++;
    if (c.quando > g.ultimo) g.ultimo = c.quando;
    por.set(k, g);
  }
  return [...por.values()].sort((a, b) => b.ultimo.localeCompare(a.ultimo));
}
