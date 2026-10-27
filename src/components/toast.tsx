"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { useEffect, useState } from "react";

type Toast = { id: number; texto: string; tom: "ok" | "erro" };
const EVENTO = "aluguei:toast";

/** Mostra um aviso rápido no rodapé ("Régua salva"). Pode ser chamado de qualquer tela. */
export function avisar(texto: string, tom: "ok" | "erro" = "ok") {
  window.dispatchEvent(new CustomEvent<Omit<Toast, "id">>(EVENTO, { detail: { texto, tom } }));
}

/** Avisos rápidos: sobem acima do rodapé do app e somem sozinhos. */
export function Toasts() {
  const [lista, setLista] = useState<(Toast & { saindo?: boolean })[]>([]);
  useEffect(() => {
    let n = 0;
    const ouvir = (e: Event) => {
      const t = { ...(e as CustomEvent<Omit<Toast, "id">>).detail, id: ++n };
      setLista((l) => [...l.slice(-2), t]);
      window.setTimeout(() => setLista((l) => l.map((x) => (x.id === t.id ? { ...x, saindo: true } : x))), 2600);
      window.setTimeout(() => setLista((l) => l.filter((x) => x.id !== t.id)), 2900);
    };
    window.addEventListener(EVENTO, ouvir);
    return () => window.removeEventListener(EVENTO, ouvir);
  }, []);
  if (!lista.length) return null;
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {lista.map((t) => (
        <div key={t.id} role="status" className={`toast flex max-w-sm items-center gap-2.5 rounded-2xl bg-[#0b1630] px-4 py-3 text-sm font-semibold text-white shadow-flutuante ${t.saindo ? "toast-sai" : ""}`}>
          {t.tom === "ok" ? <CircleCheck size={18} className="shrink-0 text-[#4ade80]" /> : <CircleAlert size={18} className="shrink-0 text-[#f87171]" />}
          {t.texto}
        </div>
      ))}
    </div>
  );
}
