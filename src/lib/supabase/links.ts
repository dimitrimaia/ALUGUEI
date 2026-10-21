import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/**
 * Cliente só para pedir e-mails com link (entrar, confirmar conta, nova senha).
 *
 * O cliente padrão usa o fluxo PKCE: o link só funciona no mesmo navegador que
 * pediu. Quem abre o e-mail no app do Gmail cai em outro navegador e via
 * "link expirado". No fluxo implícito o Supabase valida o link no servidor e
 * devolve a sessão no endereço, então o link funciona em qualquer navegador.
 * Quem recebe é a tela /auth/confirmar, que grava a sessão nos cookies.
 */
export function supabaseLinks() {
  const { url, chave } = supabaseEnv();
  return createClient(url, chave, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** Endereço de volta dos links de e-mail. */
export function urlConfirmacao(voltar: string) {
  return `${window.location.origin}/auth/confirmar?voltar=${encodeURIComponent(voltar)}`;
}
