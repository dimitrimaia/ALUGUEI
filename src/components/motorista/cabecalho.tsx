import { ChevronLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

/** Cabeçalho das telas internas do app do motorista. */
export function CabecalhoMotorista({ titulo, voltar = "/m" }: { titulo: string; voltar?: string }) {
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-5 flex items-center gap-2 border-b border-borda bg-cartao/90 px-2 py-2.5 backdrop-blur">
      <Link href={voltar as Route} className="grid size-10 place-items-center rounded-full hover:bg-cartao-2" aria-label="Voltar">
        <ChevronLeft size={22} />
      </Link>
      <h1 className="text-base font-bold">{titulo}</h1>
    </header>
  );
}
