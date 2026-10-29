import "server-only";
import { cache } from "react";
import type { ParametrosContrato } from "@/dominio/contrato/parametros";
import { type DataISO, hoje, somarDias } from "@/dominio/datas/data";
import type { Centavos } from "@/dominio/dinheiro/centavos";
import { aluguelMensal, type Criterios, normalizarCriterios, normalizarPerfil, PERFIL_PADRAO, type PerfilCusto } from "@/dominio/ganhos/custos";
import { type CategoriaDespesa, ganhosDoCopiloto, type Plataforma } from "@/dominio/ganhos/plantao";
import { normalizarPreferenciasCopiloto, type PreferenciasCopiloto } from "@/dominio/ganhos/copiloto";
import { type ConfigFinancas, normalizarFinancas } from "@/dominio/ganhos/financas";
import { aluguelExterno } from "./aluguel-externo";
import { contratosDoMotorista } from "./motorista";
import { supabaseAdmin } from "./supabase/admin";

/**
 * Plantão do motorista. Lido pela chave do servidor, SEMPRE filtrando pelo
 * usuário logado (como o resto da área do motorista).
 */

export const NOME_ALUGUEL = "Aluguel do carro (contrato)";

/** Aluguel semanal do contrato ativo no Aluguei; se não houver, o do carro alugado fora do app. */
export const aluguelDoContrato = cache(async (usuarioId: string): Promise<Centavos | null> => {
  // As duas buscas juntas (antes em sequência deixavam o Plantão mais lento).
  const [contratos, externo] = await Promise.all([contratosDoMotorista(usuarioId), aluguelExterno(usuarioId).catch(() => null)]);
  const ativo = contratos.find((c) => c.status === "ativo");
  if (ativo) return (ativo.parametros as unknown as ParametrosContrato).aluguelSemanal;
  return externo && !externo.devolucao ? externo.valorSemanal : null;
});

export type ConfigPlantao = { perfil: PerfilCusto; criterios: Criterios; meta: Centavos; salvo: boolean; aluguelSemanal: Centavos | null; preferencias: PreferenciasCopiloto; financas: ConfigFinancas };

/**
 * Custos do motorista. O aluguel do contrato entra sozinho e acompanha o
 * contrato (se mudar ou acabar, o custo muda junto).
 */
export const configPlantao = cache(async (usuarioId: string): Promise<ConfigPlantao> => {
  const [{ data }, aluguelSemanal] = await Promise.all([supabaseAdmin().from("perfis_custo").select("*").eq("usuario_id", usuarioId).maybeSingle(), aluguelDoContrato(usuarioId)]);
  const perfil = data ? normalizarPerfil(data.perfil) : structuredClone(PERFIL_PADRAO);
  const semContrato = perfil.fixosMensais.filter((f) => !f.doContrato);
  const usarContrato = !data || perfil.fixosMensais.some((f) => f.doContrato);
  perfil.fixosMensais = aluguelSemanal && usarContrato ? [{ nome: NOME_ALUGUEL, valor: aluguelMensal(aluguelSemanal), doContrato: true }, ...semContrato] : semContrato;
  // preferencias e financas chegam com a migração 0009; antes dela, ficam no padrão.
  const linha = (data ?? {}) as { preferencias?: unknown; financas?: unknown };
  return { perfil, criterios: normalizarCriterios(data?.criterios), meta: data?.meta_diaria_centavos ?? 0, salvo: Boolean(data), aluguelSemanal, preferencias: normalizarPreferenciasCopiloto(linha.preferencias), financas: normalizarFinancas(linha.financas) };
});

export const jornadaAberta = cache(async (usuarioId: string) => {
  const { data } = await supabaseAdmin().from("jornadas").select("*").eq("usuario_id", usuarioId).is("fim", null).order("inicio", { ascending: false }).limit(1).maybeSingle();
  return data;
});

const inicioDoDia = (d: DataISO) => `${d}T00:00:00-03:00`;

