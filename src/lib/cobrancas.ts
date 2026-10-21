import "server-only";
import type { Database, Linha } from "@/db/tipos";
import type { ParametrosContrato } from "@/dominio/contrato/parametros";
import { type DataISO, data as lerData, diasEntre, hoje } from "@/dominio/datas/data";
import { separarEncargos } from "@/dominio/financeiro/extrato";
import { taxaPlataformaDoPeriodo } from "@/dominio/plataforma/taxa";
import {
  type CobrancaAsaas,
  type DadosSubconta,
  cobrancasPorReferencia,
  consultarCobranca,
  criarChavePixAleatoria,
  criarCliente,
  criarCobrancaPix,
  criarSubconta,
  estaPaga,
  listarChavesPix,
  qrCodePix,
  valorEmCentavos,
  walletPlataforma,
} from "@/integracoes/asaas";
import { auditar } from "./auditoria";
import { cifrar, decifrar } from "./cifra";
import { supabaseAdmin } from "./supabase/admin";
import { notificar, notificarEquipe, usuarioDoContrato } from "./notificacoes";
import { formatarBRL } from "@/dominio/dinheiro/centavos";

const PROVEDOR = "asaas";

export class PixIndisponivel extends Error {}

/**
 * Garante uma chave Pix ativa na subconta. Logo depois de aprovada, a conta
 * leva alguns minutos para liberar o Pix; até lá, avisamos em vez de falhar.
 */
export async function garantirPixAtivo(chaveApi: string): Promise<boolean> {
  if ((await listarChavesPix(chaveApi)).length) return true;
  try {
    await criarChavePixAleatoria(chaveApi);
    return true;
  } catch {
    return false;
  }
}

export async function contaDoLocador(organizacaoId: string) {
  const { data } = await supabaseAdmin().from("contas_pagamento").select("*").eq("organizacao_id", organizacaoId).eq("provedor", PROVEDOR).maybeSingle();
  return data ? { ...data, chaveApi: decifrar(data.chave_api_cifrada) } : null;
}

/** Cria a subconta do locador e a chave Pix dela. Feito uma vez, no cadastro de recebimentos. */
export async function configurarRecebimentos(organizacaoId: string, usuarioId: string, dados: DadosSubconta) {
  const existente = await contaDoLocador(organizacaoId);
  if (existente) return existente;
  const sub = await criarSubconta(dados);
  const admin = supabaseAdmin();
  const { error } = await admin.from("contas_pagamento").insert({
    organizacao_id: organizacaoId,
    provedor: PROVEDOR,
    conta_id: sub.contaId,
    wallet_id: sub.walletId,
    chave_api_cifrada: cifrar(sub.chaveApi),
    dados: { email: dados.email, celular: dados.celular },
  });
  if (error) throw new Error(`Subconta criada (${sub.contaId}), mas não foi salva: ${error.message}`);
  await admin.from("organizacoes").update({ subconta_pagamento_id: sub.contaId }).eq("id", organizacaoId);
  try {
    await criarChavePixAleatoria(sub.chaveApi);
  } catch {
    // Em produção a chave Pix só sai depois da aprovação da conta; tentamos de novo na primeira cobrança.
  }
  await auditar({ organizacaoId, usuarioId, acao: "recebimentos.configurar", entidade: "contas_pagamento", depois: { contaId: sub.contaId, walletId: sub.walletId } });
  return contaDoLocador(organizacaoId);
}

async function garantirCliente(organizacaoId: string, chaveApi: string, l: Linha<"locatarios">) {
  const admin = supabaseAdmin();
  const { data } = await admin.from("clientes_pagamento").select("cliente_id").eq("locatario_id", l.id).eq("provedor", PROVEDOR).maybeSingle();
  if (data) return data.cliente_id;
  if (!l.cpf) throw new Error("O motorista ainda não informou o CPF.");
  const clienteId = await criarCliente(chaveApi, { nome: l.nome, cpf: l.cpf, celular: l.telefone, email: l.email, referencia: l.id });
  await admin.from("clientes_pagamento").upsert({ organizacao_id: organizacaoId, locatario_id: l.id, provedor: PROVEDOR, cliente_id: clienteId }, { onConflict: "locatario_id,provedor", ignoreDuplicates: true });
  return clienteId;
}

const DESCRICAO: Record<string, string> = { aluguel: "Aluguel semanal", caucao_parcela: "Parcela da caução" };

/**
 * Emite (ou devolve a já emitida) cobrança Pix de uma obrigação. Idempotente:
 * a chave da obrigação é a referência no Asaas e no banco (RNF-032).
 */
