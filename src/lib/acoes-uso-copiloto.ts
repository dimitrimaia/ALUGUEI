"use server";

import { revalidatePath } from "next/cache";
import { exigirUsuario } from "./sessao";
import { supabaseAdmin } from "./supabase/admin";

/** Liga ou desliga o "modo piloto" (contar lucro, gastos e corridas). */
export async function definirUsoCopiloto(usar: boolean): Promise<{ ok: boolean }> {
  const usuario = await exigirUsuario("/m");
  const admin = supabaseAdmin();
  const { data } = await admin.auth.admin.getUserById(usuario.id);
  await admin.auth.admin.updateUserById(usuario.id, { user_metadata: { ...(data.user?.user_metadata ?? {}), uso_copiloto: usar ? "sim" : "nao" } });
  revalidatePath("/m", "layout");
  return { ok: true };
}
