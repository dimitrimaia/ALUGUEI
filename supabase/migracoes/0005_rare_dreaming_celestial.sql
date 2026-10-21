-- Migração 0005_rare_dreaming_celestial. Gerado por scripts/gerar-setup-sql.mjs.
begin;
CREATE TYPE "public"."status_verificacao_veiculo" AS ENUM('pendente', 'em_analise', 'verificado', 'recusado');
ALTER TABLE "organizacoes" ADD COLUMN "chave_pix_direto" text;
ALTER TABLE "veiculos" ADD COLUMN "verificacao" "status_verificacao_veiculo" DEFAULT 'pendente' NOT NULL;
ALTER TABLE "veiculos" ADD COLUMN "crlv_evidencia_id" uuid;
ALTER TABLE "veiculos" ADD COLUMN "verificacao_motivo" text;
ALTER TABLE "veiculos" ADD COLUMN "verificado_em" timestamp with time zone;
ALTER TABLE "veiculos" ADD COLUMN "verificado_por" uuid;
ALTER TABLE "obrigacoes" ADD COLUMN "pagamento_informado_em" timestamp with time zone;
CREATE INDEX "veiculos_verificacao" ON "veiculos" USING btree ("verificacao");
insert into drizzle.__drizzle_migrations (hash, created_at) values ('b964ed11e5f2e307fd49e68bb47d4f5277ef4b8cc5b5a89bce9d27edca70bb12', 1792583158756);
commit;
