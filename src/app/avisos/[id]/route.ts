import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Abre um aviso: marca como lido e leva para a tela dele. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const base = new URL(request.url).origin;
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.redirect(new URL("/entrar", base));
  const { id } = await params;
  const admin = supabaseAdmin();
  const { data: n } = await admin.from("notificacoes").select("link").eq("id", id).eq("destinatario_usuario_id", usuario.id).maybeSingle();
  await admin.from("notificacoes").update({ lida_em: new Date().toISOString() }).eq("id", id).eq("destinatario_usuario_id", usuario.id).is("lida_em", null);
  const destino = n?.link?.startsWith("/") && !n.link.startsWith("//") ? n.link : "/inicio";
  return NextResponse.redirect(new URL(destino, base));
}
