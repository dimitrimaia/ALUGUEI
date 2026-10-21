import "server-only";
import type { Linha } from "@/db/tipos";
import { equipeAluguei } from "./equipe-aluguei";
import { supabaseAdmin } from "./supabase/admin";
import { usuarioAtual } from "./sessao";

export const ASSUNTOS_SUPORTE = ["Pagamento e Pix", "Contrato", "Carro ou vistoria", "Minha conta", "Anúncio ou busca", "Outro assunto"] as const;

/**
 * Quem pode ver um atendimento: a pessoa que abriu (lado "usuario") ou a
 * equipe do Aluguei (lado "equipe"). Agentes automáticos entram como "agente".
 */
export async function acessoAtendimento(id: string, lado: "usuario" | "equipe"): Promise<{ atendimento: Linha<"atendimentos">; usuarioId: string } | null> {
  const usuario = await usuarioAtual();
  if (!usuario) return null;
  if (lado === "equipe" && !(await equipeAluguei())) return null;
  const { data } = await supabaseAdmin().from("atendimentos").select("*").eq("id", id).maybeSingle();
  if (!data || (lado === "usuario" && data.usuario_id !== usuario.id)) return null;
  return { atendimento: data, usuarioId: usuario.id };
}

export async function atendimentosDoUsuario(usuarioId: string) {
  const { data } = await supabaseAdmin().from("atendimentos").select("*").eq("usuario_id", usuarioId).order("ultima_mensagem_em", { ascending: false }).limit(50);
  return data ?? [];
}
