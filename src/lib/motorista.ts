import "server-only";
import { supabaseAdmin } from "./supabase/admin";

/**
 * O motorista não é membro de nenhum locador, então o painel dele lê pela
 * chave secreta, SEMPRE filtrando por usuario_id = usuário logado.
 */
export async function cadastrosDoMotorista(usuarioId: string) {
  const { data } = await supabaseAdmin()
    .from("locatarios")
    .select("*")
    .eq("usuario_id", usuarioId)
    .order("criado_em", { ascending: false });
  return data ?? [];
}

export async function cadastroDoMotorista(usuarioId: string, locatarioId: string) {
  const { data } = await supabaseAdmin()
    .from("locatarios")
    .select("*")
    .eq("id", locatarioId)
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  return data;
}
