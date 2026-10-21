import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IndiceConta } from "@/components/conta/secoes";
import { CabecalhoPagina } from "@/components/ui";
import { perfilDaConta } from "@/lib/conta";
import { exigirEquipe } from "@/lib/sessao";
import { verificacaoLocador } from "@/lib/verificacao-conta";

export const metadata: Metadata = { title: "Perfil e configurações" };

export default async function ContaLocador() {
  const { organizacao, papel } = await exigirEquipe();
  const perfil = await perfilDaConta();
  if (!perfil) redirect("/entrar?perfil=locador&voltar=/painel/conta");
  return (
    <div className="mx-auto max-w-2xl">
      <CabecalhoPagina titulo="Perfil e configurações" subtitulo={organizacao.nome} />
      <IndiceConta perfil={perfil} papel="locador" base="/painel/conta" verificacao={await verificacaoLocador(perfil, organizacao.id)} rotuloPapel={papel === "dono" ? "Locador · dono da conta" : "Locador · operador"} />
    </div>
  );
}
