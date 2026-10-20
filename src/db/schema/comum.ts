import { timestamp, uuid } from "drizzle-orm/pg-core";

export const id = () => uuid("id").primaryKey().defaultRandom();
export const criadoEm = () => timestamp("criado_em", { withTimezone: true }).notNull().defaultNow();
/** Coluna de tenant. Toda tabela com dado de locador tem e é filtrada por RLS (RNF-002). */
export const organizacaoId = () => uuid("organizacao_id").notNull();
