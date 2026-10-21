import { ArrowLeft, UserRound } from "lucide-react";
import Link from "next/link";
import { BotaoLink, Marca } from "@/components/ui";
import { BotaoVoltar } from "@/components/voltar";
import { usuarioAtual } from "@/lib/sessao";

/** Cabeçalho das páginas públicas claras (busca de carros e anúncio). */
export async function CabecalhoPublico({ voltar }: { voltar?: { href: string; rotulo: string } }) {
  const usuario = await usuarioAtual();
  return (
    <header className="sticky top-0 z-30 border-b border-borda bg-cartao/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-5">
        {voltar ? (
          <BotaoVoltar destino={voltar.href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-suave hover:text-texto"><ArrowLeft size={17} /> {voltar.rotulo}</BotaoVoltar>
        ) : (
          <Link href="/?para=motorista" aria-label="Aluguei, início"><Marca /></Link>
        )}
        {usuario ? (
          <BotaoLink href="/inicio" tamanho="sm" icone={UserRound}>Minha área</BotaoLink>
        ) : (
          <BotaoLink href="/entrar?perfil=motorista" tamanho="sm" variante="secundario">Entrar</BotaoLink>
        )}
      </div>
    </header>
  );
}
