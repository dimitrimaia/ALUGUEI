"use client";

import { Bell, ChevronDown, ChevronRight, Globe, LifeBuoy, LogOut, type LucideIcon, Settings, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useConta } from "@/components/conta/contexto";
import { GavetaAvisos } from "@/components/gaveta-avisos";
import { type ItemMenu, TrocaModo, useAcoesMenu } from "@/components/menu-app";
import { Avatar, Marca } from "@/components/ui";

/**
 * Casca do computador, igual nos dois modos (motorista e locador):
 * - barra lateral escura com a troca de modo no topo, o perfil e as seções;
 * - barra superior com o botão de ação do modo (+ Novo / Copiloto), avisos e conta.
 * No celular nada disto aparece: ficam a BarraTopo e a BarraInferior.
 */

export const LARGURA_LATERAL = "lg:left-[17rem]";

export interface SecaoLateral {
  titulo: string;
  itens: readonly ItemMenu[];
}

export interface Acao {
  href: string;
  rotulo: string;
  detalhe: string;
  icone: LucideIcon;
}

/** Quanto do caminho o item cobre (0 = não é ele). O item mais específico vence: Minhas corridas, não Plantão. */
function cobertura(caminho: string, item: ItemMenu, inicio: string) {
  if (item.href === inicio) return caminho === inicio ? inicio.length : 0;
  return Math.max(0, ...[item.href.split("?")[0] ?? item.href, ...(item.tambem ?? [])].map((h) => (caminho === h || caminho.startsWith(`${h}/`) ? h.length : 0)));
}

function Contador({ n }: { n?: number }) {
  if (!n) return null;
  return <span className="grid min-w-5 place-items-center rounded-full bg-[#ffb020] px-1.5 text-[0.7rem] font-bold text-[#3a2500]">{n}</span>;
}

const classeRodape = "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.07] hover:text-white";

