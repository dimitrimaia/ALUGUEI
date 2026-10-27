-- Migração 0010_curved_nighthawk. Gerado por scripts/gerar-setup-sql.mjs.
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

ALTER TABLE "corridas_avaliadas" ADD COLUMN "valor_final_centavos" integer;
ALTER TABLE "corridas_avaliadas" ADD COLUMN "decisao_origem" text;
CREATE INDEX "erros_app_quando" ON "erros_app" USING btree ("criado_em");
ALTER TABLE "erros_app" ENABLE ROW LEVEL SECURITY;

insert into drizzle.__drizzle_migrations (hash, created_at) values ('fc832fa39ddb63071b06e3587fbe01fd0cc2175b3f652e3b59fe6c9dc9b3961d', 1793073532862);
commit;
