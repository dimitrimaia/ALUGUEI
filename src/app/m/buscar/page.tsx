import type { Metadata } from "next";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { BuscaCarros } from "@/components/site/busca-carros";

export const metadata: Metadata = { title: "Buscar carros" };

/** A busca de carros dentro do app, com as abas embaixo. */
export default async function Buscar({ searchParams }: { searchParams: Promise<{ cidade?: string }> }) {
  const { cidade } = await searchParams;
  return (
    <>
      <CabecalhoMotorista titulo="Buscar carros" />
      <p className="-mt-1 text-sm text-suave">Encontre um carro na sua cidade e converse com o locador por aqui.</p>
      <BuscaCarros cidade={cidade} base="/m/buscar" />
    </>
  );
}
