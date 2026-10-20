"use client";

import { useActionState, useState } from "react";
import { Aviso, Botao, Campo, classeAreaTexto } from "@/components/ui";
import { decidirCadastro, type EstadoDecisao } from "../acoes";

export function FormularioDecisao({ locatarioId }: { locatarioId: string }) {
  const [estado, enviar, enviando] = useActionState<EstadoDecisao, FormData>(decidirCadastro.bind(null, locatarioId), {});
  const [decisao, setDecisao] = useState<"aprovado" | "recusado">("aprovado");
  return (
    <form action={enviar} className="flex flex-col gap-3">
      {estado.erro && <Aviso tom="perigo">{estado.erro}</Aviso>}
      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input type="radio" name="decisao" value="aprovado" checked={decisao === "aprovado"} onChange={() => setDecisao("aprovado")} />
          Aprovar
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="decisao" value="recusado" checked={decisao === "recusado"} onChange={() => setDecisao("recusado")} />
          Recusar
        </label>
      </div>
      <Campo rotulo={decisao === "recusado" ? "Motivo da recusa (obrigatório)" : "Observação (opcional)"}>
        <textarea name="motivo" rows={2} className={classeAreaTexto} required={decisao === "recusado"} />
      </Campo>
      <Botao variante={decisao === "recusado" ? "perigo" : "primario"} disabled={enviando}>
        {enviando ? "Salvando…" : decisao === "recusado" ? "Recusar cadastro" : "Aprovar cadastro"}
      </Botao>
    </form>
  );
}
