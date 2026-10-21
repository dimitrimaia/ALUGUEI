import { boolean, date, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { ParametrosContrato } from "@/dominio/contrato/parametros";
import { criadoEm, id, organizacaoId } from "./comum";
import { locatarios } from "./pessoas";
import { veiculos } from "./frota";

export const modelosContrato = pgTable("modelos_contrato", {
  id: id(),
  organizacaoId: uuid("organizacao_id"), // nulo = modelo-base da plataforma
  nome: text("nome").notNull(),
  criadoEm: criadoEm(),
});

/** Versões imutáveis do modelo (RF-033). Uma versão publicada nunca é editada. */
export const versoesModelo = pgTable(
  "versoes_modelo",
  {
    id: id(),
    modeloId: uuid("modelo_id").notNull().references(() => modelosContrato.id),
    versao: integer("versao").notNull(),
    /** Template das cláusulas; numeração gerada na renderização, nunca escrita à mão. */
    corpo: text("corpo").notNull(),
    parametrosPadrao: jsonb("parametros_padrao").$type<Partial<ParametrosContrato>>().notNull(),
    revisadoPorAdvogadoEm: timestamp("revisado_por_advogado_em", { withTimezone: true }),
    publicadoEm: timestamp("publicado_em", { withTimezone: true }),
    criadoEm: criadoEm(),
  },
  (t) => [uniqueIndex("versoes_modelo_versao").on(t.modeloId, t.versao)],
);

export const statusContrato = pgEnum("status_contrato", [
  "rascunho", "aguardando_assinatura", "assinado", "ativo", "encerrado", "rescindido",
]);

export const contratos = pgTable(
  "contratos",
  {
    id: id(),
    organizacaoId: organizacaoId(),
    locatarioId: uuid("locatario_id").notNull().references(() => locatarios.id),
    veiculoId: uuid("veiculo_id").notNull().references(() => veiculos.id),
    versaoModeloId: uuid("versao_modelo_id").notNull().references(() => versoesModelo.id),
    /** Cópia congelada dos parâmetros na assinatura. Fonte da agenda, do PDF e do extrato. */
    parametros: jsonb("parametros").$type<ParametrosContrato>().notNull(),
    inicio: date("inicio").notNull(),
    fim: date("fim").notNull(),
    status: statusContrato("status").notNull().default("rascunho"),
    /** Contrato que já estava em andamento antes da plataforma (importado no piloto). */
    importado: boolean("importado").notNull().default(false),
    pdfEvidenciaId: uuid("pdf_evidencia_id"),
    pdfSha256: text("pdf_sha256"),
    assinaturaProvedorId: text("assinatura_provedor_id"),
    assinadoEm: timestamp("assinado_em", { withTimezone: true }),
    contratoAnteriorId: uuid("contrato_anterior_id"), // renovação (RF-034)
    /** Encerramento (RF-035, RF-045, RF-060): motivo, dia da devolução e a caução a devolver. */
    encerramentoMotivo: text("encerramento_motivo"),
    encerradoEm: timestamp("encerrado_em", { withTimezone: true }),
    devolucaoEm: date("devolucao_em"),
    caucaoDevolver: integer("caucao_devolver_centavos"),
    caucaoDevolverAte: date("caucao_devolver_ate"),
    caucaoDevolvidaEm: timestamp("caucao_devolvida_em", { withTimezone: true }),
    criadoEm: criadoEm(),
  },
  (t) => [index("contratos_org").on(t.organizacaoId)],
);
