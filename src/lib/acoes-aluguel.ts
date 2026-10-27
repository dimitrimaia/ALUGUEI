"use server";

import { revalidatePath } from "next/cache";
import { hoje } from "@/dominio/datas/data";
import { type AluguelExterno, normalizarAluguel } from "@/dominio/ganhos/aluguel";
import { aluguelExterno, gravarAluguel } from "./aluguel-externo";
import { exigirUsuario } from "./sessao";

type Resultado = { ok?: boolean; erro?: string };

async function alterar(mudar: (a: AluguelExterno) => AluguelExterno | null): Promise<Resultado> {
  const usuario = await exigirUsuario("/m/plantao/aluguel");
  const atual = await aluguelExterno(usuario.id);
  if (!atual) return { erro: "Cadastre o aluguel primeiro." };
  const novo = normalizarAluguel(mudar(structuredClone(atual)));
  if (!novo) return { erro: "Confira os dados." };
  await gravarAluguel(usuario.id, novo);
  revalidatePath("/m", "layout");
  return { ok: true };
}

/** Condições do contrato (formulário). Mantém o que o formulário não mexe: leituras, perguntas, vistorias. */
export async function salvarAluguel(entrada: unknown): Promise<Resultado> {
  const usuario = await exigirUsuario("/m/plantao/aluguel");
  const atual = await aluguelExterno(usuario.id);
  const novo = normalizarAluguel({ ...(atual ?? { leituras: [], perguntas: [] }), ...(entrada as object) });
  if (!novo) return { erro: "Preencha a locadora, o início e o valor semanal." };
  await gravarAluguel(usuario.id, novo);
  revalidatePath("/m", "layout");
  return { ok: true };
}

export async function marcarVistoria(): Promise<Resultado> {
  return alterar((a) => ({ ...a, ultimaVistoria: hoje() }));
}

export async function anotarKm(km: number): Promise<Resultado> {
  if (!Number.isInteger(km) || km <= 0) return { erro: "Digite o km do painel." };
  return alterar((a) => {
    if (a.kmInicial !== null && km < a.kmInicial) return null;
    return { ...a, leituras: [...a.leituras, { dia: hoje(), km }] };
  });
}

export async function registrarTrocaOleo(km: number): Promise<Resultado> {
  if (!Number.isInteger(km) || km <= 0) return { erro: "Digite o km da troca." };
  return alterar((a) => ({ ...a, ultimaTrocaOleoKm: km, leituras: [...a.leituras, { dia: hoje(), km }] }));
}

export async function salvarPerguntas(perguntas: { texto: string; resposta: string }[]): Promise<Resultado> {
  return alterar((a) => ({ ...a, perguntas: perguntas.filter((p) => p.texto.trim()) }));
}

export async function registrarDevolucao(desfazer = false): Promise<Resultado> {
  return alterar((a) => ({ ...a, devolucao: desfazer ? null : hoje() }));
}

export async function apagarAluguel(): Promise<Resultado> {
  const usuario = await exigirUsuario("/m/plantao/aluguel");
  await gravarAluguel(usuario.id, null);
  revalidatePath("/m", "layout");
  return { ok: true };
}
