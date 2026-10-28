-- Migração 0011_lush_drax. Gerado por scripts/gerar-setup-sql.mjs.
begin;
ALTER TABLE "corridas_avaliadas" ADD COLUMN "metros_reais" integer;
ALTER TABLE "corridas_avaliadas" ADD COLUMN "minutos_reais" integer;
ALTER TABLE "corridas_avaliadas" ADD COLUMN "finalizada_em" timestamp with time zone;
insert into drizzle.__drizzle_migrations (hash, created_at) values ('8d03d09c3dce2e6bab7bcf4b1fdf656d1e6af35e3359d1456161be399519c3c2', 1793158787779);
commit;
