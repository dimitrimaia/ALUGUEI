-- Migração 0001_fresh_strong_guy. Gerado por scripts/gerar-setup-sql.mjs.
begin;
ALTER TABLE "locatarios" ADD COLUMN "convite_expira_em" timestamp with time zone;
ALTER TABLE "locatarios" ADD COLUMN "veiculo_ofertado_id" uuid;
ALTER TABLE "locatarios" ADD COLUMN "oferta" jsonb;
ALTER TABLE "evidencias" ADD COLUMN "locatario_id" uuid;
insert into drizzle.__drizzle_migrations (hash, created_at) values ('7cdacdc5a8cb360f806164b0d1395d66e098b39728db357856b0bbcf616c4b0f', 1792517712970);
commit;
