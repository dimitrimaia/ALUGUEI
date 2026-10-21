import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IndiceConta } from "@/components/conta/secoes";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { perfilDaConta } from "@/lib/conta";
import { verificacaoMotorista } from "@/lib/verificacao-conta";

export const metadata: Metadata = { title: "Conta" };

export default async function ContaMotorista() {
  const perfil = await perfilDaConta();
  if (!perfil) redirect("/entrar?perfil=motorista&voltar=/m/conta");
  return (
    <>
      <CabecalhoMotorista titulo="Perfil e configurações" />
      <IndiceConta perfil={perfil} papel="motorista" base="/m/conta" verificacao={await verificacaoMotorista(perfil)} rotuloPapel="Motorista" />
    </>
  );
}
