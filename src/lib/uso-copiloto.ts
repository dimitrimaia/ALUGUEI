import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "./supabase/admin";

/**
 * "Modo piloto": se a pessoa roda por app e quer que o Aluguei conte lucro, gastos
 * e corridas (Plantão e Copiloto). Fica nos dados da conta. null = ainda não respondeu.
 */
export type UsoCopiloto = "sim" | "nao" | null;

export const usoCopiloto = cache(async (usuarioId: string): Promise<UsoCopiloto> => {
  const { data } = await supabaseAdmin().auth.admin.getUserById(usuarioId);
  const v = (data.user?.user_metadata as Record<string, unknown> | undefined)?.uso_copiloto;
  return v === "sim" || v === "nao" ? v : null;
});
