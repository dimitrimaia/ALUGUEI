CREATE TABLE "reservas_manutencao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"dia" date NOT NULL,
	"valor_centavos" integer NOT NULL,
	"descricao" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "perfis_custo" ADD COLUMN "preferencias" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "perfis_custo" ADD COLUMN "financas" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "reservas_manutencao_usuario" ON "reservas_manutencao" USING btree ("usuario_id","dia");--> statement-breakpoint
ALTER TABLE "reservas_manutencao" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "reservas_manutencao_dono" ON "reservas_manutencao" FOR SELECT USING ("usuario_id" = auth.uid());
