"use client";

import { SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Linha } from "@/db/tipos";
import { enviarMensagem, mensagensDesde } from "@/lib/acoes-chat";
import { supabaseNavegador } from "@/lib/supabase/navegador";

type Mensagem = Linha<"mensagens">;

const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const dia = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", timeZone: "America/Sao_Paulo" });

/** Conversa em tempo real (Supabase Realtime), com conferência a cada 8 s se a conexão cair. */
export function Chat({ conversaId, papel, iniciais, linkify = true }: { conversaId: string; papel: "motorista" | "locador"; iniciais: Mensagem[]; linkify?: boolean }) {
  const [mensagens, setMensagens] = useState(iniciais);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const fim = useRef<HTMLDivElement>(null);
  const ultima = useRef(iniciais.at(-1)?.criado_em ?? new Date(0).toISOString());

  function juntar(novas: Mensagem[]) {
    if (!novas.length) return;
    setMensagens((atual) => {
      const ids = new Set(atual.map((m) => m.id));
      const todas = [...atual, ...novas.filter((m) => !ids.has(m.id))].sort((a, b) => a.criado_em.localeCompare(b.criado_em));
      ultima.current = todas.at(-1)?.criado_em ?? ultima.current;
      return todas;
    });
  }

  useEffect(() => {
    const supabase = supabaseNavegador();
    const canal = supabase
      .channel(`conversa:${conversaId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens", filter: `conversa_id=eq.${conversaId}` }, (p) => juntar([p.new as Mensagem]))
      .subscribe();
    const t = setInterval(async () => {
      if (document.visibilityState === "visible") juntar(await mensagensDesde(conversaId, ultima.current));
    }, 8000);
    return () => {
      clearInterval(t);
      supabase.removeChannel(canal);
    };
  }, [conversaId]);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [mensagens.length]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setErro(null);
    iniciar(async () => {
      const r = await enviarMensagem(conversaId, t);
      if (r.erro) return setErro(r.erro);
      setTexto("");
      if (r.mensagem) juntar([r.mensagem]);
    });
  }

  let diaAnterior = "";
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-1 py-3">
        {mensagens.map((m) => {
          const d = dia(m.criado_em);
          const separador = d !== diaAnterior;
          diaAnterior = d;
          const minha = m.autor === papel;
          return (
            <div key={m.id} className="flex flex-col">
              {separador && <p className="my-2 self-center rounded-full bg-cartao-2 px-3 py-1 text-[0.7rem] font-semibold text-suave">{d}</p>}
              {m.autor === "sistema" ? (
                <p className="my-1 self-center rounded-xl border border-marca/30 bg-marca-suave px-3 py-2 text-center text-xs text-texto">{linkify ? <Texto t={m.texto} /> : m.texto}</p>
              ) : (
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${minha ? "self-end rounded-br-md bg-marca text-white" : "self-start rounded-bl-md border border-borda bg-cartao"}`}>
                  <p className="break-words whitespace-pre-wrap">{m.texto}</p>
                  <p className={`mt-0.5 text-right text-[0.65rem] ${minha ? "text-white/70" : "text-suave"}`}>{hora(m.criado_em)}</p>
                </div>
              )}
            </div>
          );
        })}
        <div ref={fim} />
      </div>
      {erro && <p className="px-1 pb-1 text-xs font-medium text-perigo">{erro}</p>}
      <form onSubmit={enviar} className="flex items-end gap-2 border-t border-borda bg-cartao pt-3">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar(e);
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Escreva uma mensagem"
          aria-label="Mensagem"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-borda bg-cartao-2 px-4 py-2.5 text-base outline-none focus:border-marca sm:text-sm"
        />
        <button disabled={enviando || !texto.trim()} aria-label="Enviar" className="grid size-11 shrink-0 place-items-center rounded-full bg-marca text-white shadow-marca disabled:opacity-50">
          <SendHorizontal size={19} />
        </button>
      </form>
    </div>
  );
}

/** Deixa clicáveis os links internos das mensagens do sistema (ex.: link do cadastro). */
function Texto({ t }: { t: string }) {
  const partes = t.split(/(\/m\/[\w/-]+)/g);
  return (
    <>
      {partes.map((p, i) =>
        p.startsWith("/m/") ? <a key={i} href={p} className="font-bold text-marca underline">abrir</a> : <span key={i}>{p}</span>,
      )}
    </>
  );
}
