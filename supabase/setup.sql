-- Gerado por scripts/gerar-setup-sql.mjs. Não edite à mão.
begin;
create schema if not exists drizzle;
create table if not exists drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint);

-- Migração 0000_short_rogue
CREATE TYPE "public"."papel_membro" AS ENUM('dono', 'operador');
CREATE TYPE "public"."status_analise" AS ENUM('convidado', 'em_cadastro', 'em_analise', 'aprovado', 'recusado');
CREATE TYPE "public"."status_veiculo" AS ENUM('disponivel', 'alugado', 'em_manutencao', 'em_recuperacao', 'vendido');
CREATE TYPE "public"."status_contrato" AS ENUM('rascunho', 'aguardando_assinatura', 'assinado', 'ativo', 'encerrado', 'rescindido');
CREATE TYPE "public"."status_obrigacao" AS ENUM('pendente', 'cumprida', 'atrasada', 'cancelada', 'isenta');
CREATE TYPE "public"."tipo_lancamento" AS ENUM('aluguel', 'caucao', 'multa_mora', 'juros_mora', 'correcao', 'km_excedente', 'cobranca_extra', 'lucros_cessantes', 'multa_transito', 'taxa_administracao', 'desconto', 'isencao', 'pagamento', 'estorno', 'uso_caucao', 'devolucao_caucao');
CREATE TYPE "public"."tipo_obrigacao" AS ENUM('aluguel', 'caucao_parcela', 'checkin');
CREATE TYPE "public"."tipo_vistoria" AS ENUM('entrega', 'devolucao');
CREATE TYPE "public"."canal_notificacao" AS ENUM('app', 'push', 'email', 'whatsapp');
CREATE TABLE "membros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"papel" "papel_membro" NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "organizacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"documento" text NOT NULL,
	"cidade" text NOT NULL,
	"uf" text NOT NULL,
	"subconta_pagamento_id" text,
	"modo_assistido" boolean DEFAULT true NOT NULL,
	"mensalidade_por_carro_centavos" integer DEFAULT 25000 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "consentimentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"locatario_id" uuid NOT NULL,
	"finalidade" text NOT NULL,
	"versao_texto" text NOT NULL,
	"aceito_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" text,
	"dispositivo" text,
	"revogado_em" timestamp with time zone
);

CREATE TABLE "locatarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"usuario_id" uuid,
	"nome" text NOT NULL,
	"cpf" text,
	"telefone" text NOT NULL,
	"email" text,
	"data_nascimento" date,
	"endereco" jsonb,
	"cnh_numero" text,
	"cnh_primeira_habilitacao" date,
	"cnh_validade" date,
	"cnh_tem_ear" boolean,
	"status" "status_analise" DEFAULT 'convidado' NOT NULL,
	"pendencias_pre_analise" jsonb,
	"motivo_decisao" text,
	"decidido_por" uuid,
	"decidido_em" timestamp with time zone,
	"token_convite" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locatarios_token_convite_unique" UNIQUE("token_convite")
);

CREATE TABLE "itens_manutencao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"veiculo_id" uuid NOT NULL,
	"item" text NOT NULL,
	"a_cada_km" integer,
	"a_cada_dias" integer,
	"ultima_execucao_km" integer,
	"ultima_execucao_em" date
);

