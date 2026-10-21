CREATE TYPE "public"."status_verificacao_veiculo" AS ENUM('pendente', 'em_analise', 'verificado', 'recusado');--> statement-breakpoint
ALTER TABLE "organizacoes" ADD COLUMN "chave_pix_direto" text;--> statement-breakpoint
ALTER TABLE "veiculos" ADD COLUMN "verificacao" "status_verificacao_veiculo" DEFAULT 'pendente' NOT NULL;--> statement-breakpoint
ALTER TABLE "veiculos" ADD COLUMN "crlv_evidencia_id" uuid;--> statement-breakpoint
ALTER TABLE "veiculos" ADD COLUMN "verificacao_motivo" text;--> statement-breakpoint
ALTER TABLE "veiculos" ADD COLUMN "verificado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "veiculos" ADD COLUMN "verificado_por" uuid;--> statement-breakpoint
ALTER TABLE "obrigacoes" ADD COLUMN "pagamento_informado_em" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "veiculos_verificacao" ON "veiculos" USING btree ("verificacao");