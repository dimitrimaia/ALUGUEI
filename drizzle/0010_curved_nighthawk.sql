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
--> statement-breakpoint
ALTER TABLE "corridas_avaliadas" ADD COLUMN "valor_final_centavos" integer;--> statement-breakpoint
ALTER TABLE "corridas_avaliadas" ADD COLUMN "decisao_origem" text;--> statement-breakpoint
CREATE INDEX "erros_app_quando" ON "erros_app" USING btree ("criado_em");--> statement-breakpoint
ALTER TABLE "erros_app" ENABLE ROW LEVEL SECURITY;
