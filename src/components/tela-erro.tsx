"use client";

import { RotateCcw, TriangleAlert, WifiOff } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { Botao } from "@/components/ui";
import { erroDeVersao, recarregarUmaVez } from "@/lib/versao";

const CHAVE = "aluguei_tentativas";
const ESPERAS = [350, 1200]; // duas tentativas automáticas antes de mostrar o erro

function tentativas(caminho: string): number {
  try {
    const t = JSON.parse(sessionStorage.getItem(CHAVE) ?? "{}") as { caminho?: string; n?: number; em?: number };
    // Conta só tentativas recentes desta mesma tela.
    return t.caminho === caminho && Date.now() - (t.em ?? 0) < 20_000 ? (t.n ?? 0) : 0;
  } catch {
    return 0;
  }
}
function anotar(caminho: string, n: number) {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify({ caminho, n, em: Date.now() }));
  } catch {}
}

/**
 * Erro numa tela: quase sempre é a rede do celular oscilando. Tenta de novo
 * sozinho (duas vezes, em silêncio), registra o motivo e só então mostra o aviso.
 */
export function TelaErro({ error, reset, cheia = false }: { error: Error & { digest?: string }; reset: () => void; cheia?: boolean }) {
  const router = useRouter();
  const caminho = usePathname();
  const [mostrar, setMostrar] = useState(false);
  const semRede = typeof navigator !== "undefined" && navigator.onLine === false;

  useEffect(() => {
    const n = tentativas(caminho);
    navigator.sendBeacon?.("/api/erros", new Blob([JSON.stringify({ mensagem: `${error.name}: ${error.message}`, digest: error.digest, caminho, tentativa: n })], { type: "application/json" }));
    if (erroDeVersao(error) && recarregarUmaVez()) return;
    if (n >= ESPERAS.length) return setMostrar(true);
    const t = window.setTimeout(() => {
      anotar(caminho, n + 1);
      startTransition(() => {
        router.refresh();
        reset();
      });
    }, ESPERAS[n]);
    return () => window.clearTimeout(t);
  }, [error, caminho, reset, router]);

  const tentar = () => {
    anotar(caminho, 0);
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  if (!mostrar) {
    return (
      <div className={`grid place-items-center ${cheia ? "min-h-dvh" : "min-h-[50vh]"}`} aria-busy>
        <span className="size-7 animate-spin rounded-full border-[3px] border-marca/25 border-t-marca" />
      </div>
    );
  }
  return (
    <div className={`grid place-items-center px-4 py-10 ${cheia ? "min-h-dvh bg-fundo" : "min-h-[60vh]"}`}>
      <div className="flex max-w-sm flex-col items-center text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-perigo-suave text-perigo">{semRede ? <WifiOff size={26} /> : <TriangleAlert size={26} />}</span>
        <h1 className="mt-4 text-xl font-extrabold tracking-tight">{semRede ? "Sem internet" : "Não carregou"}</h1>
        <p className="mt-1.5 text-sm text-suave">{semRede ? "Confira a conexão do celular e tente de novo." : "A conexão oscilou. Tente de novo; se continuar, volte ao início."}</p>
        <div className="mt-6 flex w-full flex-col gap-2">
          <Botao tamanho="lg" icone={RotateCcw} onClick={tentar}>Tentar de novo</Botao>
          <Link href="/inicio" className="text-sm font-semibold text-marca">Ir para o início</Link>
        </div>
      </div>
    </div>
  );
}
