import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/servidor";

/**
 * Destino antigo dos links de e-mail (os novos vão para /auth/confirmar).
 * Aceita os dois formatos do Supabase:
 * `?code=` (fluxo PKCE, aberto no mesmo navegador) e `?token_hash=&type=`
 * (modelo de e-mail com {{ .TokenHash }}, funciona em qualquer navegador).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const voltar = url.searchParams.get("voltar");
  const destino = voltar?.startsWith("/") && !voltar.startsWith("//") ? voltar : "/m";
  const supabase = await supabaseServidor();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && tipo
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })
      : { error: new Error("link sem código") };

  if (error) {
    // A tela de confirmação explica o motivo e oferece pedir outro link.
    const erro = new URL("/auth/confirmar", url.origin);
    erro.searchParams.set("error_code", code ? "flow_state_not_found" : "otp_expired");
    if (tipo) erro.searchParams.set("type", tipo);
    return NextResponse.redirect(erro);
  }
  return NextResponse.redirect(new URL(tipo === "recovery" ? "/nova-senha" : destino, url.origin));
}