export async function emitirCobranca(obrigacaoId: string): Promise<Linha<"cobrancas">> {
  const admin = supabaseAdmin();
  const { data: existente } = await admin.from("cobrancas").select("*").eq("obrigacao_id", obrigacaoId).neq("status", "cancelada").maybeSingle();
  if (existente) return garantirQrCode(existente);

  const { data: o } = await admin.from("obrigacoes").select("*").eq("id", obrigacaoId).single();
  if (!o || o.valor_centavos === null || !["aluguel", "caucao_parcela"].includes(o.tipo)) throw new Error("Obrigação sem cobrança.");
  if (o.status === "cumprida") throw new Error("Obrigação já paga.");
  const { data: c } = await admin.from("contratos").select("*").eq("id", o.contrato_id).single();
  const { data: l } = c ? await admin.from("locatarios").select("*").eq("id", c.locatario_id).single() : { data: null };
  if (!c || !l) throw new Error("Contrato não encontrado.");
  const conta = await contaDoLocador(o.organizacao_id);
  if (!conta) throw new Error("O locador ainda não configurou os recebimentos.");

  const p = c.parametros as unknown as ParametrosContrato;
  const { data: org } = await admin.from("organizacoes").select("mensalidade_por_carro_centavos").eq("id", o.organizacao_id).single();
  const split =
    o.tipo === "aluguel" && o.periodo_inicio && o.periodo_fim
      ? taxaPlataformaDoPeriodo(org?.mensalidade_por_carro_centavos ?? 25000, diasEntre(lerData(o.periodo_inicio), lerData(o.periodo_fim)))
      : 0;

  if (!(await garantirPixAtivo(conta.chaveApi))) {
    throw new PixIndisponivel("O Pix do locador ainda está sendo liberado pelo banco. Tente de novo em alguns minutos.");
  }
  const clienteId = await garantirCliente(o.organizacao_id, conta.chaveApi, l);
  const [jaCriada] = await cobrancasPorReferencia(conta.chaveApi, o.chave);
  const vencimento = (o.vencimento < hoje() ? hoje() : o.vencimento) as DataISO;
  const cob =
    jaCriada ??
    (await criarCobrancaPix(conta.chaveApi, {
      cliente: clienteId,
      valor: o.valor_centavos,
      vencimento,
      descricao: `${DESCRICAO[o.tipo]} · vencimento ${o.vencimento.split("-").reverse().join("/")}`,
      referencia: o.chave,
      multaBps: p.encargos.multaBps,
      jurosMensaisBps: p.encargos.jurosMensaisBps,
      split: split ? { walletId: walletPlataforma(), valor: split } : undefined,
    }));

  const { data: nova, error } = await admin
    .from("cobrancas")
    .upsert(
      {
        organizacao_id: o.organizacao_id,
        contrato_id: o.contrato_id,
        obrigacao_id: o.id,
        provedor: PROVEDOR,
        provedor_id: cob.id,
        valor_centavos: o.valor_centavos,
        vencimento: o.vencimento,
        split_plataforma_centavos: split,
        link_pagamento: cob.invoiceUrl,
        status: "emitida",
      },
      { onConflict: "provedor,provedor_id" },
    )
    .select("*")
    .single();
  if (error || !nova) throw new Error(`Falha ao salvar cobrança: ${error?.message}`);

  await admin.from("lancamentos").upsert(
    {
      organizacao_id: o.organizacao_id,
      contrato_id: o.contrato_id,
      tipo: o.tipo === "aluguel" ? "aluguel" : "caucao",
      valor_centavos: o.valor_centavos,
      competencia: o.vencimento,
      descricao: o.tipo === "aluguel" && o.periodo_inicio && o.periodo_fim ? `Aluguel de ${fmt(o.periodo_inicio)} a ${fmt(o.periodo_fim)}` : DESCRICAO[o.tipo]!,
      obrigacao_id: o.id,
      chave: `${o.chave}:debito`,
    },
    { onConflict: "chave", ignoreDuplicates: true },
  );
  return garantirQrCode(nova);
}

const fmt = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

