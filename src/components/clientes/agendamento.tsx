"use client";

import { useTransition } from "react";
import { Botao } from "@/components/ui";
import { mudarAgendamento } from "@/lib/acoes-clientes";

export function AcoesAgendamento({ id, status }: { id: string; status: string }) {
  const [pendente, iniciar] = useTransition();
  if (status === "concluido" || status === "cancelado") return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      <Botao variante="secundario" tamanho="sm" disabled={pendente} onClick={() => iniciar(() => mudarAgendamento(id, "cancelado"))}>Cancelar</Botao>
      {status === "novo" ? (
        <Botao tamanho="sm" disabled={pendente} onClick={() => iniciar(() => mudarAgendamento(id, "confirmado"))}>Confirmar</Botao>
      ) : (
        <Botao tamanho="sm" disabled={pendente} onClick={() => iniciar(() => mudarAgendamento(id, "concluido"))}>Concluída</Botao>
      )}
    </div>
  );
}
