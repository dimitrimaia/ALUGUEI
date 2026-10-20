import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { BotaoLink, Marca } from "@/components/ui";

/** Cabeçalho das páginas públicas claras (busca de carros e anúncio). */
export function CabecalhoPublico({ voltar }: { voltar?: { href: string; rotulo: string } }) {
  return (
    <header className="sticky top-0 z-30 border-b border-borda bg-cartao/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-5">
        {voltar ? (
          <Link href={voltar.href as Route} className="inline-flex items-center gap-1.5 text-sm font-semibold text-suave hover:text-texto"><ArrowLeft size={17} /> {voltar.rotulo}</Link>
        ) : (
          <Link href="/?para=motorista" aria-label="Aluguei, início"><Marca /></Link>
        )}
        <BotaoLink href="/entrar?perfil=motorista" tamanho="sm" variante="secundario">Entrar</BotaoLink>
      </div>
    </header>
  );
}
