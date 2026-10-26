"use client";

import { useTransition } from "react";
import { cancelarCarona } from "@/lib/acoes-caronas";

export function BotaoCancelarCarona({ caronaId }: { caronaId: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button type="button" disabled={pendente} onClick={() => confirm("Cancelar a carona? Quem pediu recebe um aviso.") && iniciar(() => cancelarCarona(caronaId))} className="mt-2 self-center text-sm font-semibold text-perigo">
      {pendente ? "Cancelando…" : "Cancelar carona"}
    </button>
  );
}
