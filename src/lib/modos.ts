import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "./supabase/admin";

/**
 * Uma conta, dois modos (como no BlaBlaCar: quem oferece também pode pegar).
 * - Motorista: alugar carros de outros. Toda conta tem.
 * - Locador: anunciar e alugar os próprios carros. Ativado ao criar a locadora.
 * O último modo usado fica no cookie `aluguei_modo`, gravado pelo proxy.
 */
export type Modo = "motorista" | "locador";
export const COOKIE_MODO = "aluguei_modo";

export interface LocadoraDoUsuario {
  id: string;
  nome: string;
  papel: "dono" | "operador";
}

export const locadoraDoUsuario = cache(async (usuarioId: string): Promise<LocadoraDoUsuario | null> => {
  const admin = supabaseAdmin();
  const { data: membro } = await admin.from("membros").select("organizacao_id, papel").eq("usuario_id", usuarioId).order("criado_em").limit(1).maybeSingle();
  if (!membro) return null;
  const { data: org } = await admin.from("organizacoes").select("nome").eq("id", membro.organizacao_id).single();
  return { id: membro.organizacao_id, nome: org?.nome ?? "Minha locadora", papel: membro.papel };
});
