CREATE TYPE "public"."autor_suporte" AS ENUM('usuario', 'equipe', 'agente', 'sistema');--> statement-breakpoint
CREATE TYPE "public"."status_atendimento" AS ENUM('aberto', 'respondido', 'encerrado');--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "inscricoes_push" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"dispositivo" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mensagens_suporte" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"atendimento_id" uuid NOT NULL,
	"autor" "autor_suporte" NOT NULL,
	"usuario_id" uuid,
	"texto" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notificacoes" ALTER COLUMN "organizacao_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contratos" ADD COLUMN "encerramento_motivo" text;--> statement-breakpoint
ALTER TABLE "contratos" ADD COLUMN "encerrado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contratos" ADD COLUMN "devolucao_em" date;--> statement-breakpoint
ALTER TABLE "contratos" ADD COLUMN "caucao_devolver_centavos" integer;--> statement-breakpoint
ALTER TABLE "contratos" ADD COLUMN "caucao_devolver_ate" date;--> statement-breakpoint
ALTER TABLE "contratos" ADD COLUMN "caucao_devolvida_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notificacoes" ADD COLUMN "titulo" text;--> statement-breakpoint
ALTER TABLE "notificacoes" ADD COLUMN "link" text;--> statement-breakpoint
ALTER TABLE "mensagens_suporte" ADD CONSTRAINT "mensagens_suporte_atendimento_id_atendimentos_id_fk" FOREIGN KEY ("atendimento_id") REFERENCES "public"."atendimentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "atendimentos_usuario" ON "atendimentos" USING btree ("usuario_id","ultima_mensagem_em");--> statement-breakpoint
CREATE INDEX "atendimentos_status" ON "atendimentos" USING btree ("status","ultima_mensagem_em");--> statement-breakpoint
CREATE UNIQUE INDEX "inscricoes_push_endpoint" ON "inscricoes_push" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "inscricoes_push_usuario" ON "inscricoes_push" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "mensagens_suporte_atendimento" ON "mensagens_suporte" USING btree ("atendimento_id","criado_em");--> statement-breakpoint
CREATE INDEX "notificacoes_destinatario" ON "notificacoes" USING btree ("destinatario_usuario_id","canal","criado_em");--> statement-breakpoint
-- Aparelhos do push: cada pessoa vê só os seus; escrita pelo servidor.
ALTER TABLE "inscricoes_push" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "inscricoes_push_dono_le" ON "inscricoes_push" FOR SELECT USING ("usuario_id" = auth.uid());--> statement-breakpoint
-- Avisos do app: o destinatário lê os seus (o tempo real respeita esta regra).
CREATE POLICY "notificacoes_destinatario_le" ON "notificacoes" FOR SELECT USING ("destinatario_usuario_id" = auth.uid());--> statement-breakpoint
-- Suporte: a pessoa lê os próprios atendimentos; escrita e leitura da equipe pelo servidor.
ALTER TABLE "atendimentos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "atendimentos_dono_le" ON "atendimentos" FOR SELECT USING ("usuario_id" = auth.uid());--> statement-breakpoint
ALTER TABLE "mensagens_suporte" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "mensagens_suporte_dono_le" ON "mensagens_suporte" FOR SELECT USING ("atendimento_id" IN (SELECT "id" FROM "atendimentos"));--> statement-breakpoint
ALTER PUBLICATION supabase_realtime ADD TABLE "mensagens_suporte";--> statement-breakpoint
ALTER PUBLICATION supabase_realtime ADD TABLE "notificacoes";
