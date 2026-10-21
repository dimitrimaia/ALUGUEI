"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Database } from "@/db/tipos";
import { data, hoje } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { MOTIVOS_ENCERRAMENTO, type MotivoEncerramento, calcularEncerramento } from "@/dominio/encerramento/demonstrativo";
import { auditar } from "@/lib/auditoria";
import { dadosEncerramento } from "@/lib/encerramento";
import { notificar, usuarioDoContrato } from "@/lib/notificacoes";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

const esquema = z.object({
  motivo: z.enum(Object.keys(MOTIVOS_ENCERRAMENTO) as [MotivoEncerramento, ...MotivoEncerramento[]]),
  devolucao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  outras: z.array(z.object({ tipo: z.enum(["avaria", "combustivel", "multa_rescisoria", "outro"]), descricao: z.string().trim().min(3).max(200), valor: z.number().int().min(0).max(10_000_000) })).max(20),
});

export type ResultadoEncerramento = { erro?: string };

/**
 * Encerra o contrato com o demonstrativo da devolução. Decisão humana do dono
 * da conta, com confirmação: o app nunca encerra ou rescinde sozinho.
 */
export async function concluirEncerramento(contratoId: string, entrada: z.input<typeof esquema>): Promise<ResultadoEncerramento> {
  const { organizacao, usuario, papel } = await exigirEquipe();
  if (papel !== "dono") return { erro: "Só o dono da conta encerra contratos." };
  const lido = esquema.safeParse(entrada);
  if (!lido.success) return { erro: "Confira os valores e as descrições das pendências." };
  const devolucao = data(lido.data.devolucao);
  if (devolucao > hoje()) return { erro: "A data da devolução não pode ser no futuro." };

  const d = await dadosEncerramento(contratoId, organizacao.id, devolucao);
  if (!d) return { erro: "Contrato não encontrado." };
  if (d.contrato.status !== "ativo") return { erro: "Este contrato não está ativo." };
  if (!d.entrega || !d.devolucao) return { erro: "Faça a vistoria de devolução antes de encerrar." };
  if (devolucao < d.parametros.inicio) return { erro: "A devolução não pode ser antes do início do contrato." };

  const dem = calcularEncerramento({
    parametros: d.parametros,
    devolucao,
    kmEntrega: d.entrega.odometro,
    kmDevolucao: d.devolucao.odometro,
    saldoAberto: d.saldoAberto,
    caucaoLancada: d.caucaoLancada,
    caucaoPaga: d.caucaoPaga,
    outras: lido.data.outras,
    calendario: { incluirBancarios: true },
  });

  const admin = supabaseAdmin();
  const base = { organizacao_id: organizacao.id, contrato_id: contratoId, competencia: devolucao, criado_por: usuario.id };
  const lancamentos: Database["public"]["Tables"]["lancamentos"]["Insert"][] = [
    // Aluguéis vencidos até a devolução que ainda não tinham sido lançados (mesma chave da cobrança: nunca duplica).
    ...d.aluguelNaoLancado.map((o) => ({ ...base, tipo: "aluguel" as const, valor_centavos: o.valor_centavos ?? 0, competencia: o.vencimento, descricao: "Aluguel em aberto até a devolução", obrigacao_id: o.id, chave: `${o.chave}:debito` })),
    ...(dem.estornoCaucaoNaoPaga > 0 ? [{ ...base, tipo: "estorno" as const, valor_centavos: -dem.estornoCaucaoNaoPaga, descricao: "Caução lançada e não paga, cancelada no encerramento", chave: `encerramento:${contratoId}:estorno-caucao` }] : []),
    ...dem.pendencias.map((p, i) => ({
      ...base,
      tipo: p.tipo === "km_excedente" ? ("km_excedente" as const) : ("cobranca_extra" as const),
      valor_centavos: p.valor,
      descricao: p.tipo === "km_excedente" ? "Km excedente" : p.descricao,
      justificativa: p.descricao,
      evidencia_ids: p.tipo === "avaria" ? Object.values(d.checklistDevolucao?.fotos ?? {}) : null,
      chave: `encerramento:${contratoId}:pendencia:${i}`,
      aprovado_por: usuario.id,
    })),
    ...(dem.usoCaucao > 0 ? [{ ...base, tipo: "uso_caucao" as const, valor_centavos: -dem.usoCaucao, descricao: "Caução usada para quitar as pendências", chave: `encerramento:${contratoId}:uso-caucao` }] : []),
  ];
  // Primeiro fecha o contrato (só se ainda estiver ativo: dois cliques não encerram duas vezes).
  const rescisao = MOTIVOS_ENCERRAMENTO[lido.data.motivo].rescisao;
  const { data: fechado, error: erroContrato } = await admin
    .from("contratos")
    .update({ status: rescisao ? "rescindido" : "encerrado", encerramento_motivo: lido.data.motivo, encerrado_em: new Date().toISOString(), devolucao_em: devolucao, caucao_devolver_centavos: dem.devolverAoMotorista, caucao_devolver_ate: dem.devolverAte })
    .eq("id", contratoId)
    .eq("status", "ativo")
    .select("id");
  if (erroContrato || !fechado?.length) return { erro: erroContrato ? "Não foi possível encerrar. Rodou a migração 0006?" : "Este contrato já foi encerrado." };

  const { error } = await admin.from("lancamentos").upsert(lancamentos, { onConflict: "chave", ignoreDuplicates: true });
  if (error) return { erro: "O contrato foi encerrado, mas o demonstrativo não foi lançado. Fale com o suporte para concluir." };

  await Promise.all([
    admin.from("vistorias").update({ pendencias: JSON.parse(JSON.stringify({ ...dem, motivo: lido.data.motivo })) }).eq("id", d.devolucao.id),
    d.obrigacoesFuturas.length ? admin.from("obrigacoes").update({ status: "cancelada" }).in("id", d.obrigacoesFuturas) : Promise.resolve(),
    admin.from("veiculos").update({ status: "disponivel", odometro_atual: d.devolucao.odometro }).eq("id", d.contrato.veiculo_id),
  ]);
  await auditar({ organizacaoId: organizacao.id, usuarioId: usuario.id, acao: rescisao ? "contrato.rescindir" : "contrato.encerrar", entidade: "contratos", entidadeId: contratoId, depois: { motivo: lido.data.motivo, devolucao, totalDevido: dem.totalDevido, devolverAoMotorista: dem.devolverAoMotorista, saldoFinal: dem.saldoFinal } });

  const motorista = await usuarioDoContrato(contratoId);
  if (motorista) {
    await notificar({
      usuarioId: motorista,
      organizacaoId: organizacao.id,
      contratoId,
      modelo: "contrato.encerrado",
      titulo: "Contrato encerrado",
      texto: dem.devolverAoMotorista > 0 ? `Devolução registrada. ${formatarBRL(dem.devolverAoMotorista)} da caução voltam para você até ${devolucaoTexto(dem.devolverAte)}.` : dem.saldoFinal > 0 ? `Devolução registrada. Ficou um saldo de ${formatarBRL(dem.saldoFinal)} depois de usar a caução.` : "Devolução registrada. Veja o demonstrativo no app.",
      link: `/m/contrato/${contratoId}`,
      assunto: "formal",
      porEmail: true,
      chave: `contrato:${contratoId}:encerrado`,
    });
  }
  revalidatePath(`/painel/contratos/${contratoId}`);
  revalidatePath("/painel");
  redirect(`/painel/contratos/${contratoId}/encerrar`);
}