CREATE TABLE "leituras_odometro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"veiculo_id" uuid NOT NULL,
	"km" integer NOT NULL,
	"origem" text NOT NULL,
	"origem_id" uuid,
	"lido_em" date NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "manutencoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"veiculo_id" uuid NOT NULL,
	"descricao" text NOT NULL,
	"km" integer NOT NULL,
	"realizada_em" date NOT NULL,
	"custo_centavos" integer NOT NULL,
	"responsavel_custo" text DEFAULT 'locador' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "veiculos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"placa" text NOT NULL,
	"modelo" text NOT NULL,
	"ano_fabricacao" integer,
	"ano_modelo" integer,
	"cor" text,
	"renavam" text,
	"odometro_atual" integer NOT NULL,
	"status" "status_veiculo" DEFAULT 'disponivel' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "contratos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"locatario_id" uuid NOT NULL,
	"veiculo_id" uuid NOT NULL,
	"versao_modelo_id" uuid NOT NULL,
	"parametros" jsonb NOT NULL,
	"inicio" date NOT NULL,
	"fim" date NOT NULL,
	"status" "status_contrato" DEFAULT 'rascunho' NOT NULL,
	"importado" boolean DEFAULT false NOT NULL,
	"pdf_evidencia_id" uuid,
	"pdf_sha256" text,
	"assinatura_provedor_id" text,
	"assinado_em" timestamp with time zone,
	"contrato_anterior_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "modelos_contrato" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid,
	"nome" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "versoes_modelo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modelo_id" uuid NOT NULL,
	"versao" integer NOT NULL,
	"corpo" text NOT NULL,
	"parametros_padrao" jsonb NOT NULL,
	"revisado_por_advogado_em" timestamp with time zone,
	"publicado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "cobrancas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"contrato_id" uuid NOT NULL,
	"obrigacao_id" uuid,
	"provedor" text NOT NULL,
	"provedor_id" text,
	"valor_centavos" integer NOT NULL,
	"vencimento" date NOT NULL,
	"split_plataforma_centavos" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'emitida' NOT NULL,
	"pix_copia_e_cola" text,
	"link_pagamento" text,
	"pago_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "lancamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"contrato_id" uuid NOT NULL,
	"tipo" "tipo_lancamento" NOT NULL,
	"valor_centavos" integer NOT NULL,
	"competencia" date NOT NULL,
	"descricao" text NOT NULL,
	"justificativa" text,
	"obrigacao_id" uuid,
	"lancamento_origem_id" uuid,
	"evidencia_ids" jsonb,
	"chave" text NOT NULL,
	"criado_por" uuid,
	"aprovado_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "obrigacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"contrato_id" uuid NOT NULL,
	"chave" text NOT NULL,
	"tipo" "tipo_obrigacao" NOT NULL,
	"vencimento" date NOT NULL,
	"valor_centavos" integer,
	"periodo_inicio" date,
	"periodo_fim" date,
	"status" "status_obrigacao" DEFAULT 'pendente' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "webhook_eventos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provedor" text NOT NULL,
	"evento_id" text NOT NULL,
	"tipo" text NOT NULL,
	"corpo" jsonb NOT NULL,
	"recebido_em" timestamp with time zone DEFAULT now() NOT NULL,
	"processado_em" timestamp with time zone,
	"erro" text
);

CREATE TABLE "checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"contrato_id" uuid NOT NULL,
	"obrigacao_id" uuid NOT NULL,
	"referencia" date NOT NULL,
	"odometro_informado" integer,
	"combustivel_oitavos" integer,
	"evidencias" jsonb NOT NULL,
	"revisado_por" uuid,
	"enviado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkins_obrigacao_id_unique" UNIQUE("obrigacao_id")
);

CREATE TABLE "evidencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"contrato_id" uuid,
	"veiculo_id" uuid,
	"tipo" text NOT NULL,
	"finalidade" text NOT NULL,
	"caminho_storage" text NOT NULL,
	"sha256" text NOT NULL,
	"tamanho_bytes" integer NOT NULL,
	"mime" text NOT NULL,
	"recebido_em" timestamp with time zone DEFAULT now() NOT NULL,
	"capturado_em_dispositivo" timestamp with time zone,
	"latitude" double precision,
	"longitude" double precision,
	"precisao_metros" double precision,
	"ip" text,
	"dispositivo" text,
	"enviado_por" uuid NOT NULL,
	"metadados" jsonb
);

