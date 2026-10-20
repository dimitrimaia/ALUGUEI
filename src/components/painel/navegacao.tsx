"use client";

import { Car, ChevronDown, CircleDollarSign, FileText, Landmark, LayoutDashboard, LogOut, Menu, Plus, UserPlus, Users, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Marca } from "@/components/ui";

const GESTAO = [
  { href: "/painel", rotulo: "Início", icone: LayoutDashboard },
  { href: "/painel/veiculos", rotulo: "Veículos", icone: Car },
  { href: "/painel/motoristas", rotulo: "Motoristas", icone: Users },
  { href: "/painel/contratos", rotulo: "Contratos", icone: FileText },
] as const;
const DINHEIRO = [
  { href: "/painel/financeiro", rotulo: "Financeiro", icone: CircleDollarSign },
  { href: "/painel/recebimentos", rotulo: "Recebimentos", icone: Landmark },
] as const;
const ABAS_MOVEIS = [GESTAO[0], GESTAO[2]] as const;
const ABAS_MOVEIS_DIREITA = [DINHEIRO[0]] as const;
const MAIS = [GESTAO[1], GESTAO[3], DINHEIRO[1]] as const;

const ACOES = [
  { href: "/painel/veiculos/novo", rotulo: "Cadastrar veículo", detalhe: "Placa, modelo e km", icone: Car },
  { href: "/painel/motoristas/convidar", rotulo: "Convidar motorista", detalhe: "Link pelo WhatsApp", icone: UserPlus },
] as const;

function ativo(caminho: string, href: string) {
  return href === "/painel" ? caminho === href : caminho === href || caminho.startsWith(`${href}/`);
}

function Contador({ n }: { n: number }) {
  if (!n) return null;
  return <span className="grid min-w-5 place-items-center rounded-full bg-[#ffb020] px-1.5 text-[0.7rem] font-bold text-[#3a2500]">{n}</span>;
}

