"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { hoje } from "@/dominio/datas/data";
import { type AluguelExterno, normalizarAluguel } from "@/dominio/ganhos/aluguel";
import { type AluguelSalvo, alugueisExternos, gravarAlugueis } from "./aluguel-externo";
import { exigirUsuario } from "./sessao";

type Resultado = { ok?: boolean; erro?: string; id?: string };

async function alterar(id: string, mudar: (a: AluguelExterno) => AluguelExterno | null): Promise<Resultado> {
  const usuario = await exigirUsuario("/m/plantao/aluguel");
  const lista = await alugueisExternos(usuario.id);
  const atual = lista.find((a) => a.id === id);
  if (!atual) return { erro: "Carro não encontrado." };
  const novo = normalizarAluguel(mudar(structuredClone(atual)));
  if (!novo) return { erro: "Confira os dados." };
  await gravarAlugueis(usuario.id, lista.map((a) => (a.id === id ? { ...novo, id } : a)));
  revalidatePath("/m", "layout");
  return { ok: true, id };
}

/**
 * Condições do contrato (formulário). Sem id, cadastra um carro novo. Mantém o que
 * o formulário não mexe: leituras e combinados. Só um carro fica "em uso" por vez:
 * ao cadastrar um novo, o anterior sem devolução é marcado como devolvido hoje.
 */
export async function salvarAluguel(entrada: unknown, id?: string): Promise<Resultado> {
  const usuario = await exigirUsuario("/m/plantao/aluguel");
  const lista = await alugueisExternos(usuario.id);
  const atual = id ? lista.find((a) => a.id === id) : undefined;
  if (id && !atual) return { erro: "Carro não encontrado." };
  const novo = normalizarAluguel({ ...(atual ?? { leituras: [], perguntas: [] }), ...(entrada as object) });
  if (!novo) return { erro: "Preencha a locadora, o início e o valor semanal." };
  const novoId = id ?? randomUUID();
  const salvo: AluguelSalvo = { ...novo, id: novoId };
  const resto = lista.filter((a) => a.id !== novoId).map((a) => (!id && !salvo.devolucao && !a.devolucao ? { ...a, devolucao: hoje() } : a));
  await gravarAlugueis(usuario.id, [salvo, ...resto]);
  revalidatePath("/m", "layout");
  return { ok: true, id: novoId };
}

export async function marcarVistoria(id: string): Promise<Resultado> {
  return alterar(id, (a) => ({ ...a, ultimaVistoria: hoje() }));
}

export async function anotarKm(id: string, km: number): Promise<Resultado> {
  if (!Number.isInteger(km) || km <= 0) return { erro: "Digite o km do painel." };
  return alterar(id, (a) => {
    if (a.kmInicial !== null && km < a.kmInicial) return null;
    return { ...a, leituras: [...a.leituras, { dia: hoje(), km }] };
  });
}

export async function registrarTrocaOleo(id: string, km: number): Promise<Resultado> {
  if (!Number.isInteger(km) || km <= 0) return { erro: "Digite o km da troca." };
  return alterar(id, (a) => ({ ...a, ultimaTrocaOleoKm: km, leituras: [...a.leituras, { dia: hoje(), km }] }));
}

export async function salvarPerguntas(id: string, perguntas: { texto: string; resposta: string }[]): Promise<Resultado> {
  return alterar(id, (a) => ({ ...a, perguntas: perguntas.filter((p) => p.texto.trim()) }));
}

export async function registrarDevolucao(id: string, desfazer = false): Promise<Resultado> {
  const usuario = await exigirUsuario("/m/plantao/aluguel");
  const lista = await alugueisExternos(usuario.id);
  if (!lista.some((a) => a.id === id)) return { erro: "Carro não encontrado." };
  // Voltar a usar um carro: os outros em uso ficam como devolvidos hoje (um carro por vez).
  const nova = lista.map((a) => (a.id === id ? { ...a, devolucao: desfazer ? null : hoje() } : desfazer && !a.devolucao ? { ...a, devolucao: hoje() } : a));
  await gravarAlugueis(usuario.id, nova);
  revalidatePath("/m", "layout");
  return { ok: true, id };
}

export async function apagarAluguel(id: string): Promise<Resultado> {
  const usuario = await exigirUsuario("/m/plantao/aluguel");
  const lista = await alugueisExternos(usuario.id);
  await gravarAlugueis(usuario.id, lista.filter((a) => a.id !== id));
  revalidatePath("/m", "layout");
  return { ok: true };
}
