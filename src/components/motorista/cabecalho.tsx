import type { Route } from "next";
import Link from "next/link";
import { Marca } from "@/components/ui";
import { BotaoVoltar } from "@/components/voltar";
import { MenuMotorista } from "./menu";

const barra = "fixed inset-x-0 top-0 z-20 border-b border-borda bg-cartao/90 pt-[env(safe-area-inset-top)] backdrop-blur";
const espaco = <div className="mb-5 h-[calc(3.5rem+env(safe-area-inset-top))]" aria-hidden />;

/** Cabeçalho fixo das telas internas do app: voltar (para a tela anterior), título e menu. */
export function CabecalhoMotorista({ titulo, voltar = "/m" }: { titulo: string; voltar?: string }) {
  return (
    <>
      <header className={barra}>
        <div className="mx-auto flex h-14 max-w-[30rem] items-center gap-2 px-2">
          <BotaoVoltar destino={voltar} className="grid size-10 place-items-center rounded-full hover:bg-cartao-2" />
          <h1 className="min-w-0 flex-1 truncate text-base font-bold">{titulo}</h1>
          <MenuMotorista />
        </div>
      </header>
      {espaco}
    </>
  );
}

/** Cabeçalho fixo do início: logo (volta ao início) e menu. */
export function CabecalhoInicio({ inicio }: { inicio: string }) {
  return (
    <>
      <header className={barra}>
        <div className="mx-auto flex h-14 max-w-[30rem] items-center gap-2 pr-2 pl-4">
          <Link href={inicio as Route} className="flex-1" aria-label="Início do app"><Marca /></Link>
          <MenuMotorista />
        </div>
      </header>
      <div className="h-[calc(3.5rem+env(safe-area-inset-top))]" aria-hidden />
    </>
  );
}
