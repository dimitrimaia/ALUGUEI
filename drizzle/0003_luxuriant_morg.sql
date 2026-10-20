CREATE TABLE "clientes_pagamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"locatario_id" uuid NOT NULL,
	"provedor" text NOT NULL,
	"cliente_id" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contas_pagamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"provedor" text NOT NULL,
	"conta_id" text NOT NULL,
	"wallet_id" text NOT NULL,
	"chave_api_cifrada" text NOT NULL,
	"status" text DEFAULT 'ativa' NOT NULL,
	"dados" jsonb,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cobrancas" ADD COLUMN "pix_qr_code" text;--> statement-breakpoint
ALTER TABLE "cobrancas" ADD COLUMN "valor_pago_centavos" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "clientes_pagamento_unico" ON "clientes_pagamento" USING btree ("locatario_id","provedor");--> statement-breakpoint
CREATE UNIQUE INDEX "contas_pagamento_org" ON "contas_pagamento" USING btree ("organizacao_id","provedor");--> statement-breakpoint
-- Dados de pagamento: só o servidor (chave secreta) acessa.
ALTER TABLE "contas_pagamento" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clientes_pagamento" ENABLE ROW LEVEL SECURITY;
