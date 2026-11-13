import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IndiceConta } from "@/components/conta/secoes";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { perfilDaConta } from "@/lib/conta";
import { locadoraDoUsuario } from "@/lib/modos";
import { verificacaoDaConta } from "@/lib/verificacao-conta";
import { ChaveModoPiloto } from "@/components/motorista/modo-piloto";
import { usoCopiloto } from "@/lib/uso-copiloto";

export const metadata: Metadata = { title: "Conta" };

export default async function ContaMotorista() {
  const perfil = await perfilDaConta();
  if (!perfil) redirect("/entrar?voltar=/m/conta");
  const locadora = await locadoraDoUsuario(perfil.id);
  return (
    <>
      <CabecalhoMotorista raiz titulo="Perfil e configurações" />
      <IndiceConta perfil={perfil} base="/m/conta" locadora={locadora} extraTrabalho={<ChaveModoPiloto ligado={(await usoCopiloto(perfil.id)) !== "nao"} />} verificacao={await verificacaoDaConta(perfil, "/m/conta", locadora?.id ?? null)} />
    </>
  );
}
