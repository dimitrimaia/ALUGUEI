import { boolean, integer, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { criadoEm, id } from "./comum";

/** O locador (PF ou PJ). É o tenant: cada um tem sua subconta no provedor de pagamento. */
export const organizacoes = pgTable("organizacoes", {
  id: id(),
  nome: text("nome").notNull(),
  documento: text("documento").notNull(), // CPF ou CNPJ
  cidade: text("cidade").notNull(),
  uf: text("uf").notNull(),
  subcontaPagamentoId: text("subconta_pagamento_id"),
  /** Enquanto ligado, cobranças extras e notificações formais passam pela fila de aprovação. */
  modoAssistido: boolean("modo_assistido").notNull().default(true),
  /** Mensalidade por carro com contrato ativo, cobrada por split em cada aluguel pago. */
  mensalidadePorCarro: integer("mensalidade_por_carro_centavos").notNull().default(25000),
  /** Pix direto (sem gateway): chave Pix do locador para o QR Code estático. Sem baixa automática. */
  chavePixDireto: text("chave_pix_direto"),
  criadoEm: criadoEm(),
});

export const papelMembro = pgEnum("papel_membro", ["dono", "operador"]);

/** Usuários (auth.users do Supabase) que operam a conta do locador (RF-002). */
export const membros = pgTable(
  "membros",
  {
    id: id(),
    organizacaoId: uuid("organizacao_id").notNull().references(() => organizacoes.id),
    usuarioId: uuid("usuario_id").notNull(),
    papel: papelMembro("papel").notNull(),
    criadoEm: criadoEm(),
  },
  (t) => [uniqueIndex("membros_org_usuario").on(t.organizacaoId, t.usuarioId)],
);
