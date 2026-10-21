import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IndiceConta } from "@/components/conta/secoes";
import { CabecalhoPagina } from "@/components/ui";
import { perfilDaConta } from "@/lib/conta";
import { exigirEquipe } from "@/lib/sessao";
import { verificacaoDaConta } from "@/lib/verificacao-conta";

export const metadata: Metadata = { title: "Perfil e configurações" };

export default async function ContaLocador() {
  const { organizacao, papel } = await exigirEquipe();
  const perfil = await perfilDaConta();
  if (!perfil) redirect("/entrar?voltar=/painel/conta");
  return (
    <div className="mx-auto max-w-2xl">
      <CabecalhoPagina titulo="Perfil e configurações" />
      <IndiceConta perfil={perfil} base="/painel/conta" locadora={{ nome: organizacao.nome, papel }} verificacao={await verificacaoDaConta(perfil, "/painel/conta", organizacao.id)} />
    </div>
  );
}
