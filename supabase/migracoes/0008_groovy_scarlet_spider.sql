-- Migração 0008_groovy_scarlet_spider. Gerado por scripts/gerar-setup-sql.mjs.
begin;
CREATE TABLE "agendamentos_particulares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"motorista_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"whatsapp" text NOT NULL,
	"origem" text NOT NULL,
	"destino" text NOT NULL,
	"quando" timestamp with time zone NOT NULL,
	"categoria" text NOT NULL,
	"metros" integer,
	"minutos" integer,
	"valor_estimado_centavos" integer NOT NULL,
	"status" text DEFAULT 'novo' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "caronas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"motorista_id" uuid NOT NULL,
	"origem_cidade" text NOT NULL,
	"origem_uf" text NOT NULL,
	"origem_ponto" text,
	"destino_cidade" text NOT NULL,
	"destino_uf" text NOT NULL,
	"destino_ponto" text,
	"partida" timestamp with time zone NOT NULL,
	"vagas" integer NOT NULL,
	"km" integer NOT NULL,
	"pedagios_centavos" integer DEFAULT 0 NOT NULL,
	"contribuicao_centavos" integer NOT NULL,
	"contribuicao_maxima_centavos" integer NOT NULL,
	"carro" text,
	"regras" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"observacoes" text,
	"status" text DEFAULT 'aberta' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "corridas_avaliadas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"jornada_id" uuid,
	"app" text,
	"valor_centavos" integer NOT NULL,
	"metros_corrida" integer NOT NULL,
	"minutos_corrida" integer,
	"metros_busca" integer,
	"minutos_busca" integer,
	"sinal" text NOT NULL,
	"decisao" text,
	"origem" text NOT NULL,
	"ocorrida_em" timestamp with time zone NOT NULL,
	"chave" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "despesas_motorista" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"dia" date NOT NULL,
	"categoria" text NOT NULL,
	"valor_centavos" integer NOT NULL,
	"quantidade_mil" integer,
	"km_odometro" integer,
	"descricao" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "ganhos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"jornada_id" uuid,
	"dia" date NOT NULL,
	"plataforma" text NOT NULL,
	"valor_centavos" integer NOT NULL,
	"corridas" integer DEFAULT 1 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "jornadas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"inicio" timestamp with time zone DEFAULT now() NOT NULL,
	"fim" timestamp with time zone,
	"km_inicial" integer,
	"km_final" integer,
	"meta_centavos" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "perfis_custo" (
	"usuario_id" uuid PRIMARY KEY NOT NULL,
	"perfil" jsonb NOT NULL,
	"criterios" jsonb NOT NULL,
	"meta_diaria_centavos" integer DEFAULT 0 NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "perfis_particular" (
	"usuario_id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"nome" text NOT NULL,
	"cidade" text NOT NULL,
	"whatsapp" text NOT NULL,
	"apresentacao" text,
	"tabelas" jsonb NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "reservas_carona" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carona_id" uuid NOT NULL,
	"passageiro_id" uuid NOT NULL,
	"lugares" integer DEFAULT 1 NOT NULL,
	"mensagem" text,
	"status" text DEFAULT 'pendente' NOT NULL,
	"decidido_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "corridas_avaliadas" ADD CONSTRAINT "corridas_avaliadas_jornada_id_jornadas_id_fk" FOREIGN KEY ("jornada_id") REFERENCES "public"."jornadas"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "ganhos" ADD CONSTRAINT "ganhos_jornada_id_jornadas_id_fk" FOREIGN KEY ("jornada_id") REFERENCES "public"."jornadas"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "reservas_carona" ADD CONSTRAINT "reservas_carona_carona_id_caronas_id_fk" FOREIGN KEY ("carona_id") REFERENCES "public"."caronas"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "agendamentos_particulares_motorista" ON "agendamentos_particulares" USING btree ("motorista_id","quando");
CREATE INDEX "caronas_busca" ON "caronas" USING btree ("origem_cidade","destino_cidade","partida");
CREATE INDEX "caronas_motorista" ON "caronas" USING btree ("motorista_id");
CREATE UNIQUE INDEX "corridas_avaliadas_chave" ON "corridas_avaliadas" USING btree ("chave");
CREATE INDEX "corridas_avaliadas_usuario" ON "corridas_avaliadas" USING btree ("usuario_id","ocorrida_em");
CREATE INDEX "despesas_motorista_usuario_dia" ON "despesas_motorista" USING btree ("usuario_id","dia");
CREATE INDEX "ganhos_usuario_dia" ON "ganhos" USING btree ("usuario_id","dia");
CREATE INDEX "jornadas_usuario" ON "jornadas" USING btree ("usuario_id","inicio");
CREATE UNIQUE INDEX "perfis_particular_slug" ON "perfis_particular" USING btree ("slug");
CREATE UNIQUE INDEX "reservas_carona_unica" ON "reservas_carona" USING btree ("carona_id","passageiro_id");
CREATE INDEX "reservas_carona_passageiro" ON "reservas_carona" USING btree ("passageiro_id");
ALTER TABLE "perfis_custo" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perfis_custo_dono" ON "perfis_custo" FOR SELECT USING ("usuario_id" = auth.uid());
ALTER TABLE "jornadas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jornadas_dono" ON "jornadas" FOR SELECT USING ("usuario_id" = auth.uid());
ALTER TABLE "ganhos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ganhos_dono" ON "ganhos" FOR SELECT USING ("usuario_id" = auth.uid());
ALTER TABLE "despesas_motorista" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "despesas_motorista_dono" ON "despesas_motorista" FOR SELECT USING ("usuario_id" = auth.uid());
ALTER TABLE "corridas_avaliadas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "corridas_avaliadas_dono" ON "corridas_avaliadas" FOR SELECT USING ("usuario_id" = auth.uid());
ALTER TABLE "caronas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "caronas_abertas_leitura" ON "caronas" FOR SELECT USING ("status" = 'aberta' OR "motorista_id" = auth.uid());
ALTER TABLE "reservas_carona" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reservas_carona_envolvidos" ON "reservas_carona" FOR SELECT USING ("passageiro_id" = auth.uid() OR "carona_id" IN (SELECT "id" FROM "caronas" WHERE "motorista_id" = auth.uid()));
ALTER TABLE "perfis_particular" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perfis_particular_ativos" ON "perfis_particular" FOR SELECT USING ("ativo" OR "usuario_id" = auth.uid());
ALTER TABLE "agendamentos_particulares" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agendamentos_particulares_dono" ON "agendamentos_particulares" FOR SELECT USING ("motorista_id" = auth.uid());

insert into drizzle.__drizzle_migrations (hash, created_at) values ('01b5310f6f967c2273b9cada972000475bcc239424f661d5d697fd8cf970364b', 1793001778699);
commit;
