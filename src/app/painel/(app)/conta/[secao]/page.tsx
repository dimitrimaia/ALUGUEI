import { notFound, redirect } from "next/navigation";
import { SECOES, SecaoConta, eSecao } from "@/components/conta/secoes";
import { CabecalhoPagina } from "@/components/ui";
import { perfilDaConta } from "@/lib/conta";
import { exigirEquipe } from "@/lib/sessao";
import { verificacaoLocador } from "@/lib/verificacao-conta";

export async function generateMetadata({ params }: { params: Promise<{ secao: string }> }) {
  const { secao } = await params;
  return { title: eSecao(secao, "locador") ? SECOES[secao].titulo : "Configurações" };
}

export default async function SecaoLocador({ params }: { params: Promise<{ secao: string }> }) {
  const { secao } = await params;
  if (!eSecao(secao, "locador")) notFound();
  const { organizacao, papel } = await exigirEquipe();
  const perfil = await perfilDaConta();
  if (!perfil) redirect(`/entrar?perfil=locador&voltar=/painel/conta/${secao}`);
  return (
    <div className="mx-auto max-w-2xl">
      <CabecalhoPagina titulo={SECOES[secao].titulo} voltar={{ href: "/painel/conta", rotulo: "Configurações" }} />
      <SecaoConta
        secao={secao}
        perfil={perfil}
        papel="locador"
        base="/painel/conta"
        verificacao={secao === "verificacao" ? await verificacaoLocador(perfil, organizacao.id) : []}
        locadora={{ nome: organizacao.nome, cidade: organizacao.cidade, uf: organizacao.uf, documento: organizacao.documento, modoAssistido: organizacao.modo_assistido, podeEditar: papel === "dono" }}
      />
    </div>
  );
}