/** Barra lateral escura (computador). */
export function BarraLateral({ inicio, conta, detalhe, secoes, destaque }: { inicio: string; conta: string; detalhe: string; secoes: readonly SecaoLateral[]; destaque?: ReactNode }) {
  const caminho = usePathname();
  const { perfil, modo, locadora, notificacoes } = useConta();
  const { trocarModo } = useAcoesMenu();
  const base = modo === "locador" ? "/painel" : "/m";
  const todos = secoes.flatMap((x) => x.itens);
  const melhor = todos.reduce<{ item: ItemMenu | null; n: number }>((m, i) => { const n = cobertura(caminho, i, inicio); return n > m.n ? { item: i, n } : m; }, { item: null, n: 0 }).item;
  return (
    <aside className="fundo-navy sticky top-0 hidden h-dvh w-[17rem] shrink-0 flex-col overflow-y-auto px-4 py-6 [scrollbar-width:thin] lg:flex">
      <Link href={inicio as Route} className="px-2" aria-label="Início"><Marca inverso /></Link>

      <div className="mt-6"><TrocaModo modo={modo} locadora={locadora} escuro aoTrocar={trocarModo} /></div>

      <Link href={conta as Route} className="mt-4 flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10 hover:bg-white/[0.1]">
        <Avatar nome={perfil.nome} foto={perfil.foto} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{perfil.nome}</p>
          <p className="truncate text-xs text-white/55">{detalhe}</p>
        </div>
        <ChevronRight size={16} className="text-white/40" />
      </Link>

      {secoes.map(({ titulo, itens }) => (
        <div key={titulo}>
          {titulo ? <p className="mt-6 mb-1.5 px-3 text-[0.68rem] font-semibold tracking-[0.12em] text-white/40 uppercase">{titulo}</p> : <div className="mt-5" />}
          <nav className="flex flex-col gap-0.5" aria-label={titulo}>
            {itens.map((item) => {
              const atual = item === melhor;
              const Icone = item.icone;
              return (
                <Link
                  key={item.href}
                  href={item.href as Route}
                  aria-current={atual ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.93rem] font-medium transition-colors ${atual ? "bg-white text-[#0b2a6b] shadow-flutuante" : "text-white/72 hover:bg-white/[0.07] hover:text-white"}`}
                >
                  <Icone size={19} aria-hidden className={atual ? "text-[#1f56e8]" : ""} />
                  <span className="flex-1">{item.rotulo}</span>
                  <Contador n={item.contador} />
                </Link>
              );
            })}
          </nav>
        </div>
      ))}

      <div className="mt-auto pt-6">
        {destaque}
        <div className="mt-3 flex flex-col gap-0.5">
          <Link href={`${base}/avisos` as Route} className={classeRodape}><Bell size={17} aria-hidden /> <span className="flex-1">Avisos</span> <Contador n={notificacoes} /></Link>
          <Link href={`${base}/suporte` as Route} className={classeRodape}><LifeBuoy size={17} aria-hidden /> Suporte</Link>
          <Link href={conta as Route} className={classeRodape}><Settings size={17} aria-hidden /> Configurações</Link>
          <Link href="/" className={classeRodape}><Globe size={17} aria-hidden /> Ver o site</Link>
          <form action="/sair" method="post">
            <button className={`${classeRodape} w-full`}><LogOut size={17} aria-hidden /> Sair</button>
          </form>
        </div>
      </div>
    </aside>
  );
}

/** Botão de ação do modo com o menu que abre embaixo (computador). */
function MenuAcoes({ rotulo, icone: Icone, acoes, extra }: { rotulo: string; icone: LucideIcon; acoes: readonly Acao[]; extra?: ReactNode }) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setAberto(false), [caminho]);
  useEffect(() => {
    const fechar = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAberto(false); };
    document.addEventListener("click", fechar);
    return () => document.removeEventListener("click", fechar);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setAberto((v) => !v)} aria-expanded={aberto} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-br from-[#3b74ff] to-[#1641b8] px-4 text-sm font-semibold text-white shadow-marca hover:brightness-110">
        <Icone size={18} aria-hidden /> {rotulo} <ChevronDown size={16} aria-hidden className={`transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>
      {aberto && (
        <div className="animar-entrada absolute right-0 z-40 mt-2 w-80 rounded-2xl border border-borda bg-cartao p-2 shadow-flutuante">
          {extra}
          {acoes.map(({ href, rotulo: r, detalhe, icone: I }) => (
            <Link key={href} href={href as Route} className="flex items-center gap-3 rounded-xl p-3 hover:bg-cartao-2">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-marca-suave text-marca"><I size={20} aria-hidden /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{r}</span>
                <span className="block text-xs text-suave">{detalhe}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Barra superior do computador, à direita da lateral (fixa: o conteúdo começa com lg:pt-24). */
export function TopoDesktop({ conta, acao }: { conta: string; acao: { rotulo: string; icone: LucideIcon; acoes: readonly Acao[]; extra?: ReactNode } }) {
  const { perfil, notificacoes } = useConta();
  return (
    <>
      <div className={`fixed top-0 right-0 z-30 hidden h-16 items-center justify-end gap-2 border-b border-borda bg-cartao/85 px-10 backdrop-blur lg:flex ${LARGURA_LATERAL}`}>
        <MenuAcoes {...acao} />
        <GavetaAvisos novos={notificacoes} />
        <span className="mx-1 h-8 w-px bg-borda" />
        <Link href={conta as Route} className="flex items-center gap-3 rounded-xl py-1 pr-2 pl-1 hover:bg-cartao-2">
          <Avatar nome={perfil.nome} foto={perfil.foto} tamanho="sm" />
          <span className="max-w-48 truncate text-sm font-medium">{perfil.nome}</span>
        </Link>
      </div>
    </>
  );
}

/** Folha que sobe do rodapé com as ações do botão do meio (celular). */
export function FolhaAcoes({ aberta, aoFechar, titulo, acoes, extra }: { aberta: boolean; aoFechar: () => void; titulo: string; acoes: readonly Acao[]; extra?: ReactNode }) {
  const caminho = usePathname();
  const fechar = useRef(aoFechar);
  fechar.current = aoFechar;
  useEffect(() => fechar.current(), [caminho]);
  if (!aberta || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={titulo}>
      <button className="absolute inset-0 bg-[#071a3d]/50 backdrop-blur-[2px]" onClick={aoFechar} aria-label="Fechar" />
      <div className="animar-entrada absolute inset-x-0 bottom-0 mx-auto max-w-[42rem] rounded-t-3xl bg-cartao p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-flutuante">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-borda-forte" />
        <div className="mb-3 flex items-center justify-between">
          <p className="text-lg font-bold">{titulo}</p>
          <button onClick={aoFechar} className="grid size-9 place-items-center rounded-full bg-cartao-2" aria-label="Fechar"><X size={18} /></button>
        </div>
        {extra}
        <div className="grid gap-2">
          {acoes.map(({ href, rotulo, detalhe, icone: Icone }) => (
            <Link key={href} href={href as Route} className="flex items-center gap-4 rounded-2xl border border-borda p-3.5 active:bg-cartao-2">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-marca-suave text-marca"><Icone size={21} aria-hidden /></span>
              <span className="min-w-0">
                <span className="block font-semibold">{rotulo}</span>
                <span className="block text-sm text-suave">{detalhe}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
