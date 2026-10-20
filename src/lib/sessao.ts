import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Linha } from "@/db/tipos";
import { supabaseServidor } from "./supabase/servidor";

export interface Usuario {
  id: string;
  telefone: string | null;
  email: string | null;
}

export const usuarioAtual = cache(async (): Promise<Usuario | null> => {
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getClaims();
  const c = data?.claims;
  if (!c?.sub) return null;
  return { id: c.sub, telefone: (c.phone as string) || null, email: (c.email as string) || null };
});

export async function exigirUsuario(voltar: string): Promise<Usuario> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect(`/entrar?voltar=${encodeURIComponent(voltar)}`);
  return usuario;
}

export interface Equipe {
  usuario: Usuario;
  organizacao: Linha<"organizacoes">;
  papel: Linha<"membros">["papel"];
}

/** Membro da equipe de um locador. Sem organização, manda para o cadastro do locador. */
export const exigirEquipe = cache(async (): Promise<Equipe> => {
  const usuario = await exigirUsuario("/painel");
  const supabase = await supabaseServidor();
  const { data: membro } = await supabase
    .from("membros")
    .select("papel, organizacao_id")
    .eq("usuario_id", usuario.id)
    .order("criado_em")
    .limit(1)
    .maybeSingle();
  if (!membro) redirect("/painel/comecar");
  const { data: organizacao } = await supabase
    .from("organizacoes")
    .select("*")
    .eq("id", membro.organizacao_id)
    .single();
  if (!organizacao) redirect("/painel/comecar");
  return { usuario, organizacao, papel: membro.papel };
});
