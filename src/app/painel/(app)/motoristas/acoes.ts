"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Oferta } from "@/db/schema/pessoas";
import { normalizarCelular } from "@/dominio/cadastro/telefone";
import { lerReais } from "@/dominio/dinheiro/centavos";
import { auditar } from "@/lib/auditoria";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/servidor";

const DIAS_VALIDADE_CONVITE = 7;

const reais = (rotulo: string) =>
  z.string().transform((s, ctx) => {
    const v = lerReais(s);
    if (v === null) ctx.addIssue({ code: "custom", message: `${rotulo} inválido` });
    return v ?? 0;
  });

const esquemaConvite = z.object({
  nome: z.string().trim().min(3, "Informe o nome"),
  telefone: z.string().transform((s, ctx) => {
    const t = normalizarCelular(s);
    if (!t) ctx.addIssue({ code: "custom", message: "Celular com DDD, ex.: (31) 99999-9999" });
    return t ?? "";
  }),
  veiculoId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  aluguelSemanal: reais("Valor semanal"),
  caucao: reais("Caução"),
  franquiaKmMensal: z.coerce.number().int().positive("Franquia inválida"),
  prazoMeses: z.coerce.number().int().min(1, "Mínimo 1 mês").max(36),
});

export type EstadoConvite = { erros?: Record<string, string>; mensagem?: string };

/** RF-023 + RF-020: convite direto com a oferta (veículo e condições). */
export async function convidarMotorista(_: EstadoConvite, form: FormData): Promise<EstadoConvite> {
  const { organizacao, usuario } = await exigirEquipe();
  const lido = esquemaConvite.safeParse(Object.fromEntries(form));
  if (!lido.success) return { erros: Object.fromEntries(lido.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const c = lido.data;

  const supabase = await supabaseServidor();
  const { data: existente } = await supabase
    .from("locatarios")
    .select("id")
    .eq("organizacao_id", organizacao.id)
    .eq("telefone", c.telefone)
    .in("status", ["convidado", "em_cadastro", "em_analise"])
    .maybeSingle();
  if (existente) return { erros: { telefone: "Já existe um convite em aberto para esse celular" } };

  const oferta: Oferta = {
    aluguelSemanal: c.aluguelSemanal,
    caucao: c.caucao,
    franquiaKmMensal: c.franquiaKmMensal,
    prazoMeses: c.prazoMeses,
  };
  const expira = new Date(Date.now() + DIAS_VALIDADE_CONVITE * 86_400_000);

  const { data: locatario, error } = await supabase
    .from("locatarios")
    .insert({
      organizacao_id: organizacao.id,
      nome: c.nome,
      telefone: c.telefone,
      token_convite: randomBytes(18).toString("base64url"),
      convite_expira_em: expira.toISOString(),
      veiculo_ofertado_id: c.veiculoId ?? null,
      oferta: { ...oferta },
    })
    .select("id")
    .single();
  if (error || !locatario) return { mensagem: "Não foi possível criar o convite." };

  await auditar({ organizacaoId: organizacao.id, usuarioId: usuario.id, acao: "locatario.convidar", entidade: "locatarios", entidadeId: locatario.id, depois: { ...c } });
  redirect(`/painel/motoristas/${locatario.id}`);
}

const esquemaDecisao = z.discriminatedUnion("decisao", [
  z.object({ decisao: z.literal("aprovado"), motivo: z.string().trim().optional() }),
  z.object({ decisao: z.literal("recusado"), motivo: z.string().trim().min(5, "Registre o motivo da recusa") }),
]);

export type EstadoDecisao = { erro?: string };

/** RF-022: o locador decide e o motivo fica registrado (cláusula 1.3). */
export async function decidirCadastro(locatarioId: string, _: EstadoDecisao, form: FormData): Promise<EstadoDecisao> {
  const { organizacao, usuario } = await exigirEquipe();
  const lido = esquemaDecisao.safeParse(Object.fromEntries(form));
  if (!lido.success) return { erro: lido.error.issues[0]?.message };

  const supabase = await supabaseServidor();
  const { data: antes } = await supabase.from("locatarios").select("status").eq("id", locatarioId).single();
  if (antes?.status !== "em_analise") return { erro: "Esse cadastro não está aguardando análise." };

  const { error } = await supabase
    .from("locatarios")
    .update({
      status: lido.data.decisao,
      motivo_decisao: lido.data.motivo || null,
      decidido_por: usuario.id,
      decidido_em: new Date().toISOString(),
    })
    .eq("id", locatarioId)
    .eq("organizacao_id", organizacao.id);
  if (error) return { erro: "Não foi possível salvar a decisão." };

  await auditar({ organizacaoId: organizacao.id, usuarioId: usuario.id, acao: `locatario.${lido.data.decisao}`, entidade: "locatarios", entidadeId: locatarioId, antes, depois: lido.data });
  revalidatePath(`/painel/motoristas/${locatarioId}`);
  return {};
}

/** Gera um novo link (o anterior deixa de valer). */
export async function renovarConvite(locatarioId: string) {
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  await supabase
    .from("locatarios")
    .update({
      token_convite: randomBytes(18).toString("base64url"),
      convite_expira_em: new Date(Date.now() + DIAS_VALIDADE_CONVITE * 86_400_000).toISOString(),
    })
    .eq("id", locatarioId)
    .eq("organizacao_id", organizacao.id)
    .in("status", ["convidado", "em_cadastro"]);
  revalidatePath(`/painel/motoristas/${locatarioId}`);
}
