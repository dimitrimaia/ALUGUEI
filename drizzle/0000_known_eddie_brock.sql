CREATE TYPE "public"."papel_membro" AS ENUM('dono', 'operador');--> statement-breakpoint
CREATE TYPE "public"."status_analise" AS ENUM('convidado', 'em_cadastro', 'em_analise', 'aprovado', 'recusado');--> statement-breakpoint
CREATE TYPE "public"."status_veiculo" AS ENUM('disponivel', 'alugado', 'em_manutencao', 'em_recuperacao', 'vendido');--> statement-breakpoint
CREATE TYPE "public"."status_contrato" AS ENUM('rascunho', 'aguardando_assinatura', 'assinado', 'ativo', 'encerrado', 'rescindido');--> statement-breakpoint
CREATE TYPE "public"."status_obrigacao" AS ENUM('pendente', 'cumprida', 'atrasada', 'cancelada', 'isenta');--> statement-breakpoint
CREATE TYPE "public"."tipo_lancamento" AS ENUM('aluguel', 'caucao', 'multa_mora', 'juros_mora', 'correcao', 'km_excedente', 'cobranca_extra', 'lucros_cessantes', 'multa_transito', 'taxa_administracao', 'desconto', 'isencao', 'pagamento', 'estorno', 'uso_caucao', 'devolucao_caucao');--> statement-breakpoint
CREATE TYPE "public"."tipo_obrigacao" AS ENUM('aluguel', 'caucao_parcela', 'checkin');--> statement-breakpoint
CREATE TYPE "public"."tipo_vistoria" AS ENUM('entrega', 'devolucao');--> statement-breakpoint
CREATE TYPE "public"."canal_notificacao" AS ENUM('app', 'push', 'email', 'whatsapp');--> statement-breakpoint
CREATE TABLE "membros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"papel" "papel_membro" NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"documento" text NOT NULL,
	"cidade" text NOT NULL,
	"uf" text NOT NULL,
	"subconta_pagamento_id" text,
	"modo_assistido" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "modelos_contrato" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid,
	"nome" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "cobrancas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacao_id" uuid NOT NULL,
	"contrato_id" uuid NOT NULL,
	"obrigacao_id" uuid,
	"provedor" text NOT NULL,
	"provedor_id" text,
	"valor_centavos" integer NOT NULL,
	"vencimento" date NOT NULL,
	"status" text DEFAULT 'emitida' NOT NULL,
	"pix_copia_e_cola" text,
	"link_pagamento" text,
	"pago_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "membros" ADD CONSTRAINT "membros_organizacao_id_organizacoes_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."organizacoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consentimentos" ADD CONSTRAINT "consentimentos_locatario_id_locatarios_id_fk" FOREIGN KEY ("locatario_id") REFERENCES "public"."locatarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_manutencao" ADD CONSTRAINT "itens_manutencao_veiculo_id_veiculos_id_fk" FOREIGN KEY ("veiculo_id") REFERENCES "public"."veiculos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leituras_odometro" ADD CONSTRAINT "leituras_odometro_veiculo_id_veiculos_id_fk" FOREIGN KEY ("veiculo_id") REFERENCES "public"."veiculos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manutencoes" ADD CONSTRAINT "manutencoes_veiculo_id_veiculos_id_fk" FOREIGN KEY ("veiculo_id") REFERENCES "public"."veiculos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_locatario_id_locatarios_id_fk" FOREIGN KEY ("locatario_id") REFERENCES "public"."locatarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_veiculo_id_veiculos_id_fk" FOREIGN KEY ("veiculo_id") REFERENCES "public"."veiculos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_versao_modelo_id_versoes_modelo_id_fk" FOREIGN KEY ("versao_modelo_id") REFERENCES "public"."versoes_modelo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versoes_modelo" ADD CONSTRAINT "versoes_modelo_modelo_id_modelos_contrato_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos_contrato"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_obrigacao_id_obrigacoes_id_fk" FOREIGN KEY ("obrigacao_id") REFERENCES "public"."obrigacoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_obrigacao_id_obrigacoes_id_fk" FOREIGN KEY ("obrigacao_id") REFERENCES "public"."obrigacoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obrigacoes" ADD CONSTRAINT "obrigacoes_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidencias" ADD CONSTRAINT "evidencias_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidencias" ADD CONSTRAINT "evidencias_veiculo_id_veiculos_id_fk" FOREIGN KEY ("veiculo_id") REFERENCES "public"."veiculos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acoes_pendentes" ADD CONSTRAINT "acoes_pendentes_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "membros_org_usuario" ON "membros" USING btree ("organizacao_id","usuario_id");--> statement-breakpoint
CREATE INDEX "locatarios_org" ON "locatarios" USING btree ("organizacao_id");--> statement-breakpoint
CREATE INDEX "veiculos_org" ON "veiculos" USING btree ("organizacao_id");--> statement-breakpoint
CREATE INDEX "contratos_org" ON "contratos" USING btree ("organizacao_id");--> statement-breakpoint
CREATE UNIQUE INDEX "versoes_modelo_versao" ON "versoes_modelo" USING btree ("modelo_id","versao");--> statement-breakpoint
CREATE UNIQUE INDEX "cobrancas_provedor" ON "cobrancas" USING btree ("provedor","provedor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lancamentos_chave" ON "lancamentos" USING btree ("chave");--> statement-breakpoint
CREATE INDEX "lancamentos_contrato" ON "lancamentos" USING btree ("contrato_id");--> statement-breakpoint
CREATE UNIQUE INDEX "obrigacoes_chave" ON "obrigacoes" USING btree ("chave");--> statement-breakpoint
CREATE INDEX "obrigacoes_vencimento" ON "obrigacoes" USING btree ("vencimento","status");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_eventos_unico" ON "webhook_eventos" USING btree ("provedor","evento_id");--> statement-breakpoint
CREATE UNIQUE INDEX "evidencias_sha256" ON "evidencias" USING btree ("organizacao_id","sha256");--> statement-breakpoint
CREATE INDEX "evidencias_contrato" ON "evidencias" USING btree ("contrato_id");--> statement-breakpoint
CREATE INDEX "auditoria_entidade" ON "auditoria" USING btree ("entidade","entidade_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notificacoes_chave" ON "notificacoes" USING btree ("chave");--> statement-breakpoint
CREATE INDEX "notificacoes_contrato" ON "notificacoes" USING btree ("contrato_id");