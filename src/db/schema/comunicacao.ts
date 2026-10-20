import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { criadoEm, id, organizacaoId } from "./comum";
import { contratos } from "./contratos";

export const canalNotificacao = pgEnum("canal_notificacao", ["app", "push", "email", "whatsapp"]);

/** RF-111: toda notificação guardada com texto, canal, horários e status de entrega/leitura. */
export const notificacoes = pgTable(
  "notificacoes",
  {
    id: id(),
    organizacaoId: organizacaoId(),
    contratoId: uuid("contrato_id").references(() => contratos.id),
    destinatarioUsuarioId: uuid("destinatario_usuario_id"),
    canal: canalNotificacao("canal").notNull(),
    formal: boolean("formal").notNull().default(false), // notificação formal da régua
    modelo: text("modelo").notNull(),
    texto: text("texto").notNull(),
    chave: text("chave").notNull(), // idempotência: um lembrete por obrigação e etapa
    provedorId: text("provedor_id"),
    enviadaEm: timestamp("enviada_em", { withTimezone: true }),
    entregueEm: timestamp("entregue_em", { withTimezone: true }),
    lidaEm: timestamp("lida_em", { withTimezone: true }),
    falha: text("falha"),
    criadoEm: criadoEm(),
  },
  (t) => [uniqueIndex("notificacoes_chave").on(t.chave), index("notificacoes_contrato").on(t.contratoId)],
);

/**
 * Fila de aprovação do "modo assistido" e das sugestões drásticas (RF-067):
 * o sistema propõe, um humano aprova ou recusa.
 */
export const acoesPendentes = pgTable("acoes_pendentes", {
  id: id(),
  organizacaoId: organizacaoId(),
  contratoId: uuid("contrato_id").references(() => contratos.id),
  tipo: text("tipo").notNull(), // cobranca_extra | notificacao_formal | sugestao_rescisao | aviso_protesto
  proposta: jsonb("proposta").notNull(),
  motivo: text("motivo").notNull(),
  status: text("status").notNull().default("pendente"),
  decididoPor: uuid("decidido_por"),
  decididoEm: timestamp("decidido_em", { withTimezone: true }),
  criadoEm: criadoEm(),
});

/** RNF-007: log só de inserção para ações sensíveis. */
export const auditoria = pgTable(
  "auditoria",
  {
    id: id(),
    organizacaoId: uuid("organizacao_id"),
    usuarioId: uuid("usuario_id"),
    acao: text("acao").notNull(),
    entidade: text("entidade").notNull(),
    entidadeId: uuid("entidade_id"),
    antes: jsonb("antes"),
    depois: jsonb("depois"),
    ip: text("ip"),
    criadoEm: criadoEm(),
  },
  (t) => [index("auditoria_entidade").on(t.entidade, t.entidadeId)],
);
