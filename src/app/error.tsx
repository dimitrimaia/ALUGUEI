"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Botao, Marca } from "@/components/ui";
import { erroDeVersao, recarregarUmaVez } from "@/lib/versao";

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Tela de uma versão antiga do site: recarrega sozinho, sem mostrar o erro.
  const [recarregando, setRecarregando] = useState(false);
  useEffect(() => {
    if (erroDeVersao(error) && recarregarUmaVez()) setRecarregando(true);
  }, [error]);
  if (recarregando) return <main className="grid min-h-dvh place-items-center bg-fundo text-sm text-suave">Atualizando o app…</main>;
  return (
    <main className="grid min-h-dvh place-items-center bg-fundo px-4 py-10">
      <div className="flex max-w-md flex-col items-center text-center">
        <Link href="/" className="mb-10"><Marca /></Link>
        <span className="grid size-16 place-items-center rounded-2xl bg-perigo-suave text-perigo"><TriangleAlert size={30} /></span>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Algo deu errado</h1>
        <p className="mt-2 text-suave">Não conseguimos carregar esta tela. Tente de novo; se continuar, volte ao início.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Botao tamanho="lg" icone={RotateCcw} onClick={() => (recarregarUmaVez() ? null : reset())}>Tentar de novo</Botao>
          <Link href="/inicio" className="inline-flex h-13 items-center justify-center rounded-xl border border-borda-forte bg-cartao px-6 font-semibold">Ir para minha área</Link>
        </div>
      </div>
    </main>
  );
}
