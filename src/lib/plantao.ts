import "server-only";
import { cache } from "react";
import type { ParametrosContrato } from "@/dominio/contrato/parametros";
import { type DataISO, hoje, somarDias } from "@/dominio/datas/data";
import type { Centavos } from "@/dominio/dinheiro/centavos";
import { aluguelMensal, type Criterios, normalizarCriterios, normalizarPerfil, PERFIL_PADRAO, type PerfilCusto } from "@/dominio/ganhos/custos";
import type { CategoriaDespesa, Plataforma } from "@/dominio/ganhos/plantao";
import { contratosDoMotorista } from "./motorista";
import { supabaseAdmin } from "./supabase/admin";

/**
 * Plantão do motorista. Lido pela chave do servidor, SEMPRE filtrando pelo
 * usuário logado (como o resto da área do motorista).
 */

export const NOME_ALUGUEL = "Aluguel do carro (contrato)";

/** Aluguel semanal do contrato ativo no Aluguei, se houver. */
export const aluguelDoContrato = cache(async (usuarioId: string): Promise<Centavos | null> => {
  const ativo = (await contratosDoMotorista(usuarioId)).find((c) => c.status === "ativo");
  return ativo ? (ativo.parametros as unknown as ParametrosContrato).aluguelSemanal : null;
});

export type ConfigPlantao = { perfil: PerfilCusto; criterios: Criterios; meta: Centavos; salvo: boolean; aluguelSemanal: Centavos | null };

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
  return { perfil, criterios: normalizarCriterios(data?.criterios), meta: data?.meta_diaria_centavos ?? 0, salvo: Boolean(data), aluguelSemanal };
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
  const [{ data: ganhos }, { data: despesas }, { data: jornadas }, { data: corridas }] = await Promise.all([
    admin.from("ganhos").select("*").eq("usuario_id", usuarioId).gte("dia", de).lte("dia", ate).order("criado_em", { ascending: false }),
    admin.from("despesas_motorista").select("*").eq("usuario_id", usuarioId).gte("dia", de).lte("dia", ate).order("criado_em", { ascending: false }),
    admin.from("jornadas").select("*").eq("usuario_id", usuarioId).gte("inicio", inicioDoDia(de)).lt("inicio", fimExclusivo).order("inicio"),
    admin.from("corridas_avaliadas").select("*").eq("usuario_id", usuarioId).gte("ocorrida_em", inicioDoDia(de)).lt("ocorrida_em", fimExclusivo).order("ocorrida_em", { ascending: false }).limit(500),
  ]);
  return {
    ganhos: (ganhos ?? []).map((g) => ({ ...g, plataforma: g.plataforma as Plataforma })),
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
