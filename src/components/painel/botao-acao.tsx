"use client";

import { type ReactNode, useState, useTransition } from "react";
import { Botao } from "@/components/ui";

/** Botão que chama uma ação do servidor e mostra o resultado; com `confirmar`, pede confirmação na própria tela. */
export function BotaoAcao({
  acao,
  rotulo,
  confirmar,
  icone,
  variante = "secundario",
  tamanho = "sm",
}: {
  acao: () => Promise<{ erro?: string; ok?: string }>;
  rotulo: string;
  confirmar?: string;
  /** Elemento do ícone (ex.: <RefreshCw size={18} />); componentes não podem ser passados do servidor. */
  icone?: ReactNode;
  variante?: "primario" | "secundario";
  tamanho?: "sm" | "md";
}) {
  const [pendente, iniciar] = useTransition();
  const [pedindo, setPedindo] = useState(false);
  const [msg, setMsg] = useState<{ erro?: string; ok?: string } | null>(null);

  const executar = () =>
    iniciar(async () => {
      setPedindo(false);
      setMsg(await acao());
    });

  return (
    <span className="inline-flex flex-col items-end gap-1">
      {pedindo ? (
        <span className="flex items-center gap-2">
          <span className="text-xs text-suave">{confirmar}</span>
          <Botao tamanho="sm" variante="primario" onClick={executar}>Confirmar</Botao>
          <Botao tamanho="sm" variante="fantasma" onClick={() => setPedindo(false)}>Cancelar</Botao>
        </span>
      ) : (
        <Botao tamanho={tamanho} variante={variante} disabled={pendente} onClick={() => (confirmar ? setPedindo(true) : executar())}>
          {icone}
          {pendente ? "Aguarde…" : rotulo}
        </Botao>
      )}
      {msg?.erro && <span className="text-xs font-medium text-perigo">{msg.erro}</span>}
      {msg?.ok && !pendente && <span className="text-xs font-medium text-ok">{msg.ok}</span>}
    </span>
  );
}
