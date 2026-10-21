import type { Route } from "next";
import Link from "next/link";

/** As duas abas de "Meus carros", iguais nos dois modos: os que eu aluguei e os que eu anuncio. */
export function AbasMeusCarros({ atual }: { atual: "alugados" | "anunciados" }) {
  const abas = [
    { id: "alugados", rotulo: "Que eu aluguei", href: "/m/carros" },
    { id: "anunciados", rotulo: "Que eu anuncio", href: "/m/carros?aba=anunciados" },
  ] as const;
  return (
    <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-cartao-2 p-1 ring-1 ring-borda" role="tablist">
      {abas.map((a) => (
        <Link key={a.id} href={a.href as Route} role="tab" aria-selected={atual === a.id} replace
          className={`rounded-lg py-2 text-center text-sm font-semibold ${atual === a.id ? "bg-cartao text-texto shadow-cartao" : "text-suave"}`}>
          {a.rotulo}
        </Link>
      ))}
    </div>
  );
}
