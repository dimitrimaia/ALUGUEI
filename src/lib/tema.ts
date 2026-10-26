import type { Tema } from "@/dominio/conta/preferencias";

/** Aparência do app. O padrão é claro; escuro só por escolha da pessoa nas configurações. */
export type { Tema };

export const TEMAS: readonly { id: Tema; rotulo: string; detalhe: string }[] = [
  { id: "claro", rotulo: "Claro", detalhe: "Fundo branco, o padrão" },
  { id: "escuro", rotulo: "Escuro", detalhe: "Fundo azul-escuro, melhor à noite" },
  { id: "auto", rotulo: "Automático", detalhe: "Segue o tema do celular" },
];

const CHAVE = "aluguei_tema";
const COR_BARRA = { claro: "#ffffff", escuro: "#060e1f" } as const;

export function eTema(v: unknown): v is Tema {
  return v === "claro" || v === "escuro" || v === "auto";
}

export function lerTema(): Tema {
  try {
    const v = localStorage.getItem(CHAVE);
    return eTema(v) ? v : "claro";
  } catch {
    return "claro";
  }
}

/** Aplica no documento e guarda neste aparelho. */
export function aplicarTema(tema: Tema) {
  try {
    localStorage.setItem(CHAVE, tema);
  } catch {}
  document.documentElement.dataset.tema = tema;
  const escuro = tema === "escuro" || (tema === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", escuro ? COR_BARRA.escuro : COR_BARRA.claro);
}

/** Roda antes da primeira pintura, para a página não piscar no tema errado. */
export const SCRIPT_TEMA = `(function(){try{if(navigator.userAgent.indexOf("AlugueiApp")>-1)document.documentElement.dataset.app="1";var t=localStorage.getItem("${CHAVE}");if(t!=="escuro"&&t!=="auto")t="claro";document.documentElement.dataset.tema=t;var e=t==="escuro"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches);if(e){var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","${COR_BARRA.escuro}")}}catch(_){}})()`;
