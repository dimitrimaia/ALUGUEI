"use client";

import { useActionState } from "react";
import { Aviso, Botao } from "@/components/ui";
import { aceitarConvite, type EstadoAceite } from "./acoes";

export function BotaoAceitar({ token }: { token: string }) {
  const [estado, enviar, enviando] = useActionState<EstadoAceite>(aceitarConvite.bind(null, token), {});
  return (
    <form action={enviar} className="flex flex-col gap-3">
      {estado.erro && <Aviso tom="perigo">{estado.erro}</Aviso>}
      <Botao tamanho="lg" disabled={enviando}>{enviando ? "Abrindo…" : "Começar cadastro"}</Botao>
    </form>
  );
}
