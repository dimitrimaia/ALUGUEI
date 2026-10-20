-- Migração 0002_mushy_pyro. Gerado por scripts/gerar-setup-sql.mjs.
begin;
DROP INDEX "evidencias_sha256";
CREATE INDEX "evidencias_locatario" ON "evidencias" USING btree ("locatario_id");
CREATE UNIQUE INDEX "evidencias_sha256" ON "evidencias" USING btree ("organizacao_id","finalidade","sha256");
-- Modelos de contrato: leitura para usuários logados (base da plataforma ou do próprio locador).
-- Sem políticas de escrita: só o servidor (chave secreta) cria versões.
ALTER TABLE "modelos_contrato" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "versoes_modelo" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modelos_contrato_le" ON "modelos_contrato" FOR SELECT TO authenticated
  USING ("organizacao_id" IS NULL OR "organizacao_id" IN (SELECT public.minhas_organizacoes()));
CREATE POLICY "versoes_modelo_le" ON "versoes_modelo" FOR SELECT TO authenticated
  USING ("modelo_id" IN (SELECT "id" FROM "modelos_contrato"));

insert into drizzle.__drizzle_migrations (hash, created_at) values ('04112877a8030e5f4dae7eb6cd02b7ff0f32f3cd06b4e1243667c00b2c5253f2', 1792519076196);
commit;
