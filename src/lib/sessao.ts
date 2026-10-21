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

/** Membro da equipe de um locador. Sem locadora, manda ativar o modo locador. */
export const exigirEquipe = cache(async (): Promise<Equipe> => {
  const usuario = await exigirUsuario("/painel");
  const supabase = await supabaseServidor();
  // O RLS só devolve a locadora do próprio usuário, então as duas consultas vão juntas.
  const [{ data: membro }, { data: organizacao }] = await Promise.all([
    supabase.from("membros").select("papel, organizacao_id").eq("usuario_id", usuario.id).order("criado_em").limit(1).maybeSingle(),
    supabase.from("organizacoes").select("*").order("criado_em").limit(1).maybeSingle(),
  ]);
  if (!membro || !organizacao || organizacao.id !== membro.organizacao_id) redirect("/painel/comecar");
  return { usuario, organizacao, papel: membro.papel };
});