CREATE TABLE "vistorias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"contrato_id" uuid NOT NULL,
	"tipo" "tipo_vistoria" NOT NULL,
	"odometro" integer NOT NULL,
	"combustivel_oitavos" integer NOT NULL,
	"checklist" jsonb NOT NULL,
	"pendencias" jsonb,
	"aceite_locatario_evidencia_id" uuid,
	"realizada_em" timestamp with time zone NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "acoes_pendentes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"contrato_id" uuid,
	"tipo" text NOT NULL,
	"proposta" jsonb NOT NULL,
	"motivo" text NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"decidido_por" uuid,
	"decidido_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid,
	"usuario_id" uuid,
	"acao" text NOT NULL,
	"entidade" text NOT NULL,
	"entidade_id" uuid,
	"antes" jsonb,
	"depois" jsonb,
	"ip" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "notificacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"contrato_id" uuid,
	"destinatario_usuario_id" uuid,
	"canal" "canal_notificacao" NOT NULL,
	"formal" boolean DEFAULT false NOT NULL,
	"modelo" text NOT NULL,
	"texto" text NOT NULL,
	"chave" text NOT NULL,
	"provedor_id" text,
	"enviada_em" timestamp with time zone,
	"entregue_em" timestamp with time zone,
	"lida_em" timestamp with time zone,
	"falha" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "membros" ADD CONSTRAINT "membros_organizacao_id_organizacoes_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."organizacoes"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "consentimentos" ADD CONSTRAINT "consentimentos_locatario_id_locatarios_id_fk" FOREIGN KEY ("locatario_id") REFERENCES "public"."locatarios"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "itens_manutencao" ADD CONSTRAINT "itens_manutencao_veiculo_id_veiculos_id_fk" FOREIGN KEY ("veiculo_id") REFERENCES "public"."veiculos"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "leituras_odometro" ADD CONSTRAINT "leituras_odometro_veiculo_id_veiculos_id_fk" FOREIGN KEY ("veiculo_id") REFERENCES "public"."veiculos"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "manutencoes" ADD CONSTRAINT "manutencoes_veiculo_id_veiculos_id_fk" FOREIGN KEY ("veiculo_id") REFERENCES "public"."veiculos"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_locatario_id_locatarios_id_fk" FOREIGN KEY ("locatario_id") REFERENCES "public"."locatarios"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_veiculo_id_veiculos_id_fk" FOREIGN KEY ("veiculo_id") REFERENCES "public"."veiculos"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_versao_modelo_id_versoes_modelo_id_fk" FOREIGN KEY ("versao_modelo_id") REFERENCES "public"."versoes_modelo"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "versoes_modelo" ADD CONSTRAINT "versoes_modelo_modelo_id_modelos_contrato_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos_contrato"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_obrigacao_id_obrigacoes_id_fk" FOREIGN KEY ("obrigacao_id") REFERENCES "public"."obrigacoes"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_obrigacao_id_obrigacoes_id_fk" FOREIGN KEY ("obrigacao_id") REFERENCES "public"."obrigacoes"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "obrigacoes" ADD CONSTRAINT "obrigacoes_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "evidencias" ADD CONSTRAINT "evidencias_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "evidencias" ADD CONSTRAINT "evidencias_veiculo_id_veiculos_id_fk" FOREIGN KEY ("veiculo_id") REFERENCES "public"."veiculos"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "acoes_pendentes" ADD CONSTRAINT "acoes_pendentes_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;
CREATE UNIQUE INDEX "membros_org_usuario" ON "membros" USING btree ("organizacao_id","usuario_id");
CREATE INDEX "locatarios_org" ON "locatarios" USING btree ("organizacao_id");
CREATE INDEX "veiculos_org" ON "veiculos" USING btree ("organizacao_id");
CREATE INDEX "contratos_org" ON "contratos" USING btree ("organizacao_id");
CREATE UNIQUE INDEX "versoes_modelo_versao" ON "versoes_modelo" USING btree ("modelo_id","versao");
CREATE UNIQUE INDEX "cobrancas_provedor" ON "cobrancas" USING btree ("provedor","provedor_id");
CREATE UNIQUE INDEX "lancamentos_chave" ON "lancamentos" USING btree ("chave");
CREATE INDEX "lancamentos_contrato" ON "lancamentos" USING btree ("contrato_id");
CREATE UNIQUE INDEX "obrigacoes_chave" ON "obrigacoes" USING btree ("chave");
CREATE INDEX "obrigacoes_vencimento" ON "obrigacoes" USING btree ("vencimento","status");
CREATE UNIQUE INDEX "webhook_eventos_unico" ON "webhook_eventos" USING btree ("provedor","evento_id");
CREATE UNIQUE INDEX "evidencias_sha256" ON "evidencias" USING btree ("organizacao_id","sha256");
CREATE INDEX "evidencias_contrato" ON "evidencias" USING btree ("contrato_id");
CREATE INDEX "auditoria_entidade" ON "auditoria" USING btree ("entidade","entidade_id");
CREATE UNIQUE INDEX "notificacoes_chave" ON "notificacoes" USING btree ("chave");
CREATE INDEX "notificacoes_contrato" ON "notificacoes" USING btree ("contrato_id");
insert into drizzle.__drizzle_migrations (hash, created_at) values ('325cec2865f4c2bfce7d1c0985f2057a846f7aa797efcb944759509bc8bcacd3', 1792515761025);

-- Políticas de acesso (supabase/rls.sql)
-- Isolamento entre locadores (RNF-002) e imutabilidade do cofre/extrato (RNF-007, RNF-010).
-- Aplicar depois das migrações do Drizzle. Rascunho: revisar a cada tabela nova.
--
-- Regra: o app acessa o banco com o JWT do usuário (Supabase), então o RLS vale
-- também para o nosso próprio código. A service role só é usada pelos jobs.

