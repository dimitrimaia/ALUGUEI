"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";

/**
 * Menu lateral (gaveta) para o celular: desliza da lateral, fecha no X, no
 * fundo, no Esc e ao trocar de página, e trava a rolagem da página atrás.
 */
export function Gaveta({
  aberta,
  aoFechar,
  lado = "esquerda",
  escura = false,
  rotulo,
  children,
}: {
  aberta: boolean;
  aoFechar: () => void;
  lado?: "esquerda" | "direita";
  escura?: boolean;
  rotulo: string;
  children: ReactNode;
}) {
  const caminho = usePathname();
  const painel = useRef<HTMLDivElement>(null);
  const fechar = useRef(aoFechar);
  fechar.current = aoFechar;

  useEffect(() => {
    fechar.current();
  }, [caminho]);

  useEffect(() => {
    if (!aberta) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && fechar.current();
    document.addEventListener("keydown", tecla);
    painel.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener("keydown", tecla);
    };
  }, [aberta]);

  return (
    <div className={`fixed inset-0 z-50 ${aberta ? "" : "pointer-events-none"}`} aria-hidden={!aberta}>
      <button
        tabIndex={aberta ? 0 : -1}
        aria-label="Fechar menu"
        onClick={aoFechar}
        className={`absolute inset-0 bg-[#040b1a]/55 backdrop-blur-[2px] transition-opacity duration-300 ${aberta ? "opacity-100" : "opacity-0"}`}
      />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-label={rotulo}
        className={`absolute inset-y-0 flex w-[min(20rem,86vw)] flex-col overflow-y-auto pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-flutuante transition-transform duration-300 ease-out ${lado === "esquerda" ? "left-0" : "right-0"} ${escura ? "fundo-navy" : "bg-cartao text-texto"} ${aberta ? "translate-x-0" : lado === "esquerda" ? "-translate-x-full" : "translate-x-full"}`}
      >
        <button
          tabIndex={aberta ? 0 : -1}
          onClick={aoFechar}
          aria-label="Fechar menu"
          className={`absolute top-[calc(0.75rem+env(safe-area-inset-top))] right-3 grid size-10 place-items-center rounded-full ${escura ? "bg-white/10 text-white" : "bg-cartao-2 text-texto"}`}
        >
          <X size={20} />
        </button>
        {aberta && children}
      </div>
    </div>
  );
}
