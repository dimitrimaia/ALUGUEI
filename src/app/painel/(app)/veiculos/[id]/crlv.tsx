"use client";

import { FileUp } from "lucide-react";
import { useActionState, useState } from "react";
import { Aviso, Botao, Campo, classeEntrada } from "@/components/ui";
import { type EstadoCrlv, enviarCrlv } from "../acoes";

export function FormCrlv({ veiculoId, renavam }: { veiculoId: string; renavam: string | null }) {
  const [arquivo, setArquivo] = useState<string | null>(null);
  const [estado, acao, pendente] = useActionState<EstadoCrlv, FormData>(enviarCrlv.bind(null, veiculoId), {});
  return (
    <form action={acao} className="flex flex-col gap-3">
      <Campo rotulo="RENAVAM" dica="Os 11 números que estão no CRLV.">
        <input name="renavam" inputMode="numeric" defaultValue={renavam ?? ""} className={classeEntrada} required />
      </Campo>
      <Campo rotulo="CRLV (foto ou PDF)" dica="O CRLV digital sai no app Carteira Digital de Trânsito. Pode enviar o PDF.">
        <span className="flex items-center gap-3">
          <span className="inline-flex h-10 shrink-0 items-center rounded-xl bg-marca-suave px-4 text-sm font-semibold text-marca">Escolher arquivo</span>
          <span className="min-w-0 truncate text-sm text-suave">{arquivo ?? "Nenhum arquivo"}</span>
          <input name="crlv" type="file" accept="image/*,application/pdf" className="sr-only" required onChange={(e) => setArquivo(e.target.files?.[0]?.name ?? null)} />
        </span>
      </Campo>
      {estado.mensagem && <Aviso tom={estado.ok ? "ok" : "perigo"}>{estado.mensagem}</Aviso>}
      <Botao icone={FileUp} disabled={pendente} className="self-start">{pendente ? "Enviando…" : "Enviar para verificação"}</Botao>
    </form>
  );
}
