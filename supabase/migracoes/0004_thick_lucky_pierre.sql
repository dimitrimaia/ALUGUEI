-- Migração 0004_thick_lucky_pierre. Gerado por scripts/gerar-setup-sql.mjs.
begin;
CREATE TYPE "public"."autor_mensagem" AS ENUM('motorista', 'locador', 'sistema');
CREATE TYPE "public"."status_anuncio" AS ENUM('ativo', 'pausado');
CREATE TABLE "anuncios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"veiculo_id" uuid NOT NULL,
	"status" "status_anuncio" DEFAULT 'ativo' NOT NULL,
	"cidade" text NOT NULL,
	"uf" text NOT NULL,
	"cidade_busca" text NOT NULL,
	"aluguel_semanal_centavos" integer NOT NULL,
	"caucao_centavos" integer NOT NULL,
	"franquia_km_mensal" integer NOT NULL,
	"prazo_minimo_meses" integer NOT NULL,
	"descricao" text,
	"fotos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "conversas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"anuncio_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"nome_motorista" text NOT NULL,
	"telefone_motorista" text NOT NULL,
	"locatario_id" uuid,
	"ultima_mensagem_em" timestamp with time zone DEFAULT now() NOT NULL,
	"lida_locador_em" timestamp with time zone,
	"lida_motorista_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "mensagens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversa_id" uuid NOT NULL,
	"autor" "autor_mensagem" NOT NULL,
	"usuario_id" uuid,
	"texto" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "anuncios" ADD CONSTRAINT "anuncios_veiculo_id_veiculos_id_fk" FOREIGN KEY ("veiculo_id") REFERENCES "public"."veiculos"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "conversas" ADD CONSTRAINT "conversas_anuncio_id_anuncios_id_fk" FOREIGN KEY ("anuncio_id") REFERENCES "public"."anuncios"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_conversa_id_conversas_id_fk" FOREIGN KEY ("conversa_id") REFERENCES "public"."conversas"("id") ON DELETE no action ON UPDATE no action;
CREATE UNIQUE INDEX "anuncios_veiculo" ON "anuncios" USING btree ("veiculo_id");
CREATE INDEX "anuncios_busca" ON "anuncios" USING btree ("status","cidade_busca");
CREATE UNIQUE INDEX "conversas_anuncio_usuario" ON "conversas" USING btree ("anuncio_id","usuario_id");
CREATE INDEX "conversas_org" ON "conversas" USING btree ("organizacao_id","ultima_mensagem_em");
CREATE INDEX "mensagens_conversa" ON "mensagens" USING btree ("conversa_id","criado_em");
-- Anúncios: a equipe do locador gerencia; a busca pública lê pelo servidor.
ALTER TABLE "anuncios" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anuncios_equipe_le" ON "anuncios" FOR SELECT USING ("organizacao_id" IN (SELECT public.minhas_organizacoes()));
CREATE POLICY "anuncios_equipe_insere" ON "anuncios" FOR INSERT WITH CHECK ("organizacao_id" IN (SELECT public.minhas_organizacoes()));
CREATE POLICY "anuncios_equipe_altera" ON "anuncios" FOR UPDATE USING ("organizacao_id" IN (SELECT public.minhas_organizacoes()));
-- Conversas e mensagens: só os participantes leem; escrita pelo servidor.
ALTER TABLE "conversas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversas_participantes_le" ON "conversas" FOR SELECT
  USING ("usuario_id" = auth.uid() OR "organizacao_id" IN (SELECT public.minhas_organizacoes()));
ALTER TABLE "mensagens" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mensagens_participantes_le" ON "mensagens" FOR SELECT
  USING ("conversa_id" IN (SELECT "id" FROM "conversas"));
-- Tempo real no chat.
ALTER PUBLICATION supabase_realtime ADD TABLE "mensagens";
-- Fotos dos anúncios são públicas.
INSERT INTO storage.buckets (id, name, public) VALUES ('anuncios', 'anuncios', true) ON CONFLICT (id) DO NOTHING;

insert into drizzle.__drizzle_migrations (hash, created_at) values ('3f2c7dbb699c0dcd01426bb667cf5a6a17cd015191daceb5d22f3b0949fb6370', 1792539616274);
commit;
