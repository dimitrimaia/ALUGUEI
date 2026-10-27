"use client";

import { avisar } from "@/components/toast";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { corrigirDecisao } from "@/lib/acoes-plantao";

/** Aceitei/Recusei tocável no histórico: corrige o que o Copiloto registrou. */
export function DecisaoOferta({ id, decisao }: { id: string; decisao: string | null }) {
  const [, iniciar] = useTransition();
  const [atual, mudar] = useOptimistic(decisao);
  const definir = (d: "aceitei" | "recusei") =>
    iniciar(async () => {
      const nova = atual === d ? null : d;
      mudar(nova);
      await corrigirDecisao(id, nova);
      avisar(nova === "aceitei" ? "Marcada como corrida que você pegou" : nova === "recusei" ? "Marcada como não pegou" : "Marcação tirada");
    });
  return (
    <div className="flex shrink-0 gap-1">
      <button type="button" aria-label="Marcar como aceita" aria-pressed={atual === "aceitei"} onClick={() => definir("aceitei")} className={`grid size-9 place-items-center rounded-full ${atual === "aceitei" ? "bg-ok-suave text-ok" : "text-suave/60 hover:bg-cartao-2"}`}><ThumbsUp size={16} /></button>
      <button type="button" aria-label="Marcar como recusada" aria-pressed={atual === "recusei"} onClick={() => definir("recusei")} className={`grid size-9 place-items-center rounded-full ${atual === "recusei" ? "bg-cartao-2 text-texto" : "text-suave/60 hover:bg-cartao-2"}`}><ThumbsDown size={16} /></button>
    </div>
  );
}
