import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/db/tipos";
import { supabaseEnv } from "./env";

export function supabaseNavegador() {
  const { url, chave } = supabaseEnv();
  return createBrowserClient<Database>(url, chave);
}
