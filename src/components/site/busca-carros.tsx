import { Car, Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { CartaoAnuncio } from "@/components/site/cartao-anuncio";
import { Vazio } from "@/components/ui";
import { buscarAnuncios, cidadesComAnuncios } from "@/lib/marketplace";

/** Campo de cidade, atalhos por cidade e resultados. Usado no site (/carros) e no app (/m/buscar). */
export async function BuscaCarros({ cidade, base }: { cidade?: string; base: "/carros" | "/m/buscar" }) {
  const [anuncios, cidades] = await Promise.all([buscarAnuncios(cidade), cidadesComAnuncios()]);
  return (
    <>
      <form className={`flex gap-2 ${base === "/carros" ? "mt-5" : ""}`} action={base}>
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
          <Link href={base} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${!cidade ? "border-marca bg-marca text-white" : "border-borda bg-cartao"}`}>Todas</Link>
          {cidades.map((c) => (
            <Link key={`${c.cidade}${c.uf}`} href={`${base}?cidade=${encodeURIComponent(c.cidade)}` as Route} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${cidade?.toLowerCase() === c.cidade.toLowerCase() ? "border-marca bg-marca text-white" : "border-borda bg-cartao"}`}>
              {c.cidade}/{c.uf} · {c.total}
            </Link>
          ))}
        </div>
      )}

      <p className="mt-6 mb-3 text-sm font-semibold text-suave">{anuncios.length === 1 ? "1 carro disponível" : `${anuncios.length} carros disponíveis`}{cidade ? ` em ${cidade}` : ""}</p>
      {anuncios.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{anuncios.map((a) => <CartaoAnuncio key={a.id} a={a} doApp={base === "/m/buscar"} />)}</div>
      ) : (
        <Vazio icone={Car} titulo="Nenhum carro por aqui ainda">
          {cidade ? "Tente outra cidade, ou veja todos os carros anunciados." : "Os carros anunciados pelos locadores aparecem aqui."}
        </Vazio>
      )}
    </>
  );
}
