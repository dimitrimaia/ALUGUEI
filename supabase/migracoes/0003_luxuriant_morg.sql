-- Migração 0003_luxuriant_morg. Gerado por scripts/gerar-setup-sql.mjs.
begin;
CREATE TABLE "clientes_pagamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"locatario_id" uuid NOT NULL,
	"provedor" text NOT NULL,
	"cliente_id" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

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

ALTER TABLE "cobrancas" ADD COLUMN "pix_qr_code" text;
ALTER TABLE "cobrancas" ADD COLUMN "valor_pago_centavos" integer;
CREATE UNIQUE INDEX "clientes_pagamento_unico" ON "clientes_pagamento" USING btree ("locatario_id","provedor");
CREATE UNIQUE INDEX "contas_pagamento_org" ON "contas_pagamento" USING btree ("organizacao_id","provedor");
-- Dados de pagamento: só o servidor (chave secreta) acessa.
ALTER TABLE "contas_pagamento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clientes_pagamento" ENABLE ROW LEVEL SECURITY;

insert into drizzle.__drizzle_migrations (hash, created_at) values ('e1aa33172c7cdb10d9c55c0cee47fb9c006a4ff911e524d3df7276bb79f53255', 1792526952700);
commit;
