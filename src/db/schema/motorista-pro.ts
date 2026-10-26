import { boolean, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { criadoEm, id } from "./comum";

/**
 * Ferramentas do motorista (tudo em um): plantão, ganhos, despesas, semáforo de
 * corridas, caronas e clientes particulares. Valem para qualquer conta, aluga
 * pelo Aluguei ou não. Distâncias em metros (inteiros), dinheiro em centavos.
 */

/** Custos do carro, critérios do semáforo e meta do dia (normalizados em src/dominio/ganhos/custos.ts). */
export const perfisCusto = pgTable("perfis_custo", {
  usuarioId: uuid("usuario_id").primaryKey(),
  perfil: jsonb("perfil").notNull(),
  criterios: jsonb("criterios").notNull(),
  metaDiariaCentavos: integer("meta_diaria_centavos").notNull().default(0),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Um turno de trabalho: do "Iniciar plantão" ao "Encerrar". */
export const jornadas = pgTable(
  "jornadas",
  {
    id: id(),
    usuarioId: uuid("usuario_id").notNull(),
    inicio: timestamp("inicio", { withTimezone: true }).notNull().defaultNow(),
    fim: timestamp("fim", { withTimezone: true }),
    kmInicial: integer("km_inicial"),
    kmFinal: integer("km_final"),
    metaCentavos: integer("meta_centavos").notNull().default(0),
    criadoEm: criadoEm(),
  },
  (t) => [index("jornadas_usuario").on(t.usuarioId, t.inicio)],
);

/** Quanto entrou, por plataforma (lançado no fim da jornada ou a cada corrida). */
export const ganhos = pgTable(
  "ganhos",
  {
    id: id(),
    usuarioId: uuid("usuario_id").notNull(),
    jornadaId: uuid("jornada_id").references(() => jornadas.id, { onDelete: "set null" }),
    dia: date("dia").notNull(),
    plataforma: text("plataforma").notNull(),
    valorCentavos: integer("valor_centavos").notNull(),
    corridas: integer("corridas").notNull().default(1),
    criadoEm: criadoEm(),
  },
  (t) => [index("ganhos_usuario_dia").on(t.usuarioId, t.dia)],
);

export const despesasMotorista = pgTable(
  "despesas_motorista",
  {
    id: id(),
    usuarioId: uuid("usuario_id").notNull(),
    dia: date("dia").notNull(),
    categoria: text("categoria").notNull(),
    valorCentavos: integer("valor_centavos").notNull(),
    /** Abastecimento: litros × 1000 (ou m³, kWh), para o consumo real. */
    quantidadeMil: integer("quantidade_mil"),
    kmOdometro: integer("km_odometro"),
    descricao: text("descricao"),
    criadoEm: criadoEm(),
  },
  (t) => [index("despesas_motorista_usuario_dia").on(t.usuarioId, t.dia)],
);

/** Ofertas avaliadas pelo semáforo (bolha do Android ou digitação). Só os números, nunca a tela. */
export const corridasAvaliadas = pgTable(
  "corridas_avaliadas",
  {
    id: id(),
    usuarioId: uuid("usuario_id").notNull(),
    jornadaId: uuid("jornada_id").references(() => jornadas.id, { onDelete: "set null" }),
    app: text("app"),
    valorCentavos: integer("valor_centavos").notNull(),
    metrosCorrida: integer("metros_corrida").notNull(),
    minutosCorrida: integer("minutos_corrida"),
    metrosBusca: integer("metros_busca"),
    minutosBusca: integer("minutos_busca"),
    sinal: text("sinal").notNull(),
    decisao: text("decisao"), // aceitei | recusei | null
    origem: text("origem").notNull(), // leitura | digitada
    ocorridaEm: timestamp("ocorrida_em", { withTimezone: true }).notNull(),
    /** Idempotência do envio do celular: a mesma oferta não entra duas vezes. */
    chave: text("chave").notNull(),
    criadoEm: criadoEm(),
  },
  (t) => [uniqueIndex("corridas_avaliadas_chave").on(t.chave), index("corridas_avaliadas_usuario").on(t.usuarioId, t.ocorridaEm)],
);

/** Carona com divisão de custos: quem oferece não lucra (ver dominio/ganhos/carona.ts). */
export const caronas = pgTable(
  "caronas",
  {
    id: id(),
    motoristaId: uuid("motorista_id").notNull(),
    origemCidade: text("origem_cidade").notNull(),
    origemUf: text("origem_uf").notNull(),
    origemPonto: text("origem_ponto"),
    destinoCidade: text("destino_cidade").notNull(),
    destinoUf: text("destino_uf").notNull(),
    destinoPonto: text("destino_ponto"),
    partida: timestamp("partida", { withTimezone: true }).notNull(),
    vagas: integer("vagas").notNull(),
    km: integer("km").notNull(),
    pedagiosCentavos: integer("pedagios_centavos").notNull().default(0),
    contribuicaoCentavos: integer("contribuicao_centavos").notNull(),
    contribuicaoMaximaCentavos: integer("contribuicao_maxima_centavos").notNull(),
    carro: text("carro"),
    regras: jsonb("regras").notNull().default({}),
    observacoes: text("observacoes"),
    status: text("status").notNull().default("aberta"), // aberta | cancelada | concluida
    criadoEm: criadoEm(),
  },
  (t) => [index("caronas_busca").on(t.origemCidade, t.destinoCidade, t.partida), index("caronas_motorista").on(t.motoristaId)],
);

export const reservasCarona = pgTable(
  "reservas_carona",
  {
    id: id(),
    caronaId: uuid("carona_id").notNull().references(() => caronas.id),
    passageiroId: uuid("passageiro_id").notNull(),
    lugares: integer("lugares").notNull().default(1),
    mensagem: text("mensagem"),
    status: text("status").notNull().default("pendente"), // pendente | aceita | recusada | cancelada
    decididoEm: timestamp("decidido_em", { withTimezone: true }),
    criadoEm: criadoEm(),
  },
  (t) => [uniqueIndex("reservas_carona_unica").on(t.caronaId, t.passageiroId), index("reservas_carona_passageiro").on(t.passageiroId)],
);

/** Página pública do motorista para clientes particulares (aluguei.xyz/c/slug). */
export const perfisParticular = pgTable(
  "perfis_particular",
  {
    usuarioId: uuid("usuario_id").primaryKey(),
    slug: text("slug").notNull(),
    nome: text("nome").notNull(),
    cidade: text("cidade").notNull(),
    whatsapp: text("whatsapp").notNull(),
    apresentacao: text("apresentacao"),
    tabelas: jsonb("tabelas").notNull(),
    ativo: boolean("ativo").notNull().default(true),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("perfis_particular_slug").on(t.slug)],
);

export const agendamentosParticulares = pgTable(
  "agendamentos_particulares",
  {
    id: id(),
    motoristaId: uuid("motorista_id").notNull(),
    nome: text("nome").notNull(),
    whatsapp: text("whatsapp").notNull(),
    origem: text("origem").notNull(),
    destino: text("destino").notNull(),
    quando: timestamp("quando", { withTimezone: true }).notNull(),
    categoria: text("categoria").notNull(),
    metros: integer("metros"),
    minutos: integer("minutos"),
    valorEstimadoCentavos: integer("valor_estimado_centavos").notNull(),
    status: text("status").notNull().default("novo"), // novo | confirmado | concluido | cancelado
    criadoEm: criadoEm(),
  },
  (t) => [index("agendamentos_particulares_motorista").on(t.motoristaId, t.quando)],
);
