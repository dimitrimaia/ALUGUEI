import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { criadoEm, id, organizacaoId } from "./comum";
import { contratos } from "./contratos";

export const canalNotificacao = pgEnum("canal_notificacao", ["app", "push", "email", "whatsapp"]);

/** RF-111: toda notificação guardada com texto, canal, horários e status de entrega/leitura. */
export const notificacoes = pgTable(
  "notificacoes",
  {
    id: id(),
    /** Nulo nos avisos que não são de um locador (ex.: resposta do suporte). */
    organizacaoId: uuid("organizacao_id"),
    contratoId: uuid("contrato_id").references(() => contratos.id),
    destinatarioUsuarioId: uuid("destinatario_usuario_id"),
    canal: canalNotificacao("canal").notNull(),
    formal: boolean("formal").notNull().default(false), // notificação formal da régua
    modelo: text("modelo").notNull(),
    titulo: text("titulo"),
    texto: text("texto").notNull(),
    /** Tela que o aviso abre no app. */
    link: text("link"),
    chave: text("chave").notNull(), // idempotência: um lembrete por obrigação e etapa
    provedorId: text("provedor_id"),
    enviadaEm: timestamp("enviada_em", { withTimezone: true }),
    entregueEm: timestamp("entregue_em", { withTimezone: true }),
    lidaEm: timestamp("lida_em", { withTimezone: true }),
    falha: text("falha"),
    criadoEm: criadoEm(),
  },
  (t) => [uniqueIndex("notificacoes_chave").on(t.chave), index("notificacoes_contrato").on(t.contratoId), index("notificacoes_destinatario").on(t.destinatarioUsuarioId, t.canal, t.criadoEm)],
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

/** Aparelhos que aceitaram notificação no celular (Web Push). */
export const inscricoesPush = pgTable(
  "inscricoes_push",
  {
    id: id(),
    usuarioId: uuid("usuario_id").notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    dispositivo: text("dispositivo"),
    criadoEm: criadoEm(),
  },
  (t) => [uniqueIndex("inscricoes_push_endpoint").on(t.endpoint), index("inscricoes_push_usuario").on(t.usuarioId)],
);

export const statusAtendimento = pgEnum("status_atendimento", ["aberto", "respondido", "encerrado"]);
export const autorSuporte = pgEnum("autor_suporte", ["usuario", "equipe", "agente", "sistema"]);

/** Atendimento do suporte do Aluguei: uma conversa da pessoa com a equipe (ou, depois, com um agente). */
export const atendimentos = pgTable(
  "atendimentos",
  {
    id: id(),
    /** Nulo quando o contato veio do WhatsApp de um número sem conta no app. */
    usuarioId: uuid("usuario_id"),
    /** Por onde a conversa acontece: no chat do app ou no WhatsApp. */
    canal: text("canal").notNull().default("app"),
    /** Número do WhatsApp (só dígitos, como a Meta envia), nos atendimentos desse canal. */
    telefone: text("telefone"),
    /** Modo em que a pessoa abriu o atendimento: motorista ou locador. */
    modo: text("modo").notNull(),
    organizacaoId: uuid("organizacao_id"),
    assunto: text("assunto").notNull(),
    status: statusAtendimento("status").notNull().default("aberto"),
    ultimaMensagemEm: timestamp("ultima_mensagem_em", { withTimezone: true }).notNull().defaultNow(),
    lidoUsuarioEm: timestamp("lido_usuario_em", { withTimezone: true }),
    lidoEquipeEm: timestamp("lido_equipe_em", { withTimezone: true }),
    criadoEm: criadoEm(),
  },
  (t) => [index("atendimentos_usuario").on(t.usuarioId, t.ultimaMensagemEm), index("atendimentos_status").on(t.status, t.ultimaMensagemEm), index("atendimentos_telefone").on(t.canal, t.telefone)],
);

export const mensagensSuporte = pgTable(
  "mensagens_suporte",
  {
    id: id(),
    atendimentoId: uuid("atendimento_id").notNull().references(() => atendimentos.id),
    autor: autorSuporte("autor").notNull(),
    usuarioId: uuid("usuario_id"),
    texto: text("texto").notNull(),
    criadoEm: criadoEm(),
  },
  (t) => [index("mensagens_suporte_atendimento").on(t.atendimentoId, t.criadoEm)],
);

/** Erros do app (servidor e tela), para diagnóstico. Sem dados pessoais além do id do usuário. */
export const errosApp = pgTable(
  "erros_app",
  {
    id: id(),
    origem: text("origem").notNull(), // servidor | tela
    mensagem: text("mensagem").notNull(),
    digest: text("digest"),
    caminho: text("caminho"),
    usuarioId: uuid("usuario_id"),
    detalhe: jsonb("detalhe"),
    criadoEm: criadoEm(),
  },
  (t) => [index("erros_app_quando").on(t.criadoEm)],
);
