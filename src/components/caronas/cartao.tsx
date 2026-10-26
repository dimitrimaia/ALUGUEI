import { ArrowDown, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Avatar } from "@/components/ui";
import type { Linha } from "@/db/tipos";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { quando } from "@/lib/caronas";

export function CartaoCarona({ c, livres, motorista, href }: { c: Linha<"caronas">; livres: number; motorista?: { nome: string; foto: string | null }; href: string }) {
  return (
    <Link href={href as Route} className="block rounded-[1.1rem] border border-borda bg-cartao p-4 shadow-cartao transition-transform active:scale-[0.99]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-marca capitalize">{quando(c.partida)}</p>
          <p className="mt-1 truncate font-bold">{c.origem_cidade} <span className="font-normal text-suave">{c.origem_uf}</span></p>
          <ArrowDown size={14} className="my-0.5 text-suave" />
          <p className="truncate font-bold">{c.destino_cidade} <span className="font-normal text-suave">{c.destino_uf}</span></p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-extrabold tabular-nums">{formatarBRL(c.contribuicao_centavos)}</p>
          <p className="text-[0.7rem] text-suave">por pessoa</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-borda pt-3 text-xs text-suave">
        {motorista ? (
          <span className="flex min-w-0 items-center gap-2"><Avatar nome={motorista.nome} foto={motorista.foto} tamanho="sm" /><span className="truncate font-semibold text-texto">{motorista.nome}</span></span>
        ) : <span>{c.km} km</span>}
        <span className={`flex items-center gap-1 font-semibold ${livres > 0 ? "text-ok" : "text-perigo"}`}><Users size={14} /> {livres > 0 ? `${livres} ${livres === 1 ? "vaga" : "vagas"}` : "Lotada"}</span>
      </div>
    </Link>
  );
}
