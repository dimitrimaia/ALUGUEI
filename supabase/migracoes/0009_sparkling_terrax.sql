-- Migração 0009_sparkling_terrax. Gerado por scripts/gerar-setup-sql.mjs.
begin;
CREATE TABLE "reservas_manutencao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"dia" date NOT NULL,
	"valor_centavos" integer NOT NULL,
	"descricao" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "perfis_custo" ADD COLUMN "preferencias" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "perfis_custo" ADD COLUMN "financas" jsonb DEFAULT '{}'::jsonb NOT NULL;
CREATE INDEX "reservas_manutencao_usuario" ON "reservas_manutencao" USING btree ("usuario_id","dia");
ALTER TABLE "reservas_manutencao" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reservas_manutencao_dono" ON "reservas_manutencao" FOR SELECT USING ("usuario_id" = auth.uid());

insert into drizzle.__drizzle_migrations (hash, created_at) values ('187401338733785202be9232acde8f9c81689933cd4f0d107cac6832b87ca382', 1793043430361);
commit;
