import { NextResponse } from "next/server";
import { contratosDoMotorista } from "@/lib/motorista";
import { usuarioAtual } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Atalho do menu: abre a vistoria de entrega do contrato mais recente. */
export async function GET(request: Request) {
  const base = new URL(request.url).origin;
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.redirect(new URL("/entrar?perfil=motorista", base));
  const [contrato] = await contratosDoMotorista(usuario.id);
  const { data } = contrato
    ? await supabaseAdmin().from("vistorias").select("id").eq("contrato_id", contrato.id).order("criado_em", { ascending: false }).limit(1).maybeSingle()
    : { data: null };
  return NextResponse.redirect(new URL(data ? `/m/vistoria/${data.id}` : "/m", base));
}