create or replace function public.minhas_organizacoes()
returns setof uuid
language sql stable security definer set search_path = public
as $$ select organizacao_id from membros where usuario_id = auth.uid() $$;

create or replace function public.meus_contratos_como_locatario()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select c.id from contratos c
  join locatarios l on l.id = c.locatario_id
  where l.usuario_id = auth.uid()
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'locatarios', 'consentimentos', 'veiculos', 'leituras_odometro', 'itens_manutencao',
    'manutencoes', 'contratos', 'obrigacoes', 'lancamentos', 'cobrancas', 'evidencias',
    'vistorias', 'checkins', 'notificacoes', 'acoes_pendentes'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for select using (organizacao_id in (select public.minhas_organizacoes()))',
      t || '_equipe_le', t);
    execute format(
      'create policy %I on %I for insert with check (organizacao_id in (select public.minhas_organizacoes()))',
      t || '_equipe_insere', t);
  end loop;

  -- Tabelas editáveis pela equipe. lancamentos, evidencias e auditoria ficam de
  -- fora de propósito: sem política de UPDATE/DELETE, ninguém altera nem apaga.
  foreach t in array array[
    'locatarios', 'veiculos', 'itens_manutencao', 'manutencoes', 'contratos',
    'obrigacoes', 'cobrancas', 'vistorias', 'checkins', 'acoes_pendentes', 'notificacoes'
  ] loop
    execute format(
      'create policy %I on %I for update using (organizacao_id in (select public.minhas_organizacoes()))',
      t || '_equipe_altera', t);
  end loop;

  -- O motorista lê o que é do contrato dele.
  foreach t in array array['obrigacoes', 'lancamentos', 'cobrancas', 'vistorias', 'checkins', 'notificacoes'] loop
    execute format(
      'create policy %I on %I for select using (contrato_id in (select public.meus_contratos_como_locatario()))',
      t || '_locatario_le', t);
  end loop;

  -- O motorista envia check-ins e as fotos/vídeos (que vão para o cofre).
  foreach t in array array['checkins', 'evidencias'] loop
    execute format(
      'create policy %I on %I for insert with check (contrato_id in (select public.meus_contratos_como_locatario()))',
      t || '_locatario_insere', t);
  end loop;
end $$;

alter table organizacoes enable row level security;
create policy organizacoes_equipe_le on organizacoes for select using (id in (select public.minhas_organizacoes()));

alter table membros enable row level security;
create policy membros_equipe_le on membros for select using (organizacao_id in (select public.minhas_organizacoes()));

alter table auditoria enable row level security;
create policy auditoria_equipe_le on auditoria for select using (organizacao_id in (select public.minhas_organizacoes()));

-- webhook_eventos: só a service role (sem políticas = nenhum acesso via JWT).
alter table webhook_eventos enable row level security;

-- Bucket privado do cofre de provas. Sem políticas de update/delete em storage.objects.
insert into storage.buckets (id, name, public) values ('evidencias', 'evidencias', false)
on conflict (id) do nothing;


-- Migração 0001_fresh_strong_guy
ALTER TABLE "locatarios" ADD COLUMN "convite_expira_em" timestamp with time zone;
ALTER TABLE "locatarios" ADD COLUMN "veiculo_ofertado_id" uuid;
ALTER TABLE "locatarios" ADD COLUMN "oferta" jsonb;
ALTER TABLE "evidencias" ADD COLUMN "locatario_id" uuid;
insert into drizzle.__drizzle_migrations (hash, created_at) values ('7cdacdc5a8cb360f806164b0d1395d66e098b39728db357856b0bbcf616c4b0f', 1792517712970);

-- Migração 0002_mushy_pyro
DROP INDEX "evidencias_sha256";
CREATE INDEX "evidencias_locatario" ON "evidencias" USING btree ("locatario_id");
CREATE UNIQUE INDEX "evidencias_sha256" ON "evidencias" USING btree ("organizacao_id","finalidade","sha256");
-- Modelos de contrato: leitura para usuários logados (base da plataforma ou do próprio locador).
-- Sem políticas de escrita: só o servidor (chave secreta) cria versões.
ALTER TABLE "modelos_contrato" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "versoes_modelo" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modelos_contrato_le" ON "modelos_contrato" FOR SELECT TO authenticated
  USING ("organizacao_id" IS NULL OR "organizacao_id" IN (SELECT public.minhas_organizacoes()));
