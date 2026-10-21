"use server";

import { revalidatePath } from "next/cache";
import { auditar } from "@/lib/auditoria";
import { exigirEquipeAluguei } from "@/lib/equipe-aluguei";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Decide a verificação do carro. Recusar pede o motivo, que o locador vê na ficha do veículo. */
export async function decidirVerificacao(veiculoId: string, aprovado: boolean, form: FormData) {
  const usuario = await exigirEquipeAluguei();
  const motivo = String(form.get("motivo") ?? "").trim() || null;
  if (!aprovado && !motivo) return;
  const admin = supabaseAdmin();
  const { data: v } = await admin.from("veiculos").select("organizacao_id, verificacao").eq("id", veiculoId).single();
  if (!v || v.verificacao !== "em_analise") return;
  const depois = aprovado
    ? { verificacao: "verificado" as const, verificado_em: new Date().toISOString(), verificado_por: usuario.id, verificacao_motivo: null }
    : { verificacao: "recusado" as const, verificacao_motivo: motivo };
  await admin.from("veiculos").update(depois).eq("id", veiculoId);
  await auditar({ organizacaoId: v.organizacao_id, usuarioId: usuario.id, acao: aprovado ? "veiculo.verificado" : "veiculo.recusado", entidade: "veiculos", entidadeId: veiculoId, depois });
  revalidatePath("/admin/verificacoes");
}
