"use client";

import { useState } from "react";
import { classeEntrada } from "@/components/ui";
import { type Centavos, lerReais } from "@/dominio/dinheiro/centavos";

const paraTexto = (c: Centavos | null) => (c === null ? "" : (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 }));

/** Dinheiro controlado: o texto é livre enquanto digita, o valor sai em centavos. */
export function EntradaReais({ valor, aoMudar, rotulo, placeholder = "0,00", className = "" }: { valor: Centavos | null; aoMudar: (c: Centavos | null) => void; rotulo: string; placeholder?: string; className?: string }) {
  const [texto, setTexto] = useState(paraTexto(valor));
  return (
    <span className={`relative block ${className}`}>
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-suave">R$</span>
      <input
        aria-label={rotulo}
        inputMode="decimal"
        autoComplete="off"
        value={texto}
        placeholder={placeholder}
        onChange={(e) => {
          setTexto(e.target.value);
          aoMudar(e.target.value.trim() ? lerReais(e.target.value) : null);
        }}
        onBlur={() => valor !== null && setTexto(paraTexto(valor))}
        className={`${classeEntrada} pl-10 font-semibold tabular-nums`}
      />
    </span>
  );
}

/** "1.200" = mil e duzentos; "9,5" e "9.5" = nove e meio; "1.234,5" = mil duzentos e trinta e quatro e meio. */
export function lerNumero(texto: string): number | null {
  const t = texto.trim().replace(/\s/g, "");
  if (!t) return null;
  const normal = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, "") : t;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

/** Número com vírgula (consumo, km, minutos). */
export function EntradaNumero({ valor, aoMudar, rotulo, sufixo, placeholder, inteiro = false, className = "" }: { valor: number | null; aoMudar: (n: number | null) => void; rotulo: string; sufixo?: string; placeholder?: string; inteiro?: boolean; className?: string }) {
  const [texto, setTexto] = useState(valor === null ? "" : valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 }));
  return (
    <span className={`relative block ${className}`}>
      <input
        aria-label={rotulo}
        inputMode={inteiro ? "numeric" : "decimal"}
        autoComplete="off"
        value={texto}
        placeholder={placeholder}
        onChange={(e) => {
          setTexto(e.target.value);
          const n = lerNumero(e.target.value);
          aoMudar(n !== null && n >= 0 ? (inteiro ? Math.round(n) : n) : null);
        }}
        className={`${classeEntrada} font-semibold tabular-nums ${sufixo ? "pr-16" : ""}`}
      />
      {sufixo && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-suave">{sufixo}</span>}
    </span>
  );
}

export function Rotulo({ texto, dica, children }: { texto: string; dica?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{texto}</span>
      {children}
      {dica && <span className="text-xs text-suave">{dica}</span>}
    </div>
  );
}
