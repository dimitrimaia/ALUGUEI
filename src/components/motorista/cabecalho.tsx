import { BotaoVoltar } from "@/components/voltar";
import { MenuMotorista } from "./menu";

/** Cabeçalho das telas internas do app: voltar (para a tela anterior), título e menu. */
export function CabecalhoMotorista({ titulo, voltar = "/m" }: { titulo: string; voltar?: string }) {
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-5 flex items-center gap-2 border-b border-borda bg-cartao/90 px-2 py-2.5 backdrop-blur">
      <BotaoVoltar destino={voltar} className="grid size-10 place-items-center rounded-full hover:bg-cartao-2" />
      <h1 className="min-w-0 flex-1 truncate text-base font-bold">{titulo}</h1>
      <MenuMotorista />
    </header>
  );
}
