"use client";

import { Gauge, X } from "lucide-react";
import { useTransition } from "react";
import { definirUsoCopiloto } from "@/lib/acoes-uso-copiloto";

/**
 * Faixa fina do "modo piloto" no início do motorista:
 * - pergunta (ainda não respondeu): roda por app? contar lucro e gastos?
 * - desligado: um convite discreto para ligar.
 */
export function FaixaModoPiloto({ pergunta }: { pergunta: boolean }) {
  const [ocupado, iniciar] = useTransition();
  const definir = (usar: boolean) => iniciar(async () => void (await definirUsoCopiloto(usar)));
  return (
    <div className="flex items-center gap-3 rounded-[1.1rem] border border-borda bg-cartao px-3.5 py-3 shadow-cartao">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-marca-suave text-marca"><Gauge size={18} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">{pergunta ? "Você roda por aplicativo?" : "Modo piloto desligado"}</p>
        <p className="text-xs text-suave">{pergunta ? "O Aluguei conta seu lucro, gastos e corridas, e o Copiloto diz se a oferta compensa." : "Ligue para ver lucro, gastos e corridas aqui."}</p>
      </div>
      <button type="button" disabled={ocupado} onClick={() => definir(true)} className="h-9 shrink-0 rounded-xl bg-marca px-3 text-sm font-semibold text-white disabled:opacity-60">{pergunta ? "Sim" : "Ligar"}</button>
      {pergunta && (
        <button type="button" disabled={ocupado} onClick={() => definir(false)} aria-label="Agora não" className="grid size-9 shrink-0 place-items-center rounded-xl text-suave hover:bg-cartao-2"><X size={17} /></button>
      )}
    </div>
  );
}

/** Chave do modo piloto na Conta (ligar/desligar a contagem de lucro, gastos e corridas). */
export function ChaveModoPiloto({ ligado }: { ligado: boolean }) {
  const [ocupado, iniciar] = useTransition();
  return (
    <button type="button" role="switch" aria-checked={ligado} disabled={ocupado} onClick={() => iniciar(async () => void (await definirUsoCopiloto(!ligado)))} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-cartao-2">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-marca-suave text-marca"><Gauge size={18} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">Modo piloto</span>
        <span className="block text-xs text-suave">Contar lucro, gastos e corridas no início</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${ligado ? "bg-marca" : "bg-borda-forte"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${ligado ? "left-[1.375rem]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