CREATE POLICY "versoes_modelo_le" ON "versoes_modelo" FOR SELECT TO authenticated
  USING ("modelo_id" IN (SELECT "id" FROM "modelos_contrato"));

insert into drizzle.__drizzle_migrations (hash, created_at) values ('04112877a8030e5f4dae7eb6cd02b7ff0f32f3cd06b4e1243667c00b2c5253f2', 1792519076196);

-- Migração 0003_luxuriant_morg
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

-- Migração 0004_thick_lucky_pierre
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

-- Migração 0005_rare_dreaming_celestial
CREATE TYPE "public"."status_verificacao_veiculo" AS ENUM('pendente', 'em_analise', 'verificado', 'recusado');
ALTER TABLE "organizacoes" ADD COLUMN "chave_pix_direto" text;
ALTER TABLE "veiculos" ADD COLUMN "verificacao" "status_verificacao_veiculo" DEFAULT 'pendente' NOT NULL;
ALTER TABLE "veiculos" ADD COLUMN "crlv_evidencia_id" uuid;
ALTER TABLE "veiculos" ADD COLUMN "verificacao_motivo" text;
ALTER TABLE "veiculos" ADD COLUMN "verificado_em" timestamp with time zone;
ALTER TABLE "veiculos" ADD COLUMN "verificado_por" uuid;
ALTER TABLE "obrigacoes" ADD COLUMN "pagamento_informado_em" timestamp with time zone;
CREATE INDEX "veiculos_verificacao" ON "veiculos" USING btree ("verificacao");
insert into drizzle.__drizzle_migrations (hash, created_at) values ('b964ed11e5f2e307fd49e68bb47d4f5277ef4b8cc5b5a89bce9d27edca70bb12', 1792583158756);

-- Migração 0006_elite_black_panther
CREATE TYPE "public"."autor_suporte" AS ENUM('usuario', 'equipe', 'agente', 'sistema');
CREATE TYPE "public"."status_atendimento" AS ENUM('aberto', 'respondido', 'encerrado');
CREATE TABLE "atendimentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"modo" text NOT NULL,
	"organizacao_id" uuid,
	"assunto" text NOT NULL,
	"status" "status_atendimento" DEFAULT 'aberto' NOT NULL,
	"ultima_mensagem_em" timestamp with time zone DEFAULT now() NOT NULL,
	"lido_usuario_em" timestamp with time zone,
	"lido_equipe_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "inscricoes_push" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"dispositivo" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "mensagens_suporte" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"atendimento_id" uuid NOT NULL,
	"autor" "autor_suporte" NOT NULL,
	"usuario_id" uuid,
	"texto" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "notificacoes" ALTER COLUMN "organizacao_id" DROP NOT NULL;
ALTER TABLE "contratos" ADD COLUMN "encerramento_motivo" text;
ALTER TABLE "contratos" ADD COLUMN "encerrado_em" timestamp with time zone;
ALTER TABLE "contratos" ADD COLUMN "devolucao_em" date;
ALTER TABLE "contratos" ADD COLUMN "caucao_devolver_centavos" integer;
ALTER TABLE "contratos" ADD COLUMN "caucao_devolver_ate" date;
ALTER TABLE "contratos" ADD COLUMN "caucao_devolvida_em" timestamp with time zone;
ALTER TABLE "notificacoes" ADD COLUMN "titulo" text;
ALTER TABLE "notificacoes" ADD COLUMN "link" text;
ALTER TABLE "mensagens_suporte" ADD CONSTRAINT "mensagens_suporte_atendimento_id_atendimentos_id_fk" FOREIGN KEY ("atendimento_id") REFERENCES "public"."atendimentos"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "atendimentos_usuario" ON "atendimentos" USING btree ("usuario_id","ultima_mensagem_em");
CREATE INDEX "atendimentos_status" ON "atendimentos" USING btree ("status","ultima_mensagem_em");
CREATE UNIQUE INDEX "inscricoes_push_endpoint" ON "inscricoes_push" USING btree ("endpoint");
CREATE INDEX "inscricoes_push_usuario" ON "inscricoes_push" USING btree ("usuario_id");
CREATE INDEX "mensagens_suporte_atendimento" ON "mensagens_suporte" USING btree ("atendimento_id","criado_em");
CREATE INDEX "notificacoes_destinatario" ON "notificacoes" USING btree ("destinatario_usuario_id","canal","criado_em");
-- Aparelhos do push: cada pessoa vê só os seus; escrita pelo servidor.
ALTER TABLE "inscricoes_push" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inscricoes_push_dono_le" ON "inscricoes_push" FOR SELECT USING ("usuario_id" = auth.uid());
-- Avisos do app: o destinatário lê os seus (o tempo real respeita esta regra).
CREATE POLICY "notificacoes_destinatario_le" ON "notificacoes" FOR SELECT USING ("destinatario_usuario_id" = auth.uid());
-- Suporte: a pessoa lê os próprios atendimentos; escrita e leitura da equipe pelo servidor.
ALTER TABLE "atendimentos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "atendimentos_dono_le" ON "atendimentos" FOR SELECT USING ("usuario_id" = auth.uid());
ALTER TABLE "mensagens_suporte" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mensagens_suporte_dono_le" ON "mensagens_suporte" FOR SELECT USING ("atendimento_id" IN (SELECT "id" FROM "atendimentos"));
ALTER PUBLICATION supabase_realtime ADD TABLE "mensagens_suporte";
ALTER PUBLICATION supabase_realtime ADD TABLE "notificacoes";

