"use client";

import { Check, X } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { avisar } from "@/components/toast";
import { corrigirDecisao } from "@/lib/acoes-plantao";

/**
 * "Fiz" / "Não fiz" de cada corrida: corrige o que o Copiloto registrou.
 * Só as marcadas como "Fiz" entram no ganho do dia.
 */
export function DecisaoOferta({ id, decisao }: { id: string; decisao: string | null }) {
  const [, iniciar] = useTransition();
  const [atual, mudar] = useOptimistic(decisao);
  const definir = (d: "aceitei" | "recusei") =>
    iniciar(async () => {
      if (atual === d) return;
      mudar(d);
      await corrigirDecisao(id, d);
      avisar(d === "aceitei" ? "Corrida feita: entra no seu ganho" : "Corrida não feita: saiu do seu ganho");
    });
  const base = "flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition-colors";
  return (
    <div className="flex shrink-0 gap-1" role="group" aria-label="Você fez esta corrida?">
      <button type="button" aria-pressed={atual === "aceitei"} onClick={() => definir("aceitei")} className={`${base} ${atual === "aceitei" ? "bg-ok text-white" : "border border-borda text-suave"}`}><Check size={14} /> Fiz</button>
      <button type="button" aria-pressed={atual === "recusei"} onClick={() => definir("recusei")} className={`${base} ${atual === "recusei" ? "bg-texto text-fundo" : "border border-borda text-suave"}`}><X size={14} /> Não fiz</button>
    </div>
  );
}