function devolucaoTexto(iso: string) {
  return iso.split("-").reverse().join("/");
}

/** O locador confirma que devolveu a caução (Pix ou transferência para o motorista). */
export async function confirmarDevolucaoCaucao(contratoId: string): Promise<{ ok?: string; erro?: string }> {
  const { organizacao, usuario, papel } = await exigirEquipe();
  if (papel !== "dono") return { erro: "Só o dono da conta confirma a devolução." };
  const admin = supabaseAdmin();
  const { data: c } = await admin.from("contratos").select("caucao_devolver_centavos, caucao_devolvida_em, status").eq("id", contratoId).eq("organizacao_id", organizacao.id).single();
  if (!c || !["encerrado", "rescindido"].includes(c.status)) return { erro: "O contrato ainda não foi encerrado." };
  if (c.caucao_devolvida_em) return { ok: "Já estava confirmada." };
  await admin.from("contratos").update({ caucao_devolvida_em: new Date().toISOString() }).eq("id", contratoId);
  await auditar({ organizacaoId: organizacao.id, usuarioId: usuario.id, acao: "contrato.caucao_devolvida", entidade: "contratos", entidadeId: contratoId, depois: { valor: c.caucao_devolver_centavos } });
  const motorista = await usuarioDoContrato(contratoId);
  if (motorista) await notificar({ usuarioId: motorista, organizacaoId: organizacao.id, contratoId, modelo: "caucao.devolvida", titulo: "Caução devolvida", texto: `O locador informou que devolveu ${formatarBRL(c.caucao_devolver_centavos ?? 0)} da caução. Confira na sua conta.`, link: `/m/contrato/${contratoId}`, assunto: "formal", porEmail: true, chave: `contrato:${contratoId}:caucao-devolvida` });
  revalidatePath(`/painel/contratos/${contratoId}/encerrar`);
  return { ok: "Devolução da caução registrada." };
}
