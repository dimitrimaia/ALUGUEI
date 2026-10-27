import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/db/tipos";
import { supabaseEnv } from "./env";
import { fetchComRetentativa } from "./rede";

/** Cliente com a sessão do usuário: tudo que ele faz passa pelo RLS. */
export async function supabaseServidor() {
  const { url, chave } = supabaseEnv();
  const loja = await cookies();
  return createServerClient<Database>(url, chave, {
    global: { fetch: fetchComRetentativa },
    cookies: {
      getAll: () => loja.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) loja.set(name, value, options);
        } catch {
          // Server Component não grava cookie; o proxy renova a sessão.
        }
      },
    },
  });
}
