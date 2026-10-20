import { NavegacaoPainel } from "@/components/painel/navegacao";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/servidor";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const { organizacao, usuario } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const { count } = await supabase
    .from("locatarios")
    .select("id", { count: "exact", head: true })
    .eq("organizacao_id", organizacao.id)
    .eq("status", "em_analise");

  return (
    <div className="min-h-dvh lg:flex">
      <NavegacaoPainel organizacao={organizacao.nome} usuario={usuario.email ?? usuario.telefone ?? "Conta"} pendentes={count ?? 0} />
      <main className="pb-barra mx-auto w-full max-w-[84rem] px-4 pt-6 sm:px-6 lg:px-10 lg:pt-24 lg:pb-14">{children}</main>
    </div>
  );
}
