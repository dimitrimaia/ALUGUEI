"use server";

import type { Linha } from "@/db/tipos";
import { marcarLida, participacao, registrarMensagem } from "./conversas";
import { exigirUsuario } from "./sessao";
import { supabaseAdmin } from "./supabase/admin";

export async function enviarMensagem(conversaId: string, texto: string): Promise<{ mensagem?: Linha<"mensagens">; erro?: string }> {
  const usuario = await exigirUsuario("/inicio");
  const p = await participacao(conversaId, usuario);
  if (!p) return { erro: "Conversa não encontrada." };
  const limpo = texto.trim().slice(0, 2000);
  if (!limpo) return { erro: "Escreva uma mensagem." };
  return { mensagem: await registrarMensagem(conversaId, p.papel, usuario.id, limpo) };
}

/** Busca as mensagens depois de um horário (atualização de segurança, se o tempo real cair). */
export async function mensagensDesde(conversaId: string, desde: string): Promise<Linha<"mensagens">[]> {
  const usuario = await exigirUsuario("/inicio");
  const p = await participacao(conversaId, usuario);
  if (!p) return [];
  const { data } = await supabaseAdmin().from("mensagens").select("*").eq("conversa_id", conversaId).gt("criado_em", desde).order("criado_em");
  if (data?.length) await marcarLida(conversaId, p.papel);
  return data ?? [];
}
