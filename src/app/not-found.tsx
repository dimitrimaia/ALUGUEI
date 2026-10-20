import { ArrowLeft, Compass } from "lucide-react";
import Link from "next/link";
import { BotaoLink, Marca } from "@/components/ui";

export default function NaoEncontrada() {
  return (
    <main className="grid min-h-dvh place-items-center bg-fundo px-4 py-10">
      <div className="flex max-w-md flex-col items-center text-center">
        <Link href="/" className="mb-10"><Marca /></Link>
        <span className="grid size-16 place-items-center rounded-2xl bg-marca-suave text-marca"><Compass size={30} /></span>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Página não encontrada</h1>
        <p className="mt-2 text-suave">O endereço pode ter mudado, ou o link já não vale mais. Se recebeu um convite, peça um novo ao locador.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <BotaoLink href="/inicio" tamanho="lg">Ir para minha área</BotaoLink>
          <BotaoLink href="/" tamanho="lg" variante="secundario"><ArrowLeft size={18} /> Site do Aluguei</BotaoLink>
        </div>
      </div>
    </main>
  );
}
