import "server-only";
import { cache } from "react";
import { data, type DataISO } from "@/dominio/datas/data";
import { type AluguelExterno, type LeituraKm, normalizarAluguel } from "@/dominio/ganhos/aluguel";
import { supabaseAdmin } from "./supabase/admin";

/**
 * Carro alugado fora do Aluguei. Fica nos dados da conta (user_metadata.aluguel),
 * como as preferências: é da própria pessoa, sem tabela nem migração.
 */

export const aluguelExterno = cache(async (usuarioId: string): Promise<AluguelExterno | null> => {
  const { data: u } = await supabaseAdmin().auth.admin.getUserById(usuarioId);
  return normalizarAluguel((u.user?.user_metadata as Record<string, unknown> | undefined)?.aluguel);
});

/** Grava (ou apaga, com null) mantendo o resto dos dados da conta. */
export async function gravarAluguel(usuarioId: string, aluguel: AluguelExterno | null): Promise<void> {
  const admin = supabaseAdmin();
  const { data: u, error } = await admin.auth.admin.getUserById(usuarioId);
  if (error || !u.user) throw new Error("Conta não encontrada");
  const meta = { ...(u.user.user_metadata ?? {}), aluguel };
  const { error: e2 } = await admin.auth.admin.updateUserById(usuarioId, { user_metadata: meta });
  if (e2) throw e2;
}

/**
 * Leituras do painel desde o início do aluguel: as digitadas aqui e as que já
 * entram no Plantão (km no início e no fim do turno, km do abastecimento).
 */
export async function leiturasDeKm(usuarioId: string, a: AluguelExterno): Promise<LeituraKm[]> {
  const admin = supabaseAdmin();
  const desde = `${a.inicio}T00:00:00-03:00`;
  const [{ data: jornadas }, { data: despesas }] = await Promise.all([
    admin.from("jornadas").select("inicio, fim, km_inicial, km_final").eq("usuario_id", usuarioId).gte("inicio", desde).limit(1000),
    admin.from("despesas_motorista").select("dia, km_odometro").eq("usuario_id", usuarioId).gte("dia", a.inicio).not("km_odometro", "is", null).limit(1000),
  ]);
  const diaDe = (iso: string) => data(new Date(iso).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }));
  const lidas: LeituraKm[] = [...a.leituras];
  for (const j of jornadas ?? []) {
    if (j.km_inicial) lidas.push({ dia: diaDe(j.inicio), km: j.km_inicial });
    if (j.km_final) lidas.push({ dia: diaDe(j.fim ?? j.inicio), km: j.km_final });
  }
  for (const d of despesas ?? []) if (d.km_odometro) lidas.push({ dia: d.dia as DataISO, km: d.km_odometro });
  // Leitura menor que a do carro na retirada é de outro carro: fica de fora.
  return lidas.filter((l) => a.kmInicial === null || l.km >= a.kmInicial);
}
