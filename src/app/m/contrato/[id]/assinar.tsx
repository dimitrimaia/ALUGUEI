"use client";

import { useActionState, useEffect, useState } from "react";
import { Aviso, Botao } from "@/components/ui";
import { assinarContrato, type EstadoAssinatura } from "./acoes";

export function FormularioAssinatura({ contratoId, pdfSha256 }: { contratoId: string; pdfSha256: string }) {
  const [estado, enviar, enviando] = useActionState<EstadoAssinatura, FormData>(assinarContrato.bind(null, contratoId), {});
  const [posicao, setPosicao] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    // Localização é um reforço de prova, não um requisito: se negar, assina igual.
    navigator.geolocation?.getCurrentPosition(
      (p) => setPosicao({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => {},
      { timeout: 8000 },
    );
  }, []);

  return (
    <form action={enviar} className="flex flex-col gap-3">
      <input type="hidden" name="pdfSha256" value={pdfSha256} />
      {posicao && <input type="hidden" name="latitude" value={posicao.latitude} />}
      {posicao && <input type="hidden" name="longitude" value={posicao.longitude} />}
      {estado.erro && <Aviso tom="perigo">{estado.erro}</Aviso>}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="concordo" value="sim" className="mt-1" required />
        <span>Li o contrato completo e concordo com todas as cláusulas. Sei que esta assinatura eletrônica tem validade legal.</span>
      </label>
      <Botao disabled={enviando}>{enviando ? "Assinando…" : "Assinar contrato"}</Botao>
    </form>
  );
}
