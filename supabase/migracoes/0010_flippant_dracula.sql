-- Migração 0010_flippant_dracula. Gerado por scripts/gerar-setup-sql.mjs.
begin;
CREATE TABLE "erros_app" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"origem" text NOT NULL,
	"mensagem" text NOT NULL,
	"digest" text,
	"caminho" text,
	"usuario_id" uuid,
	"detalhe" jsonb,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "erros_app_quando" ON "erros_app" USING btree ("criado_em");
ALTER TABLE "erros_app" ENABLE ROW LEVEL SECURITY;

insert into drizzle.__drizzle_migrations (hash, created_at) values ('ceecd71b026c1a6406884999389bafe9b7724a9eedf9ea74b9d771087df55416', 1793073312224);
commit;
