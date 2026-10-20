import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { criadoEm, id, organizacaoId } from "./comum";
import { veiculos } from "./frota";

export const statusAnuncio = pgEnum("status_anuncio", ["ativo", "pausado"]);

/** Carro anunciado na busca pública (RF-020, RF-021). Um anúncio por veículo. */
export const anuncios = pgTable(
  "anuncios",
  {
    id: id(),
    organizacaoId: organizacaoId(),
    veiculoId: uuid("veiculo_id").notNull().references(() => veiculos.id),
    status: statusAnuncio("status").notNull().default("ativo"),
    cidade: text("cidade").notNull(),
    uf: text("uf").notNull(),
    /** Cidade sem acento e em minúsculas, para o filtro da busca. */
    cidadeBusca: text("cidade_busca").notNull(),
    aluguelSemanal: integer("aluguel_semanal_centavos").notNull(),
    caucao: integer("caucao_centavos").notNull(),
    franquiaKmMensal: integer("franquia_km_mensal").notNull(),
    prazoMinimoMeses: integer("prazo_minimo_meses").notNull(),
    descricao: text("descricao"),
    /** Caminhos no bucket público "anuncios". */
    fotos: jsonb("fotos").$type<string[]>().notNull().default([]),
    criadoEm: criadoEm(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("anuncios_veiculo").on(t.veiculoId), index("anuncios_busca").on(t.status, t.cidadeBusca)],
);

/** Conversa entre um motorista e o locador sobre um anúncio (RF-113). */
export const conversas = pgTable(
  "conversas",
  {
    id: id(),
    organizacaoId: organizacaoId(),
    anuncioId: uuid("anuncio_id").notNull().references(() => anuncios.id),
    usuarioId: uuid("usuario_id").notNull(), // o motorista
    nomeMotorista: text("nome_motorista").notNull(),
    telefoneMotorista: text("telefone_motorista").notNull(),
    /** Preenchido quando o locador transforma a conversa em convite. */
    locatarioId: uuid("locatario_id"),
    ultimaMensagemEm: timestamp("ultima_mensagem_em", { withTimezone: true }).notNull().defaultNow(),
    lidaLocadorEm: timestamp("lida_locador_em", { withTimezone: true }),
    lidaMotoristaEm: timestamp("lida_motorista_em", { withTimezone: true }),
    criadoEm: criadoEm(),
  },
  (t) => [uniqueIndex("conversas_anuncio_usuario").on(t.anuncioId, t.usuarioId), index("conversas_org").on(t.organizacaoId, t.ultimaMensagemEm)],
);

export const autorMensagem = pgEnum("autor_mensagem", ["motorista", "locador", "sistema"]);

/** Mensagens só recebem inserção: são o histórico da negociação. */
export const mensagens = pgTable(
  "mensagens",
  {
    id: id(),
    conversaId: uuid("conversa_id").notNull().references(() => conversas.id),
    autor: autorMensagem("autor").notNull(),
    usuarioId: uuid("usuario_id"),
    texto: text("texto").notNull(),
    criadoEm: criadoEm(),
  },
  (t) => [index("mensagens_conversa").on(t.conversaId, t.criadoEm)],
);
