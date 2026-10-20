import { date, index, integer, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { criadoEm, id, organizacaoId } from "./comum";

export const statusVeiculo = pgEnum("status_veiculo", [
  "disponivel", "alugado", "em_manutencao", "em_recuperacao", "vendido",
]);

export const veiculos = pgTable(
  "veiculos",
  {
    id: id(),
    organizacaoId: organizacaoId(),
    placa: text("placa").notNull(),
    modelo: text("modelo").notNull(),
    anoFabricacao: integer("ano_fabricacao"),
    anoModelo: integer("ano_modelo"),
    cor: text("cor"),
    renavam: text("renavam"),
    odometroAtual: integer("odometro_atual").notNull(),
    status: statusVeiculo("status").notNull().default("disponivel"),
    criadoEm: criadoEm(),
  },
  (t) => [index("veiculos_org").on(t.organizacaoId)],
);

/** Todo km conhecido do veículo, venha de vistoria, check-in ou manutenção (RF-074). */
export const leiturasOdometro = pgTable("leituras_odometro", {
  id: id(),
  organizacaoId: organizacaoId(),
  veiculoId: uuid("veiculo_id").notNull().references(() => veiculos.id),
  km: integer("km").notNull(),
  origem: text("origem").notNull(), // vistoria | checkin | manutencao | manual
  origemId: uuid("origem_id"),
  lidoEm: date("lido_em").notNull(),
  criadoEm: criadoEm(),
});

/** Plano (RF-080) e execuções (RF-083) de manutenção. */
export const itensManutencao = pgTable("itens_manutencao", {
  id: id(),
  organizacaoId: organizacaoId(),
  veiculoId: uuid("veiculo_id").notNull().references(() => veiculos.id),
  item: text("item").notNull(), // óleo, filtros, correia…
  aCadaKm: integer("a_cada_km"),
  aCadaDias: integer("a_cada_dias"),
  ultimaExecucaoKm: integer("ultima_execucao_km"),
  ultimaExecucaoEm: date("ultima_execucao_em"),
});

export const manutencoes = pgTable("manutencoes", {
  id: id(),
  organizacaoId: organizacaoId(),
  veiculoId: uuid("veiculo_id").notNull().references(() => veiculos.id),
  descricao: text("descricao").notNull(),
  km: integer("km").notNull(),
  realizadaEm: date("realizada_em").notNull(),
  custo: integer("custo_centavos").notNull(),
  responsavelCusto: text("responsavel_custo").notNull().default("locador"), // RF-084
  criadoEm: criadoEm(),
});
