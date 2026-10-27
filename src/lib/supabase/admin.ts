import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/tipos";
import { supabaseEnv } from "./env";
import { fetchComRetentativa } from "./rede";

/**
 * Cliente com a chave secreta: ignora o RLS. Use só no servidor, e só quando
 * o próprio código já garantiu o escopo (ex.: dados do motorista filtrados por
 * usuario_id = usuário logado, ou leitura de um convite pelo token).
 */
export function supabaseAdmin() {
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!chave) throw new Error("SUPABASE_SECRET_KEY não configurada");
  return createClient<Database>(supabaseEnv().url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchComRetentativa },
  });
}
