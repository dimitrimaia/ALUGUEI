-- Migração 0006_elite_black_panther. Gerado por scripts/gerar-setup-sql.mjs.
begin;
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
commit;
