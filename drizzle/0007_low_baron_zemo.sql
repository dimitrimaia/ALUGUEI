ALTER TABLE "atendimentos" ALTER COLUMN "usuario_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD COLUMN "canal" text DEFAULT 'app' NOT NULL;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD COLUMN "telefone" text;--> statement-breakpoint
CREATE INDEX "atendimentos_telefone" ON "atendimentos" USING btree ("canal","telefone");--> statement-breakpoint
-- Acha a conta pelo celular confirmado (para o atendimento pelo WhatsApp). Só o servidor chama.
CREATE OR REPLACE FUNCTION public.usuario_por_telefone(telefones text[]) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT id FROM auth.users WHERE phone = ANY(telefones) AND phone_confirmed_at IS NOT NULL ORDER BY created_at LIMIT 1
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.usuario_por_telefone(text[]) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.usuario_por_telefone(text[]) TO service_role;
