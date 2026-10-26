import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_MODO, locadoraDoUsuario } from "@/lib/modos";
import { usuarioAtual } from "@/lib/sessao";

/**
 * "Minha área": volta para o último modo usado. Sem histórico, quem tem
 * locadora vai para o painel; os demais, para o app de quem aluga.
 */
export async function GET(request: Request) {
  const base = new URL(request.url).origin;
  const usuario = await usuarioAtual();
  // No app, quem não entrou começa pelas boas-vindas; no site, pelo login.
  if (!usuario) return NextResponse.redirect(new URL(request.headers.get("user-agent")?.includes("AlugueiApp") ? "/app" : "/entrar", base));
  const modo = (await cookies()).get(COOKIE_MODO)?.value;
  if (modo === "motorista") return NextResponse.redirect(new URL("/m", base));
  const locadora = await locadoraDoUsuario(usuario.id);
  return NextResponse.redirect(new URL(locadora ? "/painel" : "/m", base));
}
