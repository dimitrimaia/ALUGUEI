import { Car, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoPublico } from "@/components/site/cabecalho-publico";
import { CartaoAnuncio } from "@/components/site/cartao-anuncio";
import { Vazio } from "@/components/ui";
import { buscarAnuncios, cidadesComAnuncios } from "@/lib/marketplace";

export const metadata: Metadata = { title: "Carros para alugar" };
export const dynamic = "force-dynamic";

/** Busca pública de carros para motoristas de app (RF-021). */
export default async function Carros({ searchParams }: { searchParams: Promise<{ cidade?: string }> }) {
  const { cidade } = await searchParams;
  const [anuncios, cidades] = await Promise.all([buscarAnuncios(cidade), cidadesComAnuncios()]);

  return (
    <div className="tema-claro min-h-dvh bg-fundo">
      <CabecalhoPublico />
      <main className="mx-auto max-w-5xl px-5 pt-6 pb-16">
        <h1 className="text-[1.6rem] leading-tight font-extrabold tracking-tight sm:text-3xl">Carros para rodar no app</h1>
        <p className="mt-1 text-sm text-suave">Encontre um carro na sua cidade e converse com o locador pelo Aluguei.</p>

        <form className="mt-5 flex gap-2" action="/carros">
          <label className="relative flex-1">
            <span className="sr-only">Cidade</span>
            <Search size={17} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-suave" />
            <input name="cidade" defaultValue={cidade} placeholder="Em qual cidade você roda?" list="cidades" className="h-11 w-full rounded-xl border border-borda bg-cartao pr-3 pl-10 text-base outline-none focus:border-marca sm:text-sm" />
            <datalist id="cidades">{cidades.map((c) => <option key={`${c.cidade}${c.uf}`} value={c.cidade} />)}</datalist>
          </label>
          <button className="h-11 rounded-xl bg-marca px-5 text-sm font-semibold text-white shadow-marca">Buscar</button>
        </form>

        {!!cidades.length && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <Link href="/carros" className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${!cidade ? "border-marca bg-marca text-white" : "border-borda bg-cartao"}`}>Todas</Link>
            {cidades.map((c) => (
              <Link key={`${c.cidade}${c.uf}`} href={`/carros?cidade=${encodeURIComponent(c.cidade)}`} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${cidade?.toLowerCase() === c.cidade.toLowerCase() ? "border-marca bg-marca text-white" : "border-borda bg-cartao"}`}>
                {c.cidade}/{c.uf} · {c.total}
              </Link>
            ))}
          </div>
        )}

        <p className="mt-6 mb-3 text-sm font-semibold text-suave">{anuncios.length === 1 ? "1 carro disponível" : `${anuncios.length} carros disponíveis`}{cidade ? ` em ${cidade}` : ""}</p>
        {anuncios.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{anuncios.map((a) => <CartaoAnuncio key={a.id} a={a} />)}</div>
        ) : (
          <Vazio icone={Car} titulo="Nenhum carro por aqui ainda">
            {cidade ? "Tente outra cidade, ou veja todos os carros anunciados." : "Os carros anunciados pelos locadores aparecem aqui."}
          </Vazio>
        )}
      </main>
    </div>
  );
}
