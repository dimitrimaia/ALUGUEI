import { NextResponse } from "next/server";
import { contratosDoMotorista } from "@/lib/motorista";
import { usuarioAtual } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Atalho do menu: abre o check-in pendente mais antigo (ou o início, se não houver). */
export async function GET(request: Request) {
  const base = new URL(request.url).origin;
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.redirect(new URL("/entrar", base));
  const ativos = (await contratosDoMotorista(usuario.id)).filter((c) => c.status === "ativo").map((c) => c.id);
  const { data: o } = ativos.length
    ? await supabaseAdmin().from("obrigacoes").select("id").in("contrato_id", ativos).eq("tipo", "checkin").in("status", ["pendente", "atrasada"]).order("vencimento").limit(1).maybeSingle()
    : { data: null };
  return NextResponse.redirect(new URL(o ? `/m/checkin/${o.id}` : "/m", base));
}
