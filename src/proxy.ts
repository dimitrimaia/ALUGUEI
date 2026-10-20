import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";

const AREAS_PROTEGIDAS = ["/painel", "/m"];

/** Renova a sessão do Supabase a cada requisição e protege as áreas logadas. */
export async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request });
  const { url, chave } = supabaseEnv();

  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista, cabecalhos) => {
        for (const { name, value } of lista) request.cookies.set(name, value);
        resposta = NextResponse.next({ request });
        for (const { name, value, options } of lista) resposta.cookies.set(name, value, options);
        for (const [k, v] of Object.entries(cabecalhos)) resposta.headers.set(k, v);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const caminho = request.nextUrl.pathname;
  const protegida = AREAS_PROTEGIDAS.some((a) => caminho === a || caminho.startsWith(`${a}/`));

  if (protegida && !data?.claims) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/entrar";
    destino.search = `?voltar=${encodeURIComponent(caminho)}`;
    return NextResponse.redirect(destino);
  }
  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|icone/|manifest.webmanifest|api/|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
