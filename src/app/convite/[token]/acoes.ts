"use server";

import { redirect } from "next/navigation";
import { auditar } from "@/lib/auditoria";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type EstadoAceite = { erro?: string };

/**
 * Liga o convite ao usuário logado. Se ele entrou pelo celular, o número tem
 * que ser o do convite: quem pegar o link de outra pessoa não consegue usá-lo.
 */
export async function aceitarConvite(token: string, _: EstadoAceite): Promise<EstadoAceite> {
  const usuario = await exigirUsuario(`/convite/${token}`);
  const admin = supabaseAdmin();
  const { data: l } = await admin
    .from("locatarios")
    .select("id, organizacao_id, telefone, usuario_id, status, convite_expira_em")
    .eq("token_convite", token)
    .maybeSingle();

  if (!l || (l.convite_expira_em && new Date(l.convite_expira_em) < new Date())) {
    return { erro: "Este convite não vale mais. Peça um novo link ao locador." };
  }
  if (l.usuario_id && l.usuario_id !== usuario.id) return { erro: "Este convite já foi usado por outra conta." };
  if (usuario.telefone && `+${usuario.telefone.replace(/^\+/, "")}` !== l.telefone) {
    return { erro: "Este convite foi enviado para outro número de celular." };
  }

  await admin
    .from("locatarios")
    .update({ usuario_id: usuario.id, status: l.status === "convidado" ? "em_cadastro" : l.status, token_convite: null })
    .eq("id", l.id);
  await auditar({ organizacaoId: l.organizacao_id, usuarioId: usuario.id, acao: "locatario.aceitar_convite", entidade: "locatarios", entidadeId: l.id });
  redirect(`/m/cadastro/${l.id}`);
}
