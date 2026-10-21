"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Barra fina no topo enquanto a próxima tela carrega. Começa no toque em
 * qualquer link interno e termina quando o endereço muda.
 */
export function BarraProgresso() {
  const caminho = usePathname();
  const busca = useSearchParams();
  const [progresso, setProgresso] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const limite = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const destino = new URL(a.href, location.href);
      if (destino.origin !== location.origin) return;
      if (destino.pathname === location.pathname && destino.search === location.search) return; // âncora ou mesma tela
      iniciar();
    }
    function aoEnviar(e: SubmitEvent) {
      const f = e.target as HTMLFormElement;
      // Formulários comuns (como "Sair") recarregam a página; os de ação do servidor têm o próprio "Salvando…".
      if (!e.defaultPrevented && f.method.toLowerCase() === "post" && f.action && !f.action.startsWith("javascript")) iniciar();
    }
    document.addEventListener("click", aoClicar, true);
    document.addEventListener("submit", aoEnviar);
    return () => {
      document.removeEventListener("click", aoClicar, true);
      document.removeEventListener("submit", aoEnviar);
    };
  }, []);

  useEffect(() => {
    clearInterval(timer.current);
    clearTimeout(limite.current);
    setProgresso((p) => (p === null ? null : 100));
    const fim = setTimeout(() => setProgresso(null), 250);
    return () => clearTimeout(fim);
  }, [caminho, busca]);

  function iniciar() {
    clearInterval(timer.current);
    clearTimeout(limite.current);
    setProgresso(8);
    // Se a navegação não mudar o endereço (um redirecionamento de volta, por exemplo), some sozinha.
    limite.current = setTimeout(() => {
      clearInterval(timer.current);
      setProgresso(null);
    }, 12000);
    // Avança rápido no começo e cada vez mais devagar, sem chegar ao fim antes da hora.
    timer.current = setInterval(() => setProgresso((p) => (p === null || p >= 100 ? p : p + (90 - p) * 0.08)), 120);
  }

  if (progresso === null) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]" role="progressbar" aria-label="Carregando" aria-valuenow={Math.round(progresso)}>
      <div
        className="h-full bg-gradient-to-r from-[#5b8cff] to-[#1f56e8] shadow-[0_0_8px_rgb(31_86_232/0.6)] transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${progresso}%`, opacity: progresso >= 100 ? 0 : 1 }}
      />
    </div>
  );
}