/** O QR Code às vezes demora a ficar disponível; buscamos de novo até conseguir. */
export async function garantirQrCode(cob: Linha<"cobrancas">): Promise<Linha<"cobrancas">> {
  if (cob.pix_copia_e_cola || cob.status !== "emitida" || !cob.provedor_id) return cob;
  const conta = await contaDoLocador(cob.organizacao_id);
  if (!conta) return cob;
  try {
    const qr = await qrCodePix(conta.chaveApi, cob.provedor_id);
    const { data } = await supabaseAdmin()
      .from("cobrancas")
      .update({ pix_copia_e_cola: qr.copiaECola, pix_qr_code: qr.imagemBase64 })
      .eq("id", cob.id)
      .select("*")
      .single();
    return data ?? cob;
  } catch (e) {
    if (String(e).includes("chave Pix")) {
      await criarChavePixAleatoria(conta.chaveApi).catch(() => {});
    }
    return cob;
  }
}

/**
 * Aplica no extrato o estado atual de uma cobrança no Asaas. Idempotente: usado
 * pelo webhook, pela conciliação diária e pelo botão "Já paguei".
 */
export async function aplicarSituacao(cob: Linha<"cobrancas">, remota: CobrancaAsaas) {
  const admin = supabaseAdmin();
  if (cob.status === "paga") return;
  if (["REFUNDED", "DELETED"].includes(remota.status)) {
    await admin.from("cobrancas").update({ status: remota.status === "REFUNDED" ? "estornada" : "cancelada" }).eq("id", cob.id);
    return;
  }
  if (!estaPaga(remota.status)) {
    if (remota.status === "OVERDUE" && cob.status !== "vencida") await admin.from("cobrancas").update({ status: "vencida" }).eq("id", cob.id);
    return;
  }

  const valorPago = valorEmCentavos(remota.value);
  const pagoEm = (remota.clientPaymentDate ?? remota.paymentDate ?? hoje()) as DataISO;
  const { data: c } = await admin.from("contratos").select("parametros").eq("id", cob.contrato_id).single();
  const p = c?.parametros as unknown as ParametrosContrato;
  const { multa, juros } = separarEncargos(cob.valor_centavos, valorPago, lerData(cob.vencimento), lerData(pagoEm), p.encargos);

  await admin.from("cobrancas").update({ status: "paga", valor_pago_centavos: valorPago, pago_em: new Date(`${pagoEm}T12:00:00-03:00`).toISOString() }).eq("id", cob.id);
  if (cob.obrigacao_id) await admin.from("obrigacoes").update({ status: "cumprida" }).eq("id", cob.obrigacao_id);

  const base = { organizacao_id: cob.organizacao_id, contrato_id: cob.contrato_id, obrigacao_id: cob.obrigacao_id, competencia: pagoEm };
  const lancamentos: Database["public"]["Tables"]["lancamentos"]["Insert"][] = [];
  if (multa > 0) lancamentos.push({ ...base, tipo: "multa_mora" as const, valor_centavos: multa, descricao: "Multa por atraso", chave: `multa:${remota.id}` });
  if (juros > 0) lancamentos.push({ ...base, tipo: "juros_mora" as const, valor_centavos: juros, descricao: "Juros por atraso", chave: `juros:${remota.id}` });
  lancamentos.push({ ...base, tipo: "pagamento" as const, valor_centavos: -valorPago, descricao: remota.status === "RECEIVED_IN_CASH" ? "Pagamento registrado pelo locador" : "Pagamento via Pix", chave: `pagamento:${remota.id}` });
  await admin.from("lancamentos").upsert(lancamentos, { onConflict: "chave", ignoreDuplicates: true });

  const valor = formatarBRL(valorPago);
  const motorista = await usuarioDoContrato(cob.contrato_id);
  await Promise.all([
    notificarEquipe(cob.organizacao_id, { contratoId: cob.contrato_id, modelo: "pagamento.recebido", titulo: `Pagamento recebido: ${valor}`, texto: "O Pix caiu e a cobrança já foi baixada.", link: `/painel/contratos/${cob.contrato_id}`, assunto: "lembretes", chave: `pago:${remota.id}` }),
    motorista ? notificar({ usuarioId: motorista, organizacaoId: cob.organizacao_id, contratoId: cob.contrato_id, modelo: "pagamento.confirmado", titulo: `Pagamento confirmado: ${valor}`, texto: "Obrigado! O comprovante está no seu extrato.", link: "/m/extrato", assunto: "lembretes", chave: `pago:${remota.id}` }) : Promise.resolve(),
  ]);
}

export async function conciliar(cob: Linha<"cobrancas">) {
  if (!cob.provedor_id) return cob;
  const conta = await contaDoLocador(cob.organizacao_id);
  if (!conta) return cob;
  await aplicarSituacao(cob, await consultarCobranca(conta.chaveApi, cob.provedor_id));
  const { data } = await supabaseAdmin().from("cobrancas").select("*").eq("id", cob.id).single();
  return data ?? cob;
}