/** Ganhos, despesas, jornadas e corridas de um período (datas inclusivas, no fuso de Brasília). */
export async function dadosDoPeriodo(usuarioId: string, de: DataISO, ate: DataISO) {
  const admin = supabaseAdmin();
  const fimExclusivo = inicioDoDia(somarDias(ate, 1));
  const [{ data: ganhos }, { data: despesas }, { data: jornadas }, { data: corridas }, { data: aceitas }] = await Promise.all([
    admin.from("ganhos").select("*").eq("usuario_id", usuarioId).gte("dia", de).lte("dia", ate).order("criado_em", { ascending: false }),
    admin.from("despesas_motorista").select("*").eq("usuario_id", usuarioId).gte("dia", de).lte("dia", ate).order("criado_em", { ascending: false }),
    admin.from("jornadas").select("*").eq("usuario_id", usuarioId).gte("inicio", inicioDoDia(de)).lt("inicio", fimExclusivo).order("inicio"),
    admin.from("corridas_avaliadas").select("*").eq("usuario_id", usuarioId).gte("ocorrida_em", inicioDoDia(de)).lt("ocorrida_em", fimExclusivo).order("ocorrida_em", { ascending: false }).limit(500),
    // Só as aceitas, sem limite curto: viram receita sozinhas (ganhosDoCopiloto).
    admin.from("corridas_avaliadas").select("*").eq("usuario_id", usuarioId).eq("decisao", "aceitei").gte("ocorrida_em", inicioDoDia(de)).lt("ocorrida_em", fimExclusivo).limit(5000),
  ]);
  const manuais = (ganhos ?? []).map((g) => ({ ...g, plataforma: g.plataforma as Plataforma, automatico: false }));
  const doCopiloto = ganhosDoCopiloto(
    (aceitas ?? []).map((c) => ({ app: c.app, valor: (c as { valor_final_centavos?: number | null }).valor_final_centavos ?? c.valor_centavos, quando: c.ocorrida_em })),
    manuais,
  ).map((g) => ({ id: `copiloto:${g.dia}:${g.plataforma}`, usuario_id: usuarioId, jornada_id: null, dia: g.dia, plataforma: g.plataforma, valor_centavos: g.valor, corridas: g.corridas, criado_em: g.ultimo, automatico: true }));
  return {
    // Ganhos lançados e, para os app/dias sem lançamento, as corridas aceitas no Copiloto.
    ganhos: [...manuais, ...doCopiloto].sort((a, b) => b.criado_em.localeCompare(a.criado_em)),
    despesas: (despesas ?? []).map((d) => ({ ...d, categoria: d.categoria as CategoriaDespesa })),
    jornadas: jornadas ?? [],
    corridas: corridas ?? [],
  };
}

/** Converte as linhas do banco para o formato do domínio. */
export function paraDominio(d: Awaited<ReturnType<typeof dadosDoPeriodo>>) {
  return {
    ganhos: d.ganhos.map((g) => ({ plataforma: g.plataforma, valor: g.valor_centavos, corridas: g.corridas, dia: g.dia })),
    despesas: d.despesas.map((x) => ({ categoria: x.categoria, valor: x.valor_centavos, dia: x.dia })),
    jornadas: d.jornadas.map((j) => ({ inicio: j.inicio, fim: j.fim, kmRodados: j.km_final !== null && j.km_inicial !== null ? Math.max(0, j.km_final - j.km_inicial) : null })),
  };
}

export const PERIODOS = { hoje: "Hoje", semana: "7 dias", mes: "30 dias" } as const;
export type Periodo = keyof typeof PERIODOS;
export function intervalo(p: Periodo): { de: DataISO; ate: DataISO; dias: number } {
  const ate = hoje();
  const dias = p === "hoje" ? 1 : p === "semana" ? 7 : 30;
  return { de: somarDias(ate, -(dias - 1)), ate, dias };
}

/** Períodos do extrato (inclui ontem e o mês do calendário). */
export const PERIODOS_EXTRATO = { hoje: "Hoje", ontem: "Ontem", semana: "7 dias", mes: "Este mês", trinta: "30 dias" } as const;
export type PeriodoExtrato = keyof typeof PERIODOS_EXTRATO;
export function intervaloExtrato(p: PeriodoExtrato): { de: DataISO; ate: DataISO; dias: number } {
  const dia = hoje();
  if (p === "ontem") return { de: somarDias(dia, -1), ate: somarDias(dia, -1), dias: 1 };
  if (p === "mes") {
    const de = `${dia.slice(0, 8)}01` as DataISO;
    return { de, ate: dia, dias: Number(dia.slice(8, 10)) };
  }
  const dias = p === "hoje" ? 1 : p === "semana" ? 7 : 30;
  return { de: somarDias(dia, -(dias - 1)), ate: dia, dias };
}
