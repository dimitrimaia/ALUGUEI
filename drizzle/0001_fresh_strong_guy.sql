ALTER TABLE "locatarios" ADD COLUMN "convite_expira_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "locatarios" ADD COLUMN "veiculo_ofertado_id" uuid;--> statement-breakpoint
ALTER TABLE "locatarios" ADD COLUMN "oferta" jsonb;--> statement-breakpoint
ALTER TABLE "evidencias" ADD COLUMN "locatario_id" uuid;