import { date, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { criadoEm, id, organizacaoId } from "./comum";
import { contratos } from "./contratos";

export const tipoObrigacao = pgEnum("tipo_obrigacao", ["aluguel", "caucao_parcela", "checkin"]);
export const statusObrigacao = pgEnum("status_obrigacao", ["pendente", "cumprida", "atrasada", "cancelada", "isenta"]);

/** Agenda gerada na assinatura (gerarAgenda). A chave única impede cobrança dupla (RNF-032). */
export const obrigacoes = pgTable(
  "obrigacoes",
  {
    id: id(),
    organizacaoId: organizacaoId(),
    contratoId: uuid("contrato_id").notNull().references(() => contratos.id),
    chave: text("chave").notNull(),
    tipo: tipoObrigacao("tipo").notNull(),
    vencimento: date("vencimento").notNull(),
    valor: integer("valor_centavos"),
    periodoInicio: date("periodo_inicio"),
    periodoFim: date("periodo_fim"),
    status: statusObrigacao("status").notNull().default("pendente"),
    /** Pix direto: o motorista avisou que pagou; o locador confirma ao ver o dinheiro na conta. */
    pagamentoInformadoEm: timestamp("pagamento_informado_em", { withTimezone: true }),
    criadoEm: criadoEm(),
  },
  (t) => [uniqueIndex("obrigacoes_chave").on(t.chave), index("obrigacoes_vencimento").on(t.vencimento, t.status)],
);

export const tipoLancamento = pgEnum("tipo_lancamento", [
  "aluguel", "caucao", "multa_mora", "juros_mora", "correcao", "km_excedente",
  "cobranca_extra", "lucros_cessantes", "multa_transito", "taxa_administracao",
  "desconto", "isencao", "pagamento", "estorno", "uso_caucao", "devolucao_caucao",
]);

/**
 * Extrato único (RF-059). Débitos positivos, créditos negativos, em centavos.
 * Lançamento não se edita nem se apaga: corrige-se com outro lançamento.
 */
export const lancamentos = pgTable(
  "lancamentos",
  {
    id: id(),
    organizacaoId: organizacaoId(),
    contratoId: uuid("contrato_id").notNull().references(() => contratos.id),
    tipo: tipoLancamento("tipo").notNull(),
    valor: integer("valor_centavos").notNull(),
    competencia: date("competencia").notNull(),
    descricao: text("descricao").notNull(),
    justificativa: text("justificativa"), // obrigatória para cobrança extra (RF-056)
    obrigacaoId: uuid("obrigacao_id").references(() => obrigacoes.id),
    lancamentoOrigemId: uuid("lancamento_origem_id"),
    evidenciaIds: jsonb("evidencia_ids").$type<string[]>(),
    /** Chave de idempotência de quem gerou o lançamento (job, webhook, usuário). */
    chave: text("chave").notNull(),
    criadoPor: uuid("criado_por"),
    aprovadoPor: uuid("aprovado_por"),
    criadoEm: criadoEm(),
  },
  (t) => [uniqueIndex("lancamentos_chave").on(t.chave), index("lancamentos_contrato").on(t.contratoId)],
);

/** Cobrança emitida no provedor (Pix/boleto) para uma ou mais obrigações. */
export const cobrancas = pgTable(
  "cobrancas",
  {
    id: id(),
    organizacaoId: organizacaoId(),
    contratoId: uuid("contrato_id").notNull().references(() => contratos.id),
    obrigacaoId: uuid("obrigacao_id").references(() => obrigacoes.id),
    provedor: text("provedor").notNull(),
    provedorId: text("provedor_id"),
    valor: integer("valor_centavos").notNull(),
    vencimento: date("vencimento").notNull(),
    /** Parte da plataforma nesta cobrança (taxaPlataformaDoPeriodo). Zero em caução, multa e juros. */
    splitPlataforma: integer("split_plataforma_centavos").notNull().default(0),
    status: text("status").notNull().default("emitida"),
    pixCopiaECola: text("pix_copia_e_cola"),
    pixQrCode: text("pix_qr_code"), // imagem PNG em base64
    valorPago: integer("valor_pago_centavos"),
    linkPagamento: text("link_pagamento"),
    pagoEm: timestamp("pago_em", { withTimezone: true }),
    criadoEm: criadoEm(),
  },
  (t) => [uniqueIndex("cobrancas_provedor").on(t.provedor, t.provedorId)],
);

/** Todo webhook recebido, antes de processar. O índice único faz a deduplicação (RNF-033). */
export const webhookEventos = pgTable(
  "webhook_eventos",
  {
    id: id(),
    provedor: text("provedor").notNull(),
    eventoId: text("evento_id").notNull(),
    tipo: text("tipo").notNull(),
    corpo: jsonb("corpo").notNull(),
    recebidoEm: timestamp("recebido_em", { withTimezone: true }).notNull().defaultNow(),
    processadoEm: timestamp("processado_em", { withTimezone: true }),
    erro: text("erro"),
  },
  (t) => [uniqueIndex("webhook_eventos_unico").on(t.provedor, t.eventoId)],
);

/**
 * Conta de recebimento do locador no provedor (subconta Asaas). A chave de API
 * da subconta fica cifrada (AES-256-GCM) e só o servidor lê: sem políticas de RLS.
 */
export const contasPagamento = pgTable(
  "contas_pagamento",
  {
    id: id(),
    organizacaoId: organizacaoId(),
    provedor: text("provedor").notNull(),
    contaId: text("conta_id").notNull(),
    walletId: text("wallet_id").notNull(),
    chaveApiCifrada: text("chave_api_cifrada").notNull(),
    status: text("status").notNull().default("ativa"),
    dados: jsonb("dados"),
    criadoEm: criadoEm(),
  },
  (t) => [uniqueIndex("contas_pagamento_org").on(t.organizacaoId, t.provedor)],
);

/** Cliente (o motorista) cadastrado na subconta do locador. */
export const clientesPagamento = pgTable(
  "clientes_pagamento",
  {
    id: id(),
    organizacaoId: organizacaoId(),
    locatarioId: uuid("locatario_id").notNull(),
    provedor: text("provedor").notNull(),
    clienteId: text("cliente_id").notNull(),
    criadoEm: criadoEm(),
  },
  (t) => [uniqueIndex("clientes_pagamento_unico").on(t.locatarioId, t.provedor)],
);
