"use client";

import { useActionState, useEffect, useState } from "react";
import { Aviso, Botao } from "@/components/ui";
import { aceitarVistoria, type EstadoAceiteVistoria } from "./acoes";

export function FormularioAceiteVistoria({ vistoriaId, hash }: { vistoriaId: string; hash: string }) {
  const [estado, enviar, enviando] = useActionState<EstadoAceiteVistoria, FormData>(aceitarVistoria.bind(null, vistoriaId), {});
  const [posicao, setPosicao] = useState<{ latitude: number; longitude: number } | null>(null);
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((p) => setPosicao({ latitude: p.coords.latitude, longitude: p.coords.longitude }), () => {}, { timeout: 8000 });
  }, []);

  return (
    <form action={enviar} className="flex flex-col gap-3">
      <input type="hidden" name="hash" value={hash} />
      {posicao && <input type="hidden" name="latitude" value={posicao.latitude} />}
      {posicao && <input type="hidden" name="longitude" value={posicao.longitude} />}
      {estado.erro && <Aviso tom="perigo">{estado.erro}</Aviso>}
      <label className="flex items-start gap-3 rounded-xl border border-borda bg-cartao p-4 text-sm">
        <input type="checkbox" name="confirmo" value="sim" className="mt-0.5 size-5 accent-[var(--marca)]" required />
        <span>Conferi as fotos e o checklist e recebi o carro neste estado.</span>
      </label>
      <Botao tamanho="lg" disabled={enviando}>{enviando ? "Confirmando…" : "Confirmar e receber o carro"}</Botao>
      <p className="text-center text-sm text-suave">Viu algo diferente no carro? Fale com o locador antes de confirmar.</p>
    </form>
  );
}
