import { notFound, redirect } from "next/navigation";
import { SECOES, SecaoConta, eSecao } from "@/components/conta/secoes";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { perfilDaConta } from "@/lib/conta";
import { verificacaoMotorista } from "@/lib/verificacao-conta";

export async function generateMetadata({ params }: { params: Promise<{ secao: string }> }) {
  const { secao } = await params;
  return { title: eSecao(secao, "motorista") ? SECOES[secao].titulo : "Conta" };
}

export default async function SecaoMotorista({ params }: { params: Promise<{ secao: string }> }) {
  const { secao } = await params;
  if (!eSecao(secao, "motorista")) notFound();
  const perfil = await perfilDaConta();
  if (!perfil) redirect(`/entrar?perfil=motorista&voltar=/m/conta/${secao}`);
  return (
    <>
      <CabecalhoMotorista titulo={SECOES[secao].titulo} voltar="/m/conta" />
      <SecaoConta secao={secao} perfil={perfil} papel="motorista" base="/m/conta" verificacao={secao === "verificacao" ? await verificacaoMotorista(perfil) : []} />
    </>
  );
}
