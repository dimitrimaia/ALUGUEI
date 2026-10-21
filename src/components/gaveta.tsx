"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Menu lateral (gaveta) para o celular: desliza da lateral, fecha no X, no
 * fundo, no Esc e ao trocar de página, e trava a rolagem da página atrás.
 * Vai direto para o <body> (portal): dentro de um cabeçalho fixo ela ficaria
 * presa ao empilhamento dele e apareceria por baixo da página.
 */
export function Gaveta({
  aberta,
  aoFechar,
  lado = "esquerda",
  escura = false,
  rotulo,
  children,
  manterAberta,
}: {
  aberta: boolean;
  aoFechar: () => void;
  lado?: "esquerda" | "direita";
  escura?: boolean;
  rotulo: string;
  children: ReactNode;
  /** Quando ligado, a próxima troca de página não fecha a gaveta (troca de modo pelo menu). */
  manterAberta?: RefObject<boolean>;
}) {
  const caminho = usePathname();
  const painel = useRef<HTMLDivElement>(null);
  const fechar = useRef(aoFechar);
  fechar.current = aoFechar;
  const [montada, setMontada] = useState(false);
  useEffect(() => setMontada(true), []);

  useEffect(() => {
    if (manterAberta?.current) {
      manterAberta.current = false;
      return;
    }
    fechar.current();
  }, [caminho, manterAberta]);

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

  if (!montada) return null;
  return createPortal(
    // overflow-hidden + invisible: fechada, a gaveta não pode ficar fora da tela alargando a página.
    <div className={`fixed inset-0 z-50 overflow-hidden ${aberta ? "visible" : "pointer-events-none invisible delay-300"}`} aria-hidden={!aberta}>
      <button
        tabIndex={aberta ? 0 : -1}
        aria-label="Fechar menu"
        onClick={aoFechar}
        className={`absolute inset-0 bg-[#040b1a]/45 backdrop-blur-[3px] transition-opacity duration-300 ease-out ${aberta ? "opacity-100" : "opacity-0"}`}
      />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-label={rotulo}
        className={`absolute inset-y-0 flex w-[min(20rem,86vw)] flex-col overflow-y-auto overscroll-contain pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-flutuante transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${lado === "esquerda" ? "left-0" : "right-0"} ${escura ? "fundo-navy" : "bg-cartao text-texto"} ${aberta ? "translate-x-0 opacity-100" : lado === "esquerda" ? "-translate-x-6 opacity-0" : "translate-x-6 opacity-0"}`}
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
    </div>,
    document.body,
  );
}
