import { NavegacaoPainel } from "@/components/painel/navegacao";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/servidor";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const { count } = await supabase
    .from("locatarios")
    .select("id", { count: "exact", head: true })
    .eq("organizacao_id", organizacao.id)
    .eq("status", "em_analise");

  return (
    <div className="min-h-dvh lg:flex">
      <NavegacaoPainel organizacao={organizacao.nome} pendentes={count ?? 0} />
      <main className="pb-barra mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">{children}</main>
    </div>
  );
}
