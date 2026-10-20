"use server";

import { revalidatePath } from "next/cache";
import { hoje } from "@/dominio/datas/data";
import { receberEmDinheiro } from "@/integracoes/asaas";
import { auditar } from "@/lib/auditoria";
import { conciliar, contaDoLocador, emitirCobranca } from "@/lib/cobrancas";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/servidor";

export type EstadoAcaoCobranca = { erro?: string; ok?: string };

/** Gera o Pix de uma obrigação agora, sem esperar a rotina diária. */
export async function gerarPix(obrigacaoId: string): Promise<EstadoAcaoCobranca> {
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const { data: o } = await supabase.from("obrigacoes").select("id, contrato_id").eq("id", obrigacaoId).eq("organizacao_id", organizacao.id).maybeSingle();
  if (!o) return { erro: "Cobrança não encontrada." };
  try {
    await emitirCobranca(o.id);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não foi possível gerar o Pix." };
  }
  revalidatePath(`/painel/contratos/${o.contrato_id}`);
  revalidatePath("/painel/financeiro");
  return { ok: "Pix gerado." };
}

/** Baixa manual: o motorista pagou por fora (dinheiro, outro Pix). Fica auditado. */
export async function registrarPagamentoPorFora(cobrancaId: string): Promise<EstadoAcaoCobranca> {
  const { organizacao, usuario, papel } = await exigirEquipe();
  if (papel !== "dono") return { erro: "Só o dono da conta pode registrar pagamento por fora." };
  const supabase = await supabaseServidor();
  const { data: cob } = await supabase.from("cobrancas").select("*").eq("id", cobrancaId).eq("organizacao_id", organizacao.id).maybeSingle();
  if (!cob || !cob.provedor_id) return { erro: "Cobrança não encontrada." };
  if (cob.status === "paga") return { ok: "Já estava paga." };
  const conta = await contaDoLocador(organizacao.id);
  if (!conta) return { erro: "Recebimentos não configurados." };
  await receberEmDinheiro(conta.chaveApi, cob.provedor_id, hoje(), cob.valor_centavos);
  await conciliar(cob);
  await auditar({ organizacaoId: organizacao.id, usuarioId: usuario.id, acao: "cobranca.baixa_manual", entidade: "cobrancas", entidadeId: cob.id, depois: { valor: cob.valor_centavos } });
  revalidatePath("/painel/financeiro");
  revalidatePath(`/painel/contratos/${cob.contrato_id}`);
  return { ok: "Pagamento registrado." };
}

/** "Atualizar": consulta no Asaas as cobranças em aberto deste locador. */
export async function atualizarCobrancas(): Promise<EstadoAcaoCobranca> {
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const { data } = await supabase.from("cobrancas").select("*").eq("organizacao_id", organizacao.id).in("status", ["emitida", "vencida"]);
  for (const c of data ?? []) await conciliar(c).catch(() => null);
  revalidatePath("/painel/financeiro");
  return { ok: "Atualizado." };
}
