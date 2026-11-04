import { Selo } from "@/components/ui";
import { quando, Tabela, TituloAdmin } from "@/components/admin/ui";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Locadoras" };

export default async function Locadoras({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const admin = supabaseAdmin();
  const [{ data: orgs }, { data: carros }, { data: contratos }] = await Promise.all([
    admin.from("organizacoes").select("*").order("criado_em", { ascending: false }).limit(2000),
    admin.from("veiculos").select("organizacao_id").limit(20_000),
    admin.from("contratos").select("organizacao_id").eq("status", "ativo").limit(20_000),
  ]);
  const contar = (l: { organizacao_id: string }[] | null, id: string) => (l ?? []).filter((x) => x.organizacao_id === id).length;
  const busca = q.trim().toLowerCase();
  const lista = (orgs ?? []).filter((o) => !busca || [o.nome, o.documento, o.cidade].some((x) => x?.toLowerCase().includes(busca)));
  return (
    <main className="mx-auto max-w-6xl">
      <TituloAdmin titulo="Locadoras" subtitulo={`${lista.length} locadoras`} />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar por nome, CPF/CNPJ ou cidade" className="h-10 flex-1 rounded-xl border border-borda bg-cartao px-3 text-sm" />
        <button className="h-10 rounded-xl bg-marca px-4 text-sm font-semibold text-white">Buscar</button>
      </form>
      <Tabela
        colunas={["Locadora", "Documento", "Cidade", "Carros", "Contratos ativos", "Mensalidade/carro", "Desde"]}
        linhas={lista.map((o) => ({
          chave: o.id,
          href: `/admin/locadoras/${o.id}`,
          celulas: [<span key="n" className="flex items-center gap-1.5">{o.nome}{o.modo_assistido && <Selo tom="info">assistido</Selo>}</span>, o.documento, `${o.cidade}/${o.uf}`, contar(carros, o.id), contar(contratos, o.id), formatarBRL(o.mensalidade_por_carro_centavos), quando(o.criado_em, true)],
        }))}
        vazio="Nenhuma locadora."
      />
    </main>
  );
}
