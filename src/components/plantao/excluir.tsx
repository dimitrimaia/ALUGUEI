"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { excluirLancamento } from "@/lib/acoes-plantao";

export function BotaoExcluir({ tipo, id }: { tipo: "ganho" | "despesa"; id: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      type="button"
      aria-label="Excluir lançamento"
      disabled={pendente}
      onClick={() => confirm("Excluir este lançamento?") && iniciar(() => excluirLancamento(tipo, id))}
      className="grid size-8 shrink-0 place-items-center rounded-full text-suave hover:bg-cartao-2 disabled:opacity-40"
    >
      <Trash2 size={15} />
    </button>
  );
}
