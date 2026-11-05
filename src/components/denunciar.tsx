"use client";

import { Flag } from "lucide-react";
import { useState, useTransition } from "react";
import { Gaveta } from "@/components/gaveta";
import { Aviso, Botao } from "@/components/ui";
import { denunciar } from "@/lib/acoes-denuncia";
import { MOTIVOS_DENUNCIA } from "@/lib/denuncia";

/** Botão "Denunciar" (conversa ou anúncio): escolhe o motivo e manda para a equipe. */
export function BotaoDenunciar({ alvo, id, rotulo = "Denunciar", className = "" }: { alvo: "conversa" | "anuncio"; id: string; rotulo?: string; className?: string }) {
  const [aberta, setAberta] = useState(false);
  const [motivo, setMotivo] = useState<(typeof MOTIVOS_DENUNCIA)[number] | null>(null);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviada, setEnviada] = useState(false);
  const [enviando, iniciar] = useTransition();
  const lista = MOTIVOS_DENUNCIA.filter((m) => alvo === "anuncio" || m !== "Anúncio falso ou enganoso");

  function enviar() {
    if (!motivo) return setErro("Escolha o motivo.");
    setErro(null);
    iniciar(async () => {
      const r = await denunciar({ alvo, id, motivo, texto }).catch(() => ({ erro: "Sem conexão. Tente de novo." }));
      if (r.erro) return setErro(r.erro);
      setEnviada(true);
    });
  }

  return (
    <>
      <button type="button" onClick={() => setAberta(true)} className={`inline-flex items-center gap-1.5 text-xs font-semibold text-suave hover:text-perigo ${className}`}>
        <Flag size={14} /> {rotulo}
      </button>
      <Gaveta aberta={aberta} aoFechar={() => setAberta(false)} lado="direita" rotulo="Denunciar">
        <div className="flex flex-col gap-4 p-5">
          <h2 className="text-lg font-bold">{alvo === "anuncio" ? "Denunciar este anúncio" : "Denunciar este usuário"}</h2>
          {enviada ? (
            <>
              <Aviso tom="ok">Denúncia enviada. A equipe do Aluguei analisa e responde em Ajuda → Suporte.</Aviso>
              <Botao variante="secundario" onClick={() => setAberta(false)}>Fechar</Botao>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Motivo">
                {lista.map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={motivo === m} onClick={() => setMotivo(m)} className={`rounded-xl border px-4 py-3 text-left text-sm font-medium ${motivo === m ? "border-perigo bg-perigo-suave text-perigo" : "border-borda bg-cartao"}`}>
                    {m}
                  </button>
                ))}
              </div>
              <textarea value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1500} rows={4} placeholder="Conte o que aconteceu (opcional)" className="rounded-xl border border-borda bg-cartao p-3 text-sm outline-none focus:border-marca" />
              {erro && <Aviso tom="perigo">{erro}</Aviso>}
              <Botao icone={Flag} disabled={enviando} onClick={enviar}>{enviando ? "Enviando…" : "Enviar denúncia"}</Botao>
              <p className="text-xs text-suave">A pessoa denunciada não fica sabendo quem denunciou.</p>
            </>
          )}
        </div>
      </Gaveta>
    </>
  );
}
