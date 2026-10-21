"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

const CHAVE = "aluguei_paginas";

/** Conta as telas visitadas nesta aba, para o "voltar" saber se há uma tela anterior do app. */
export function RegistroNavegacao() {
  const caminho = usePathname();
  useEffect(() => {
    try {
      sessionStorage.setItem(CHAVE, String(Number(sessionStorage.getItem(CHAVE) ?? 0) + 1));
    } catch {}
  }, [caminho]);
  return null;
}

/**
 * Volta para a tela anterior, como o voltar do celular. Se a pessoa chegou
 * direto (link do WhatsApp, por exemplo), vai para `destino`.
 */
export function BotaoVoltar({ destino, className, children, rotulo = "Voltar" }: { destino: string; className?: string; children?: ReactNode; rotulo?: string }) {
  const router = useRouter();
  function voltar() {
    let visitadas = 0;
    try {
      visitadas = Number(sessionStorage.getItem(CHAVE) ?? 0);
    } catch {}
    if (visitadas > 1 && history.length > 1) router.back();
    else router.replace(destino as never);
  }
  return (
    <button type="button" onClick={voltar} aria-label={children ? undefined : rotulo} className={className}>
      {children ?? <ChevronLeft size={22} />}
    </button>
  );
}
