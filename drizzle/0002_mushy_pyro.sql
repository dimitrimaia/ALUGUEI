DROP INDEX "evidencias_sha256";--> statement-breakpoint
CREATE INDEX "evidencias_locatario" ON "evidencias" USING btree ("locatario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "evidencias_sha256" ON "evidencias" USING btree ("organizacao_id","finalidade","sha256");--> statement-breakpoint
-- Modelos de contrato: leitura para usuários logados (base da plataforma ou do próprio locador).
-- Sem políticas de escrita: só o servidor (chave secreta) cria versões.
ALTER TABLE "modelos_contrato" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "versoes_modelo" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "modelos_contrato_le" ON "modelos_contrato" FOR SELECT TO authenticated
  USING ("organizacao_id" IS NULL OR "organizacao_id" IN (SELECT public.minhas_organizacoes()));--> statement-breakpoint
CREATE POLICY "versoes_modelo_le" ON "versoes_modelo" FOR SELECT TO authenticated
  USING ("modelo_id" IN (SELECT "id" FROM "modelos_contrato"));
