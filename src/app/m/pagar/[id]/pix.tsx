"use client";

import { Check, Copy, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Botao } from "@/components/ui";
import { informarPagamento, verificarPagamento } from "./acoes";

export function PainelPix({ obrigacaoId, copiaECola, imagem, link }: { obrigacaoId: string; copiaECola: string | null; imagem: string | null; link: string | null }) {
  const router = useRouter();
  const [copiado, setCopiado] = useState(false);
  const [verificando, iniciar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);

  const verificar = (silencioso = false) =>
    iniciar(async () => {
      const r = await verificarPagamento(obrigacaoId);
      if (r.pago) router.refresh();
      else if (!silencioso) setAviso("Ainda não recebemos. Pode levar alguns segundos depois do Pix.");
    });

  // Confere sozinho a cada 15 s enquanto a tela está aberta.
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && verificar(true), 15_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!copiaECola) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-suave">O QR Code está sendo preparado.</p>
        <Botao variante="secundario" icone={RefreshCw} onClick={() => router.refresh()}>Tentar de novo</Botao>
        {link && <a href={link} target="_blank" rel="noreferrer" className="text-sm font-semibold text-marca underline">Abrir a fatura</a>}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {imagem && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`data:image/png;base64,${imagem}`} alt="QR Code do Pix" className="size-56 rounded-2xl border border-borda bg-white p-2" />
      )}
      <Botao
        tamanho="lg"
        className="w-full"
        icone={copiado ? Check : Copy}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(copiaECola);
            setCopiado(true);
          } catch {
            setCopiado(false);
          }
        }}
      >
        {copiado ? "Código copiado!" : "Copiar código Pix"}
      </Botao>
      <p className="w-full rounded-xl bg-cartao-2 p-3 font-mono text-[0.7rem] leading-relaxed break-all text-suave select-all">{copiaECola}</p>
      <Botao variante="secundario" className="w-full" icone={RefreshCw} disabled={verificando} onClick={() => verificar()}>
        {verificando ? "Verificando…" : "Já paguei"}
      </Botao>
      {aviso && <p className="text-center text-sm text-suave">{aviso}</p>}
    </div>
  );
}

/** Pix direto (QR Code estático): copiar, pagar no banco e avisar o locador. */
export function PainelPixDireto({ obrigacaoId, copiaECola, imagem, informado, favorecido }: { obrigacaoId: string; copiaECola: string; imagem: string; informado: boolean; favorecido: string }) {
  const router = useRouter();
  const [copiado, setCopiado] = useState(false);
  const [avisado, setAvisado] = useState(informado);
  const [enviando, iniciar] = useTransition();
  return (
    <div className="flex w-full flex-col items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imagem} alt="QR Code do Pix" className="size-56 rounded-2xl border border-borda bg-white p-2" />
      <p className="text-center text-xs text-suave">Favorecido: <strong className="text-texto">{favorecido}</strong></p>
      <Botao tamanho="lg" className="w-full" icone={copiado ? Check : Copy} onClick={async () => {
        try { await navigator.clipboard.writeText(copiaECola); setCopiado(true); } catch { setCopiado(false); }
      }}>
        {copiado ? "Código copiado!" : "Copiar código Pix"}
      </Botao>
      <p className="w-full rounded-xl bg-cartao-2 p-3 font-mono text-[0.7rem] leading-relaxed break-all text-suave select-all">{copiaECola}</p>
      {avisado ? (
        <p className="flex items-center gap-2 rounded-xl bg-ok-suave px-3 py-2 text-sm font-semibold text-ok"><Check size={16} /> Avisamos o locador. Ele confirma ao ver o Pix.</p>
      ) : (
        <Botao variante="secundario" className="w-full" disabled={enviando} onClick={() => iniciar(async () => {
          if ((await informarPagamento(obrigacaoId)).ok) { setAvisado(true); router.refresh(); }
        })}>
          {enviando ? "Enviando…" : "Já paguei"}
        </Botao>
      )}
    </div>
  );
}
