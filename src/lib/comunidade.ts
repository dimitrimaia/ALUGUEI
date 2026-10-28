import "server-only";
import { cache } from "react";
import { agregarLugares, chaveLugar, type LugarComunidade, type MarcaLugar, type Periodo, periodoDaHora } from "@/dominio/ganhos/comunidade";
import { supabaseAdmin } from "./supabase/admin";

/**
 * Lugares que os motoristas evitam (anônimo). Antes da migração 0012 a tabela não
 * existe: tudo aqui falha em silêncio e o Copiloto segue sem os avisos.
 */

/** Hora de agora em Brasília (para dia/noite). */
function horaBrasilia(): number {
  return Number(new Date().toLocaleString("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }));
}

/** Marcados na bolha agora: valem para o período do dia em que foram marcados. */
export async function marcarLugares(usuarioId: string, lugares: string[]): Promise<void> {
  const periodo = periodoDaHora(horaBrasilia());
  const linhas = lugares.map((lugar) => ({ usuario_id: usuarioId, lugar: lugar.trim().slice(0, 60), chave: chaveLugar(lugar), periodo })).filter((l) => l.chave.length >= 3);
  if (linhas.length) await supabaseAdmin().from("lugares_evitados").upsert(linhas, { onConflict: "usuario_id,chave,periodo", ignoreDuplicates: true });
}

/**
 * A lista "evitar" da régua mudou: o que está nela conta para dia e noite
 * ("sempre"); o que saiu da lista deixa de contar.
 */
export async function sincronizarLugares(usuarioId: string, evitar: string[]): Promise<void> {
  const admin = supabaseAdmin();
  const { data, error } = await admin.from("lugares_evitados").select("id, chave").eq("usuario_id", usuarioId);
  if (error) return;
  const chaves = new Set(evitar.map(chaveLugar));
  const sairam = (data ?? []).filter((l) => !chaves.has(l.chave)).map((l) => l.id);
  if (sairam.length) await admin.from("lugares_evitados").delete().in("id", sairam);
  const linhas = evitar.map((lugar) => ({ usuario_id: usuarioId, lugar: lugar.trim().slice(0, 60), chave: chaveLugar(lugar), periodo: "sempre" as Periodo })).filter((l) => l.chave.length >= 3);
  if (linhas.length) await admin.from("lugares_evitados").upsert(linhas, { onConflict: "usuario_id,chave,periodo", ignoreDuplicates: true });
}

/** Lugares que 3+ motoristas evitam, com quantos de dia e de noite. */
export const lugaresDaComunidade = cache(async (): Promise<LugarComunidade[]> => {
  const { data, error } = await supabaseAdmin().from("lugares_evitados").select("usuario_id, lugar, periodo").limit(50_000);
  if (error || !data) return [];
  return agregarLugares(data.map((l): MarcaLugar => ({ usuario: l.usuario_id, lugar: l.lugar, periodo: l.periodo as Periodo })));
});
