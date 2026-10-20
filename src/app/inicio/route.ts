import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Para onde vai quem acabou de entrar sem destino definido: locador vai para o
 * painel, motorista para o app; quem ainda não é nenhum dos dois escolhe.
 */
export async function GET(request: Request) {
  const base = new URL(request.url).origin;
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.redirect(new URL("/entrar", base));
  const admin = supabaseAdmin();
  const [{ data: membro }, { data: locatario }] = await Promise.all([
    admin.from("membros").select("id").eq("usuario_id", usuario.id).limit(1).maybeSingle(),
    admin.from("locatarios").select("id").eq("usuario_id", usuario.id).limit(1).maybeSingle(),
  ]);
  if (membro) return NextResponse.redirect(new URL("/painel", base));
  if (locatario) return NextResponse.redirect(new URL("/m", base));
  return NextResponse.redirect(new URL("/bem-vindo", base));
}
