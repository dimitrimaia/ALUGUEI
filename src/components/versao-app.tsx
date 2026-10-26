"use client";

import { useEffect } from "react";

/**
 * Quando o app volta para a frente (ou a cada 15 min), confere se saiu uma
 * versão nova do site; se saiu, recarrega antes que alguma ação dê erro.
 */
export function VersaoApp() {
  useEffect(() => {
    const minha = process.env.NEXT_PUBLIC_VERSAO;
    if (!minha || minha === "local") return;
    let ultimo = Date.now();
    async function conferir() {
      if (document.visibilityState !== "visible") return;
      ultimo = Date.now();
      try {
        const r = await fetch("/api/versao", { cache: "no-store" });
        const { versao } = (await r.json()) as { versao?: string };
        // Não recarrega com alguém digitando.
        const digitando = document.activeElement?.matches("input, textarea, select");
        if (versao && versao !== minha && !digitando) window.location.reload();
      } catch {}
    }
    const aoVoltar = () => document.visibilityState === "visible" && Date.now() - ultimo > 20_000 && conferir();
    document.addEventListener("visibilitychange", aoVoltar);
    const t = window.setInterval(conferir, 15 * 60_000);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      window.clearInterval(t);
    };
  }, []);
  return null;
}
