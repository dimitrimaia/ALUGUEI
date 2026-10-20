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
