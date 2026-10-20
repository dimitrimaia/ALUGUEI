import { NextResponse } from "next/server";
import { contratosDoMotorista } from "@/lib/motorista";
import { usuarioAtual } from "@/lib/sessao";

/** Atalho do menu: abre o contrato mais recente do motorista. */
export async function GET(request: Request) {
  const base = new URL(request.url).origin;
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.redirect(new URL("/entrar?perfil=motorista", base));
  const [contrato] = await contratosDoMotorista(usuario.id);
  return NextResponse.redirect(new URL(contrato ? `/m/contrato/${contrato.id}` : "/m", base));
}
