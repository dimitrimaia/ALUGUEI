import type { Route } from "next";
import Link from "next/link";
import { Filtros, quando, Tabela, TituloAdmin } from "@/components/admin/ui";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Ações pendentes" };

/**
 * Propostas que o sistema fez aos locadores (rescisão, retomada, protesto...).
 * Só acompanhamento: quem decide é sempre o locador, nunca o sistema nem a equipe.
 */
export default async function Acoes({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s = "pendente" } = await searchParams;
  const admin = supabaseAdmin();
  let q = admin.from("acoes_pendentes").select("*").order("criado_em", { ascending: false }).limit(500);
  if (s) q = q.eq("status", s);
  const [{ data: acoes }, { data: orgs }] = await Promise.all([q, admin.from("organizacoes").select("id, nome").limit(5000)]);
  return (
    <main className="mx-auto max-w-6xl">
      <TituloAdmin titulo="Ações pendentes" subtitulo="Decisões que esperam o locador. A equipe acompanha; não decide por ele." />
      <Filtros base="/admin/acoes" param="s" atual={s} opcoes={[["pendente", "Pendentes"], ["aprovada", "Aprovadas"], ["recusada", "Recusadas"], ["", "Todas"]]} />
      <Tabela
        colunas={["Tipo", "Locadora", "Motivo", "Status", "Criada"]}
        linhas={(acoes ?? []).map((a) => ({ chave: a.id, celulas: [a.tipo, <Link key="o" href={`/admin/locadoras/${a.organizacao_id}` as Route} className="text-marca">{orgs?.find((o) => o.id === a.organizacao_id)?.nome ?? "—"}</Link>, a.motivo, a.status, quando(a.criado_em, true)] }))}
        vazio="Nenhuma ação."
      />
    </main>
  );
}
