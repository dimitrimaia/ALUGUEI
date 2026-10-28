CREATE TABLE "lugares_evitados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"lugar" text NOT NULL,
	"chave" text NOT NULL,
	"periodo" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "lugares_evitados_usuario_chave" ON "lugares_evitados" USING btree ("usuario_id","chave","periodo");--> statement-breakpoint
CREATE INDEX "lugares_evitados_chave" ON "lugares_evitados" USING btree ("chave");--> statement-breakpoint
ALTER TABLE "lugares_evitados" ENABLE ROW LEVEL SECURITY;