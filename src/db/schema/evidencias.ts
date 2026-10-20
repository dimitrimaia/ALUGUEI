import { date, doublePrecision, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { criadoEm, id, organizacaoId } from "./comum";
import { contratos } from "./contratos";
import { veiculos } from "./frota";

/**
 * Cofre de provas (RNF-010/011). O arquivo vai para um bucket sem update/delete;
 * aqui fica o hash e os metadados. Só insert: nenhuma política permite UPDATE.
 */
export const evidencias = pgTable(
  "evidencias",
  {
    id: id(),
    organizacaoId: organizacaoId(),
    contratoId: uuid("contrato_id").references(() => contratos.id),
    veiculoId: uuid("veiculo_id").references(() => veiculos.id),
    locatarioId: uuid("locatario_id"), // documentos do cadastro (CNH, identidade, print do app)
    tipo: text("tipo").notNull(), // foto | video | pdf | notificacao | aceite
    finalidade: text("finalidade").notNull(), // ex.: checkin.painel, vistoria.entrega.frente
    caminhoStorage: text("caminho_storage").notNull(),
    sha256: text("sha256").notNull(),
    tamanhoBytes: integer("tamanho_bytes").notNull(),
    mime: text("mime").notNull(),
    /** Hora do servidor; a do aparelho fica só nos metadados. */
    recebidoEm: timestamp("recebido_em", { withTimezone: true }).notNull().defaultNow(),
    capturadoEmDispositivo: timestamp("capturado_em_dispositivo", { withTimezone: true }),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    precisaoMetros: doublePrecision("precisao_metros"),
    ip: text("ip"),
    dispositivo: text("dispositivo"),
    enviadoPor: uuid("enviado_por").notNull(),
    metadados: jsonb("metadados"),
  },
  // O mesmo arquivo pode servir a duas finalidades (ex.: um PDF com CNH e comprovante).
  (t) => [
    uniqueIndex("evidencias_sha256").on(t.organizacaoId, t.finalidade, t.sha256),
    index("evidencias_contrato").on(t.contratoId),
    index("evidencias_locatario").on(t.locatarioId),
  ],
);

export const tipoVistoria = pgEnum("tipo_vistoria", ["entrega", "devolucao"]);

export const vistorias = pgTable("vistorias", {
  id: id(),
  organizacaoId: organizacaoId(),
  contratoId: uuid("contrato_id").notNull().references(() => contratos.id),
  tipo: tipoVistoria("tipo").notNull(),
  odometro: integer("odometro").notNull(),
  combustivelOitavos: integer("combustivel_oitavos").notNull(), // 0 a 8
  /** Itens do checklist configurável (RF-040): { item, estado, observacao, evidenciaIds }. */
  checklist: jsonb("checklist").notNull(),
  pendencias: jsonb("pendencias"), // demonstrativo da devolução (RF-045)
  aceiteLocatarioEvidenciaId: uuid("aceite_locatario_evidencia_id"),
  realizadaEm: timestamp("realizada_em", { withTimezone: true }).notNull(),
  criadoEm: criadoEm(),
});

export const checkins = pgTable("checkins", {
  id: id(),
  organizacaoId: organizacaoId(),
  contratoId: uuid("contrato_id").notNull().references(() => contratos.id),
  obrigacaoId: uuid("obrigacao_id").notNull().unique(),
  referencia: date("referencia").notNull(),
  odometroInformado: integer("odometro_informado"),
  combustivelOitavos: integer("combustivel_oitavos"),
  /** painel, vareta, arrefecimento, video → evidencia_id */
  evidencias: jsonb("evidencias").$type<Record<string, string>>().notNull(),
  revisadoPor: uuid("revisado_por"),
  enviadoEm: timestamp("enviado_em", { withTimezone: true }).notNull().defaultNow(),
});
