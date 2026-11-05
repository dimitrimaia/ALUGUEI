"use server";

import { z } from "zod";
import { lerPreco, type Praca, pracasNaRota } from "@/dominio/ganhos/rota";
import { pedagiosNaArea, rotaComLinha, rotaPorPontos, type Sugestao, sugerirEnderecos } from "@/integracoes/rotas";
import { exigirUsuario } from "./sessao";

const ponto = z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180), nome: z.string().max(200) });

export async function buscarEnderecos(texto: string, perto?: { lat: number; lon: number } | null): Promise<Sugestao[]> {
  await exigirUsuario("/m/plantao/calculadora");
  return sugerirEnderecos(String(texto).slice(0, 120), perto ?? null);
}

export type Planejamento = { km: number; minutos: number; pracas: Praca[] } | { erro: string };

/** Origem e destino → km, tempo e praças de pedágio no caminho (só ida). */
export async function planejarViagem(origem: unknown, destino: unknown): Promise<Planejamento> {
  await exigirUsuario("/m/plantao/calculadora");
  const a = ponto.safeParse(origem);
  const b = ponto.safeParse(destino);
  if (!a.success || !b.success) return { erro: "Escolha a origem e o destino na lista." };
  const rota = await rotaComLinha(a.data, b.data);
  if (!rota) return { erro: "Não deu para calcular a rota agora. Tente de novo em instantes." };
  const cabines = await pedagiosNaArea(rota.linha);
  const pracas = pracasNaRota(rota.linha, cabines.map((c) => ({ nome: c.nome, lat: c.lat, lon: c.lon, preco: lerPreco(c.charge) })));
  return { km: rota.km, minutos: rota.minutos, pracas };
}

/** Corrida particular: saída, até 4 paradas e destino → km, tempo e pedágios do caminho todo. */
export async function planejarCorrida(pontos: unknown[]): Promise<Planejamento> {
  await exigirUsuario("/m/plantao/calculadora");
  const lidos = (Array.isArray(pontos) ? pontos : []).slice(0, 6).map((p) => ponto.safeParse(p));
  if (lidos.length < 2 || lidos.some((p) => !p.success)) return { erro: "Escolha a saída e o destino na lista (e cada parada)." };
  const lista = lidos.map((p) => p.data!);
  const rota = await rotaPorPontos(lista);
  if (!rota) return { erro: "Não deu para calcular a rota agora. Tente de novo em instantes." };
  const cabines = await pedagiosNaArea(rota.linha);
  const pracas = pracasNaRota(rota.linha, cabines.map((c) => ({ nome: c.nome, lat: c.lat, lon: c.lon, preco: lerPreco(c.charge) })));
  return { km: rota.km, minutos: rota.minutos, pracas };
}
