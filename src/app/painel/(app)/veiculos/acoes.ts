"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hoje } from "@/dominio/datas/data";
import { normalizarPlaca, renavamValido } from "@/dominio/cadastro/documentos";
import { auditar } from "@/lib/auditoria";
import { ArquivoInvalido, guardarEvidencia } from "@/lib/evidencias";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/servidor";

const anoAtual = new Date().getFullYear();
const ano = z.coerce.number().int().min(1990).max(anoAtual + 1).optional().or(z.literal("").transform(() => undefined));

const esquemaVeiculo = z.object({
  placa: z.string().transform((s, ctx) => {
    const p = normalizarPlaca(s);
    if (!p) ctx.addIssue({ code: "custom", message: "Placa inválida (ABC1234 ou ABC1D23)" });
    return p ?? "";
  }),
  modelo: z.string().trim().min(2, "Informe marca e modelo"),
  anoFabricacao: ano,
  anoModelo: ano,
  cor: z.string().trim().optional(),
  renavam: z
    .string()
    .transform((s) => s.replace(/\D/g, ""))
    .refine((s) => s === "" || s.length === 11, "Renavam tem 11 dígitos")
    .optional(),
  odometroAtual: z.coerce.number({ message: "Informe o km" }).int().min(0, "Km inválido"),
});

export type EstadoVeiculo = { erros?: Record<string, string>; mensagem?: string };

export async function criarVeiculo(_: EstadoVeiculo, form: FormData): Promise<EstadoVeiculo> {
  const { organizacao, usuario } = await exigirEquipe();
  const lido = esquemaVeiculo.safeParse(Object.fromEntries(form));
  if (!lido.success) return { erros: Object.fromEntries(lido.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const v = lido.data;

  const supabase = await supabaseServidor();
  const { data: repetido } = await supabase
    .from("veiculos")
    .select("id")
    .eq("organizacao_id", organizacao.id)
    .eq("placa", v.placa)
    .maybeSingle();
  if (repetido) return { erros: { placa: "Essa placa já está cadastrada" } };

  const { data: veiculo, error } = await supabase
    .from("veiculos")
    .insert({
      organizacao_id: organizacao.id,
      placa: v.placa,
      modelo: v.modelo,
      ano_fabricacao: v.anoFabricacao ?? null,
      ano_modelo: v.anoModelo ?? null,
      cor: v.cor || null,
      renavam: v.renavam || null,
      odometro_atual: v.odometroAtual,
    })
    .select("id")
    .single();
  if (error || !veiculo) return { mensagem: "Não foi possível salvar o veículo." };

  await supabase.from("leituras_odometro").insert({
    organizacao_id: organizacao.id,
    veiculo_id: veiculo.id,
    km: v.odometroAtual,
    origem: "manual",
    lido_em: hoje(),
  });
  await auditar({ organizacaoId: organizacao.id, usuarioId: usuario.id, acao: "veiculo.criar", entidade: "veiculos", entidadeId: veiculo.id, depois: v });
  redirect(`/painel/veiculos/${veiculo.id}`);
}

/** Status que o locador muda à mão. "Alugado" é definido pelo contrato. */
const STATUS_MANUAIS = ["disponivel", "em_manutencao", "em_recuperacao", "vendido"] as const;

export async function mudarStatusVeiculo(veiculoId: string, form: FormData) {
  const { organizacao, usuario } = await exigirEquipe();
  const status = z.enum(STATUS_MANUAIS).parse(form.get("status"));
  const supabase = await supabaseServidor();
  const { data: antes } = await supabase.from("veiculos").select("status").eq("id", veiculoId).single();
  if (!antes || antes.status === "alugado") return; // com contrato ativo, o status segue o contrato
  await supabase.from("veiculos").update({ status }).eq("id", veiculoId).eq("organizacao_id", organizacao.id);
  await auditar({ organizacaoId: organizacao.id, usuarioId: usuario.id, acao: "veiculo.status", entidade: "veiculos", entidadeId: veiculoId, antes, depois: { status } });
  revalidatePath(`/painel/veiculos/${veiculoId}`);
}

export async function registrarKm(veiculoId: string, form: FormData) {
  const { organizacao } = await exigirEquipe();
  const km = z.coerce.number().int().min(0).parse(form.get("km"));
  const supabase = await supabaseServidor();
  const { data: v } = await supabase.from("veiculos").select("odometro_atual").eq("id", veiculoId).single();
  if (!v || km < v.odometro_atual) return; // odômetro não volta; correção exige ajuste auditado (futuro)
  await supabase.from("leituras_odometro").insert({
    organizacao_id: organizacao.id,
    veiculo_id: veiculoId,
    km,
    origem: "manual",
    lido_em: hoje(),
  });
  await supabase.from("veiculos").update({ odometro_atual: km }).eq("id", veiculoId);
  revalidatePath(`/painel/veiculos/${veiculoId}`);
}

export type EstadoCrlv = { ok?: boolean; mensagem?: string };

/**
 * Envia o CRLV para a verificação do carro. O arquivo vai para o cofre de provas
 * e a equipe do Aluguei confere placa, RENAVAM e titular antes de liberar o anúncio.
 */
export async function enviarCrlv(veiculoId: string, _: EstadoCrlv, form: FormData): Promise<EstadoCrlv> {
  const { organizacao, usuario } = await exigirEquipe();
  const arquivo = form.get("crlv");
  const renavam = String(form.get("renavam") ?? "").replace(/\D/g, "");
  if (!renavamValido(renavam)) return { mensagem: "RENAVAM inválido. Confira os 11 números no documento." };
  if (!(arquivo instanceof File) || !arquivo.size) return { mensagem: "Anexe a foto ou o PDF do CRLV." };
  const supabase = await supabaseServidor();
  const { data: v } = await supabase.from("veiculos").select("id, verificacao").eq("id", veiculoId).eq("organizacao_id", organizacao.id).maybeSingle();
  if (!v) return { mensagem: "Veículo não encontrado." };
  if (v.verificacao === "verificado") return { ok: true, mensagem: "Este carro já está verificado." };
  try {
    const ev = await guardarEvidencia(arquivo, { organizacaoId: organizacao.id, enviadoPor: usuario.id, finalidade: "veiculo.crlv", veiculoId });
    const depois = { verificacao: "em_analise" as const, crlv_evidencia_id: ev.id, renavam: renavam.padStart(11, "0"), verificacao_motivo: null };
    await supabaseAdmin().from("veiculos").update(depois).eq("id", veiculoId);
    await auditar({ organizacaoId: organizacao.id, usuarioId: usuario.id, acao: "veiculo.crlv_enviado", entidade: "veiculos", entidadeId: veiculoId, depois });
  } catch (e) {
    return { mensagem: e instanceof ArquivoInvalido ? e.message : "Não foi possível enviar agora. Tente de novo." };
  }
  revalidatePath(`/painel/veiculos/${veiculoId}`);
  return { ok: true, mensagem: "Recebido! A conferência leva até 1 dia útil." };
}
