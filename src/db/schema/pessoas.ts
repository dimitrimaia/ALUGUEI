import { boolean, date, index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { criadoEm, id, organizacaoId } from "./comum";

export const statusAnalise = pgEnum("status_analise", ["convidado", "em_cadastro", "em_analise", "aprovado", "recusado"]);

/** Locatário no contexto de um locador. A mesma pessoa pode alugar de dois locadores. */
export const locatarios = pgTable(
  "locatarios",
  {
    id: id(),
    organizacaoId: organizacaoId(),
    usuarioId: uuid("usuario_id"), // preenchido quando ele aceita o convite
    nome: text("nome").notNull(),
    cpf: text("cpf"),
    telefone: text("telefone").notNull(),
    email: text("email"),
    dataNascimento: date("data_nascimento"),
    endereco: jsonb("endereco"),
    cnhNumero: text("cnh_numero"),
    cnhPrimeiraHabilitacao: date("cnh_primeira_habilitacao"),
    cnhValidade: date("cnh_validade"),
    cnhTemEar: boolean("cnh_tem_ear"),
    status: statusAnalise("status").notNull().default("convidado"),
    /** Resultado de preAnalisar(), para o locador ver na fila. */
    pendenciasPreAnalise: jsonb("pendencias_pre_analise").$type<string[]>(),
    motivoDecisao: text("motivo_decisao"), // RF-022
    decididoPor: uuid("decidido_por"),
    decididoEm: timestamp("decidido_em", { withTimezone: true }),
    tokenConvite: text("token_convite").unique(),
    criadoEm: criadoEm(),
  },
  (t) => [index("locatarios_org").on(t.organizacaoId)],
);

/** RF-006 / RNF-003: um registro por finalidade aceita, com a versão do texto. */
export const consentimentos = pgTable("consentimentos", {
  id: id(),
  organizacaoId: organizacaoId(),
  locatarioId: uuid("locatario_id").notNull().references(() => locatarios.id),
  finalidade: text("finalidade").notNull(), // documentos, geolocalizacao, compartilhamento_autoridades…
  versaoTexto: text("versao_texto").notNull(),
  aceitoEm: timestamp("aceito_em", { withTimezone: true }).notNull().defaultNow(),
  ip: text("ip"),
  dispositivo: text("dispositivo"),
  revogadoEm: timestamp("revogado_em", { withTimezone: true }),
});