insert into drizzle.__drizzle_migrations (hash, created_at) values ('4759d98d512c1fc87f79e49baff98b5296c371fdb18442ebd52bc32664939e55', 1792595748739);

-- Migração 0007_low_baron_zemo
ALTER TABLE "atendimentos" ALTER COLUMN "usuario_id" DROP NOT NULL;
ALTER TABLE "atendimentos" ADD COLUMN "canal" text DEFAULT 'app' NOT NULL;
ALTER TABLE "atendimentos" ADD COLUMN "telefone" text;
CREATE INDEX "atendimentos_telefone" ON "atendimentos" USING btree ("canal","telefone");
-- Acha a conta pelo celular confirmado (para o atendimento pelo WhatsApp). Só o servidor chama.
CREATE OR REPLACE FUNCTION public.usuario_por_telefone(telefones text[]) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT id FROM auth.users WHERE phone = ANY(telefones) AND phone_confirmed_at IS NOT NULL ORDER BY created_at LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.usuario_por_telefone(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.usuario_por_telefone(text[]) TO service_role;

insert into drizzle.__drizzle_migrations (hash, created_at) values ('74f9138e10672d48addaa8732ac6f6ae4cebbd5676b30f64c7fe936dd4ef7e1e', 1792603028533);

-- Migração 0008_groovy_scarlet_spider
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

-- Migração 0009_sparkling_terrax
CREATE TABLE "reservas_manutencao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"dia" date NOT NULL,
	"valor_centavos" integer NOT NULL,
	"descricao" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "perfis_custo" ADD COLUMN "preferencias" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "perfis_custo" ADD COLUMN "financas" jsonb DEFAULT '{}'::jsonb NOT NULL;
CREATE INDEX "reservas_manutencao_usuario" ON "reservas_manutencao" USING btree ("usuario_id","dia");
ALTER TABLE "reservas_manutencao" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reservas_manutencao_dono" ON "reservas_manutencao" FOR SELECT USING ("usuario_id" = auth.uid());

insert into drizzle.__drizzle_migrations (hash, created_at) values ('187401338733785202be9232acde8f9c81689933cd4f0d107cac6832b87ca382', 1793043430361);

-- Migração 0010_curved_nighthawk
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

-- Migração 0011_lush_drax
ALTER TABLE "corridas_avaliadas" ADD COLUMN "metros_reais" integer;
ALTER TABLE "corridas_avaliadas" ADD COLUMN "minutos_reais" integer;
ALTER TABLE "corridas_avaliadas" ADD COLUMN "finalizada_em" timestamp with time zone;
insert into drizzle.__drizzle_migrations (hash, created_at) values ('8d03d09c3dce2e6bab7bcf4b1fdf656d1e6af35e3359d1456161be399519c3c2', 1793158787779);

-- Migração 0012_curvy_whistler
CREATE TABLE "lugares_evitados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"lugar" text NOT NULL,
	"chave" text NOT NULL,
	"periodo" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "lugares_evitados_usuario_chave" ON "lugares_evitados" USING btree ("usuario_id","chave","periodo");
CREATE INDEX "lugares_evitados_chave" ON "lugares_evitados" USING btree ("chave");
ALTER TABLE "lugares_evitados" ENABLE ROW LEVEL SECURITY;
insert into drizzle.__drizzle_migrations (hash, created_at) values ('dd1dd05db1381e854c4dd2579aefa2b0bdb942af4ee471341005fcde889f8f10', 1793160219449);
commit;
