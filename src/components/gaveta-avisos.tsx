"use client";

import { Bell, BellOff, ChevronRight, LoaderCircle, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { type AvisoLista, listarAvisos, marcarAvisosLidos } from "@/lib/acoes-avisos";

function quando(iso: string) {
  const d = new Date(iso);
  const dia = (x: Date) => x.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return dia(d) === dia(new Date())
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });
}

/**
 * Sino do topo: abre uma gaveta lateral com os avisos por cima da tela atual
 * (sem trocar de página). Fecha no ✕, no fundo escuro ou no Voltar do celular.
 */
export function GavetaAvisos({ novos }: { novos: number }) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const [avisos, setAvisos] = useState<AvisoLista[] | null>(null);
  const [marcando, iniciar] = useTransition();

  function abrir() {
    setAberta(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisivel(true)));
    listarAvisos().then(setAvisos).catch(() => setAvisos([]));
    // O Voltar do Android fecha a gaveta em vez de sair da tela.
    history.pushState({ ...history.state, gavetaAvisos: true }, "");
    window.addEventListener("popstate", aoVoltar);
  }
  function aoVoltar() {
    window.removeEventListener("popstate", aoVoltar);
    fechar(true);
  }
  function fechar(doHistorico = false) {
    if (!doHistorico) window.removeEventListener("popstate", aoVoltar);
    setVisivel(false);
    setTimeout(() => setAberta(false), 220);
    if (!doHistorico && history.state?.gavetaAvisos) history.back();
  }
  useEffect(() => {
    if (!aberta) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  const naoLidos = avisos?.filter((a) => !a.lida_em).length ?? novos;
  return (
    <>
      <button type="button" onClick={abrir} aria-label={novos ? `Avisos, ${novos} novos` : "Avisos"} className="relative grid size-10 place-items-center rounded-full hover:bg-cartao-2">
        <Bell size={21} />
        {novos > 0 && <span className="absolute top-1 right-0.5 grid min-w-4 place-items-center rounded-full bg-[#ffb020] px-1 text-[0.6rem] font-bold text-[#3a2500] ring-2 ring-cartao">{novos > 9 ? "9+" : novos}</span>}
      </button>
      {aberta &&
        createPortal(
          <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Avisos">
            <button type="button" aria-label="Fechar avisos" onClick={() => fechar()} className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${visivel ? "opacity-100" : "opacity-0"}`} />
            <aside className={`absolute inset-y-0 right-0 flex w-[min(24rem,88vw)] flex-col bg-fundo pt-[env(safe-area-inset-top)] shadow-flutuante transition-transform duration-200 ease-out ${visivel ? "translate-x-0" : "translate-x-full"}`}>
              <div className="flex h-14 items-center gap-2 border-b border-borda px-4">
                <h2 className="flex-1 text-base font-bold">Avisos</h2>
                {naoLidos > 0 && (
                  <button type="button" disabled={marcando} onClick={() => iniciar(async () => { await marcarAvisosLidos(); setAvisos((l) => l?.map((a) => ({ ...a, lida_em: a.lida_em ?? new Date().toISOString() })) ?? l); router.refresh(); })} className="text-xs font-semibold text-marca">
                    Marcar como lidos
                  </button>
                )}
                <button type="button" onClick={() => fechar()} aria-label="Fechar" className="grid size-9 place-items-center rounded-full hover:bg-cartao-2"><X size={19} /></button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
                {avisos === null ? (
                  <div className="grid h-32 place-items-center text-suave"><LoaderCircle size={22} className="animate-spin" /></div>
                ) : avisos.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-suave"><BellOff size={26} /> Nenhum aviso ainda. Lembretes, mensagens e respostas do suporte aparecem aqui.</div>
                ) : (
                  <div className="divide-y divide-borda">
                    {avisos.map((a) => (
                      <Link key={a.id} href={`/avisos/${a.id}` as Route} onClick={() => fechar(true)} className="flex items-start gap-3 px-4 py-3 hover:bg-cartao-2">
                        <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${a.lida_em ? "bg-cartao-2 text-suave" : "bg-marca-suave text-marca"}`}><Bell size={17} /></span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm ${a.lida_em ? "font-medium" : "font-bold"}`}>{a.titulo ?? "Aviso"}</span>
                          <span className="line-clamp-2 block text-xs text-suave">{a.texto}</span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-[0.7rem] text-suave">{quando(a.criado_em)}</span>
                          {!a.lida_em ? <span className="size-2.5 rounded-full bg-marca" aria-label="Novo" /> : <ChevronRight size={15} className="text-suave" />}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}
