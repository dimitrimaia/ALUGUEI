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

  // Link de e-mail expirado: o Supabase devolve para a raiz com ?error_code=; a tela de confirmação explica.
  if (request.nextUrl.pathname === "/" && request.nextUrl.searchParams.get("error_code")) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/auth/confirmar";
    return NextResponse.redirect(destino);
  }
  if (request.nextUrl.pathname === "/" && request.nextUrl.searchParams.get("code")) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/auth/callback";
    return NextResponse.redirect(destino);
  }

  const { data } = await supabase.auth.getClaims();
  const caminho = request.nextUrl.pathname;
  const protegida = AREAS_PROTEGIDAS.some((a) => caminho === a || caminho.startsWith(`${a}/`));

  if (protegida && !data?.claims) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/entrar";
    const perfil = caminho.startsWith("/painel") ? "locador" : "motorista";
    destino.search = `?perfil=${perfil}&voltar=${encodeURIComponent(caminho)}`;
    return NextResponse.redirect(destino);
  }
  // Lembra o último modo usado (locador ou motorista), para "Minha área" e o /inicio voltarem para ele.
  const modo = caminho === "/painel" || (caminho.startsWith("/painel/") && !caminho.startsWith("/painel/comecar")) ? "locador" : caminho === "/m" || caminho.startsWith("/m/") ? "motorista" : null;
  if (modo && request.cookies.get("aluguei_modo")?.value !== modo) {
    resposta.cookies.set("aluguei_modo", modo, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|icone/|opengraph-image|twitter-image|manifest.webmanifest|sw.js|api/|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