/** Barra lateral escura no computador; cabeçalho, abas inferiores e botão de ação no celular. */
export function NavegacaoPainel({ organizacao, usuario, pendentes }: { organizacao: string; usuario: string; pendentes: number }) {
  const caminho = usePathname();
  const [acoesAbertas, setAcoesAbertas] = useState(false);
  const [maisAberto, setMaisAberto] = useState(false);
  const [menuNovo, setMenuNovo] = useState(false);
  const refNovo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAcoesAbertas(false);
    setMaisAberto(false);
    setMenuNovo(false);
  }, [caminho]);

  useEffect(() => {
    const fechar = (e: MouseEvent) => { if (!refNovo.current?.contains(e.target as Node)) setMenuNovo(false); };
    document.addEventListener("click", fechar);
    return () => document.removeEventListener("click", fechar);
  }, []);

  const inicial = organizacao.trim()[0]?.toUpperCase() ?? "A";

  return (
    <>
      {/* Computador */}
      <aside className="fundo-navy sticky top-0 hidden h-dvh w-[17rem] shrink-0 flex-col px-4 py-6 lg:flex">
        <Link href="/painel" className="px-2"><Marca inverso /></Link>

        <div className="mt-7 flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#5b8cff] to-[#1f56e8] font-bold">{inicial}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{organizacao}</p>
            <p className="text-xs text-white/55">Conta do locador</p>
          </div>
        </div>

        {([["Gestão", GESTAO], ["Dinheiro", DINHEIRO]] as const).map(([titulo, itens]) => (
          <div key={titulo}>
            <p className="mt-7 mb-2 px-3 text-[0.7rem] font-semibold tracking-[0.12em] text-white/40 uppercase">{titulo}</p>
            <nav className="flex flex-col gap-1" aria-label={titulo}>
              {itens.map(({ href, rotulo, icone: Icone }) => {
                const atual = ativo(caminho, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={atual ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] font-medium transition-colors ${atual ? "bg-white text-[#0b2a6b] shadow-flutuante" : "text-white/70 hover:bg-white/[0.07] hover:text-white"}`}
                  >
                    <Icone size={20} aria-hidden className={atual ? "text-[#1f56e8]" : ""} />
                    <span className="flex-1">{rotulo}</span>
                    {href === "/painel/motoristas" && <Contador n={pendentes} />}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}

        <div className="mt-auto rounded-2xl bg-gradient-to-br from-[#1f56e8] to-[#0d3aa8] p-4 ring-1 ring-white/10">
          <p className="text-sm font-semibold">Modo assistido ligado</p>
          <p className="mt-1 text-xs leading-relaxed text-white/70">Cobranças extras e notificações formais passam pela sua aprovação.</p>
        </div>
        <form action="/sair" method="post" className="mt-3">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/[0.07] hover:text-white">
            <LogOut size={18} aria-hidden /> Sair
          </button>
        </form>
      </aside>

      <div className="sticky top-0 z-30 hidden h-16 items-center justify-end gap-3 border-b border-borda bg-cartao/85 px-10 backdrop-blur lg:fixed lg:right-0 lg:left-[17rem] lg:flex">
        <div ref={refNovo} className="relative">
          <button
            onClick={() => setMenuNovo((v) => !v)}
            aria-expanded={menuNovo}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-marca px-4 text-sm font-semibold text-white shadow-marca hover:bg-marca-forte"
          >
            <Plus size={18} aria-hidden /> Novo <ChevronDown size={16} aria-hidden />
          </button>
          {menuNovo && (
            <div className="animar-entrada absolute right-0 mt-2 w-72 rounded-2xl border border-borda bg-cartao p-2 shadow-flutuante">
              {ACOES.map(({ href, rotulo, detalhe, icone: Icone }) => (
                <Link key={href} href={href as Route} className="flex items-center gap-3 rounded-xl p-3 hover:bg-cartao-2">
                  <span className="grid size-10 place-items-center rounded-xl bg-marca-suave text-marca"><Icone size={20} aria-hidden /></span>
                  <span>
                    <span className="block text-sm font-semibold">{rotulo}</span>
                    <span className="block text-xs text-suave">{detalhe}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <span className="h-8 w-px bg-borda" />
        <span className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-marca-suave text-sm font-bold text-marca">{usuario[0]?.toUpperCase()}</span>
          <span className="max-w-48 truncate text-sm font-medium text-suave">{usuario}</span>
        </span>
      </div>

      {/* Celular */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-borda bg-cartao/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/painel"><Marca /></Link>
        <span className="grid size-9 place-items-center rounded-full bg-marca-suave text-sm font-bold text-marca" aria-label={organizacao}>{inicial}</span>
      </header>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-cartao/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="relative grid grid-cols-5">
          {ABAS_MOVEIS.map((item) => (
            <AbaMovel key={item.href} {...item} atual={ativo(caminho, item.href)} contador={item.href === "/painel/motoristas" ? pendentes : 0} />
          ))}
          <div className="flex justify-center">
            <button
              onClick={() => setAcoesAbertas(true)}
              aria-label="Criar novo"
              className="-mt-6 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[#3b74ff] to-[#1641b8] text-white shadow-marca ring-4 ring-cartao"
            >
              <Plus size={26} aria-hidden />
            </button>
          </div>
          {ABAS_MOVEIS_DIREITA.map((item) => <AbaMovel key={item.href} {...item} atual={ativo(caminho, item.href)} />)}
          <button
            onClick={() => setMaisAberto(true)}
            className={`flex flex-col items-center gap-1 pt-2.5 pb-2 text-[0.68rem] font-semibold ${MAIS.some((m) => ativo(caminho, m.href)) ? "text-marca" : "text-suave"}`}
          >
            <span className="grid h-7 w-12 place-items-center rounded-full"><Menu size={21} aria-hidden /></span>
            Mais
          </button>
        </div>
      </nav>

      {maisAberto && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Mais opções">
          <button className="absolute inset-0 bg-[#071a3d]/50 backdrop-blur-[2px]" onClick={() => setMaisAberto(false)} aria-label="Fechar" />
          <div className="animar-entrada absolute inset-x-0 bottom-0 rounded-t-3xl bg-cartao p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-flutuante">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-borda-forte" />
            <div className="grid grid-cols-3 gap-2">
              {MAIS.map(({ href, rotulo, icone: Icone }) => (
                <Link key={href} href={href} className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-semibold ${ativo(caminho, href) ? "border-marca bg-marca-suave text-marca" : "border-borda"}`}>
                  <Icone size={24} aria-hidden /> {rotulo}
                </Link>
              ))}
            </div>
            <form action="/sair" method="post" className="mt-3">
              <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-borda p-3.5 text-sm font-semibold text-suave"><LogOut size={18} /> Sair</button>
            </form>
          </div>
        </div>
      )}

      {acoesAbertas && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Criar novo">
          <button className="absolute inset-0 bg-[#071a3d]/50 backdrop-blur-[2px]" onClick={() => setAcoesAbertas(false)} aria-label="Fechar" />
          <div className="animar-entrada absolute inset-x-0 bottom-0 rounded-t-3xl bg-cartao p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-flutuante">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-borda-forte" />
            <div className="mb-3 flex items-center justify-between">
              <p className="text-lg font-bold">O que você quer fazer?</p>
              <button onClick={() => setAcoesAbertas(false)} className="grid size-9 place-items-center rounded-full bg-cartao-2" aria-label="Fechar"><X size={18} /></button>
            </div>
            <div className="grid gap-2">
              {ACOES.map(({ href, rotulo, detalhe, icone: Icone }) => (
                <Link key={href} href={href as Route} className="flex items-center gap-4 rounded-2xl border border-borda p-4 active:bg-cartao-2">
                  <span className="grid size-12 place-items-center rounded-2xl bg-marca-suave text-marca"><Icone size={22} aria-hidden /></span>
                  <span>
                    <span className="block font-semibold">{rotulo}</span>
                    <span className="block text-sm text-suave">{detalhe}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AbaMovel({ href, rotulo, icone: Icone, atual, contador = 0 }: { href: string; rotulo: string; icone: typeof Car; atual: boolean; contador?: number }) {
  return (
    <Link
      href={href as Route}
      aria-current={atual ? "page" : undefined}
      className={`relative flex flex-col items-center gap-1 pt-2.5 pb-2 text-[0.68rem] font-semibold ${atual ? "text-marca" : "text-suave"}`}
    >
      <span className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${atual ? "bg-marca-suave" : ""}`}>
        <Icone size={21} aria-hidden />
      </span>
      {rotulo}
      {contador > 0 && <span className="absolute top-1.5 left-1/2 ml-3 size-2.5 rounded-full bg-[#ffb020] ring-2 ring-cartao" />}
    </Link>
  );
}
