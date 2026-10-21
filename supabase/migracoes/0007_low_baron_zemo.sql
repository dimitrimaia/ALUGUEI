-- Migração 0007_low_baron_zemo. Gerado por scripts/gerar-setup-sql.mjs.
begin;
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
commit;
