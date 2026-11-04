import type { Route } from "next";
import Link from "next/link";
import { Placa } from "@/components/ui";
import { Filtros, quando, Tabela, TituloAdmin } from "@/components/admin/ui";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Carros" };

export default async function Carros({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v = "" } = await searchParams;
  const admin = supabaseAdmin();
  let q = admin.from("veiculos").select("*").order("criado_em", { ascending: false }).limit(1000);
  if (v) q = q.eq("verificacao", v as "pendente");
  const [{ data: carros }, { data: orgs }] = await Promise.all([q, admin.from("organizacoes").select("id, nome").limit(5000)]);
  const nome = (id: string) => orgs?.find((o) => o.id === id)?.nome ?? "—";
  return (
    <main className="mx-auto max-w-6xl">
      <TituloAdmin titulo="Carros" subtitulo={`${carros?.length ?? 0} carros`} acao={<Link href="/admin/verificacoes" className="text-sm font-semibold text-marca">Fila de verificação →</Link>} />
      <Filtros base="/admin/carros" param="v" atual={v} opcoes={[["", "Todos"], ["em_analise", "Em análise"], ["verificado", "Verificados"], ["pendente", "Sem CRLV"], ["recusado", "Recusados"]]} />
      <Tabela
        colunas={["Placa", "Modelo", "Locadora", "Situação", "Verificação", "Cadastrado"]}
        linhas={(carros ?? []).map((c) => ({ chave: c.id, celulas: [<Placa key="p" placa={c.placa} tamanho="sm" />, c.modelo, <Link key="o" href={`/admin/locadoras/${c.organizacao_id}` as Route} className="text-marca">{nome(c.organizacao_id)}</Link>, c.status, c.verificacao + (c.verificacao_motivo ? ` · ${c.verificacao_motivo}` : ""), quando(c.criado_em, true)] }))}
        vazio="Nenhum carro."
      />
    </main>
  );
}
