import { ProvedorConta } from "@/components/conta/contexto";
import { NavegacaoPainel } from "@/components/painel/navegacao";
import { contaDoLocador } from "@/lib/cobrancas";
import { perfilResumido } from "@/lib/conta";
import { conversasNaoLidasDoLocador } from "@/lib/conversas";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/servidor";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const { organizacao, usuario } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const [conta, naoLidas, perfil, { count }] = await Promise.all([
    contaDoLocador(organizacao.id).catch(() => null),
    conversasNaoLidasDoLocador(organizacao.id).catch(() => 0),
    perfilResumido(),
    supabase.from("locatarios").select("id", { count: "exact", head: true }).eq("organizacao_id", organizacao.id).eq("status", "em_analise"),
  ]);
  const valor = {
    perfil: { nome: perfil?.nome ?? organizacao.nome, foto: perfil?.foto ?? null, detalhe: usuario.email ?? usuario.telefone ?? "Locador" },
    naoLidas,
    modo: "locador" as const,
    locadora: organizacao.nome,
    avisos: naoLidas + (count ?? 0),
  };

  return (
    <ProvedorConta valor={valor} tema={perfil?.tema ?? "claro"}>
      <div className="min-h-dvh lg:flex">
        <NavegacaoPainel organizacao={organizacao.nome} pendentes={count ?? 0} recebimentosAtivos={Boolean(conta)} />
        <main className="pb-barra mx-auto w-full max-w-[84rem] px-4 pt-4 sm:px-6 lg:px-10 lg:pt-24 lg:pb-14">{children}</main>
      </div>
    </ProvedorConta>
  );
}
