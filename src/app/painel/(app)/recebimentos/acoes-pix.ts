"use server";

import { revalidatePath } from "next/cache";
import { normalizarChavePix } from "@/dominio/pix/brcode";
import { auditar } from "@/lib/auditoria";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Resultado = { ok: true; mensagem: string } | { ok: false; erro: string };

export async function salvarPixDireto(_: Resultado | null, dados: FormData): Promise<Resultado> {
  const { organizacao, papel, usuario } = await exigirEquipe();
  if (papel !== "dono") return { ok: false, erro: "Só o dono da conta altera os recebimentos." };
  const remover = dados.get("remover") === "1";
  const lida = remover ? null : normalizarChavePix(String(dados.get("chave") ?? ""));
  if (!remover && !lida) return { ok: false, erro: "Chave Pix inválida. Celular vai com +55 e DDD." };
  const chave = lida?.chave ?? null;
  const { error } = await supabaseAdmin().from("organizacoes").update({ chave_pix_direto: chave }).eq("id", organizacao.id);
  if (error) return { ok: false, erro: "Não foi possível salvar. Rodou a migração 0005?" };
  await auditar({ organizacaoId: organizacao.id, usuarioId: usuario.id, acao: "recebimento.pix_direto", entidade: "organizacoes", entidadeId: organizacao.id, antes: { chave: organizacao.chave_pix_direto }, depois: { chave } });
  revalidatePath("/painel/recebimentos");
  return { ok: true, mensagem: chave ? `Pix direto ligado na chave ${chave}.` : "Pix direto desligado." };
}
