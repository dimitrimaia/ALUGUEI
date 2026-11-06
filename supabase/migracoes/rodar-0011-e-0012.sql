-- Migrations 0011 e 0012 juntas. Cole no Supabase: SQL Editor → New query → Run.
-- Pode rodar de novo sem problema: o que já existe é pulado.
begin;

-- 0011: km e tempo reais da corrida
ALTER TABLE "corridas_avaliadas" ADD COLUMN IF NOT EXISTS "metros_reais" integer;
ALTER TABLE "corridas_avaliadas" ADD COLUMN IF NOT EXISTS "minutos_reais" integer;
ALTER TABLE "corridas_avaliadas" ADD COLUMN IF NOT EXISTS "finalizada_em" timestamp with time zone;
insert into drizzle.__drizzle_migrations (hash, created_at)
  select '8d03d09c3dce2e6bab7bcf4b1fdf656d1e6af35e3359d1456161be399519c3c2', 1793158787779
  where not exists (select 1 from drizzle.__drizzle_migrations where hash = '8d03d09c3dce2e6bab7bcf4b1fdf656d1e6af35e3359d1456161be399519c3c2');

-- 0012: lugares que o motorista quer evitar
CREATE TABLE IF NOT EXISTS "lugares_evitados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"lugar" text NOT NULL,
	"chave" text NOT NULL,
	"periodo" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "lugares_evitados_usuario_chave" ON "lugares_evitados" USING btree ("usuario_id","chave","periodo");
CREATE INDEX IF NOT EXISTS "lugares_evitados_chave" ON "lugares_evitados" USING btree ("chave");
ALTER TABLE "lugares_evitados" ENABLE ROW LEVEL SECURITY;
insert into drizzle.__drizzle_migrations (hash, created_at)
  select 'dd1dd05db1381e854c4dd2579aefa2b0bdb942af4ee471341005fcde889f8f10', 1793160219449
  where not exists (select 1 from drizzle.__drizzle_migrations where hash = 'dd1dd05db1381e854c4dd2579aefa2b0bdb942af4ee471341005fcde889f8f10');

commit;
