-- Migração 0012_curvy_whistler. Gerado por scripts/gerar-setup-sql.mjs.
begin;
CREATE TABLE "lugares_evitados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"lugar" text NOT NULL,
	"chave" text NOT NULL,
	"periodo" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "lugares_evitados_usuario_chave" ON "lugares_evitados" USING btree ("usuario_id","chave","periodo");
CREATE INDEX "lugares_evitados_chave" ON "lugares_evitados" USING btree ("chave");
ALTER TABLE "lugares_evitados" ENABLE ROW LEVEL SECURITY;
insert into drizzle.__drizzle_migrations (hash, created_at) values ('dd1dd05db1381e854c4dd2579aefa2b0bdb942af4ee471341005fcde889f8f10', 1793160219449);
commit;
