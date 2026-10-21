import type { Metadata } from "next";
import { BuscaCarros } from "@/components/site/busca-carros";
import { CabecalhoPublico } from "@/components/site/cabecalho-publico";

export const metadata: Metadata = {
  title: "Carros para alugar",
  description: "Carros para rodar no Uber e na 99, com aluguel semanal. Busque pela sua cidade e converse com o locador pelo Aluguei.",
  openGraph: { title: "Carros para alugar · Aluguei", description: "Carros para rodar no Uber e na 99, com aluguel semanal. Busque pela sua cidade." },
};
export const dynamic = "force-dynamic";

/** Busca pública de carros para motoristas de app (RF-021). */
export default async function Carros({ searchParams }: { searchParams: Promise<{ cidade?: string }> }) {
  const { cidade } = await searchParams;

  return (
    <div className="tema-claro min-h-dvh bg-fundo">
      <CabecalhoPublico />
      <main className="mx-auto max-w-5xl px-5 pt-6 pb-16">
        <h1 className="text-[1.6rem] leading-tight font-extrabold tracking-tight sm:text-3xl">Carros para rodar no app</h1>
        <p className="mt-1 text-sm text-suave">Encontre um carro na sua cidade e converse com o locador pelo Aluguei.</p>

        <BuscaCarros cidade={cidade} base="/carros" />
      </main>
    </div>
  );
}
