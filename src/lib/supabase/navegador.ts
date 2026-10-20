import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

export function supabaseNavegador() {
  const { url, chave } = supabaseEnv();
  return createBrowserClient(url, chave);
}
