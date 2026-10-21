"use client";

import { Bell, Car, ChevronDown, LifeBuoy, ChevronRight, CircleDollarSign, FileText, Globe, Landmark, LayoutDashboard, LogOut, Megaphone, MessageCircle, Plus, Settings, UserPlus, Users, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useConta } from "@/components/conta/contexto";
import { BarraInferior, BarraTopo, BotaoCentral } from "@/components/app/barras";
import { useMenu } from "@/components/menu-app";
import { Avatar, Marca } from "@/components/ui";

const GESTAO = [
  { href: "/painel", rotulo: "Início", icone: LayoutDashboard },
  { href: "/painel/veiculos", rotulo: "Veículos", icone: Car },
  { href: "/painel/motoristas", rotulo: "Motoristas", icone: Users },
  { href: "/painel/contratos", rotulo: "Contratos", icone: FileText },
] as const;
const BUSCA = [
  { href: "/painel/anuncios", rotulo: "Anúncios", icone: Megaphone },
  { href: "/painel/conversas", rotulo: "Conversas", icone: MessageCircle },
] as const;
const DINHEIRO = [
  { href: "/painel/financeiro", rotulo: "Financeiro", icone: CircleDollarSign },
  { href: "/painel/recebimentos", rotulo: "Recebimentos", icone: Landmark },
] as const;

const ACOES = [
  { href: "/painel/veiculos/novo", rotulo: "Cadastrar veículo", detalhe: "Placa, modelo e km", icone: Car },
  { href: "/painel/anuncios", rotulo: "Anunciar um carro", detalhe: "Aparece na busca de motoristas", icone: Megaphone },
  { href: "/painel/motoristas/convidar", rotulo: "Cadastrar motorista", detalhe: "Para quem você já conhece: link no WhatsApp", icone: UserPlus },
] as const;

function ativo(caminho: string, href: string) {
  return href === "/painel" ? caminho === href : caminho === href || caminho.startsWith(`${href}/`);
}

function Contador({ n }: { n: number }) {
  if (!n) return null;
  return <span className="grid min-w-5 place-items-center rounded-full bg-[#ffb020] px-1.5 text-[0.7rem] font-bold text-[#3a2500]">{n}</span>;
}

/** Barra lateral escura no computador; cabeçalho, abas inferiores e botão de ação no celular. */
export function NavegacaoPainel({
  organizacao,
  pendentes,
  recebimentosAtivos,
}: {
  organizacao: string;
  pendentes: number;
  recebimentosAtivos: boolean;
}) {
  const caminho = usePathname();
  const { perfil, naoLidas, locadora, notificacoes } = useConta();
  const [acoesAbertas, setAcoesAbertas] = useState(false);
  useMenu({
    modo: "locador",
    locadora,
    inicio: "/painel",
    conta: "/painel/conta",
    perfil: { ...perfil, detalhe: organizacao },
    secoes: [
      { titulo: "Gestão", itens: GESTAO.slice(1).map((i) => ({ ...i, contador: i.href === "/painel/motoristas" ? pendentes : 0 })) },
      { titulo: "Busca de carros", itens: BUSCA.map((i) => ({ ...i, contador: i.href === "/painel/conversas" ? naoLidas : 0 })) },
      { titulo: "Dinheiro", itens: DINHEIRO },
      {
        titulo: "Ajuda",
        itens: [
          { href: "/painel/avisos", rotulo: "Avisos", icone: Bell, contador: notificacoes },
          { href: "/painel/suporte", rotulo: "Falar com o suporte", icone: LifeBuoy },
        ],
      },
    ],
  });
  const [menuNovo, setMenuNovo] = useState(false);
  const refNovo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAcoesAbertas(false);
    setMenuNovo(false);
  }, [caminho]);

  useEffect(() => {
    const fechar = (e: MouseEvent) => { if (!refNovo.current?.contains(e.target as Node)) setMenuNovo(false); };
    document.addEventListener("click", fechar);
    return () => document.removeEventListener("click", fechar);
  }, []);


  return (
    <>
      {/* Computador */}
      <aside className="fundo-navy sticky top-0 hidden h-dvh w-[17rem] shrink-0 flex-col px-4 py-6 lg:flex">
        <Link href="/painel" className="px-2" aria-label="Início do painel"><Marca inverso /></Link>

        <Link href="/painel/conta" className="mt-7 flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10 hover:bg-white/[0.1]">
          <Avatar nome={perfil.nome} foto={perfil.foto} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{perfil.nome}</p>
            <p className="truncate text-xs text-white/55">{organizacao}</p>
          </div>
          <ChevronRight size={16} className="text-white/40" />
        </Link>

        {/* O início do painel fica no logo, não na lista. */}
        {([["Gestão", GESTAO.slice(1)], ["Busca de carros", BUSCA], ["Dinheiro", DINHEIRO]] as const).map(([titulo, itens]) => (
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
                    {href === "/painel/conversas" && <Contador n={naoLidas} />}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}

        {recebimentosAtivos ? (
          <div className="mt-auto rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
            <p className="flex items-center gap-2 text-sm font-semibold"><span className="size-2 rounded-full bg-[#4ade80]" /> Recebendo no Pix</p>
            <p className="mt-1 text-xs leading-relaxed text-white/60">Os aluguéis caem direto na sua conta Asaas.</p>
          </div>
        ) : (
          <Link href="/painel/recebimentos" className="mt-auto block rounded-2xl bg-gradient-to-br from-[#1f56e8] to-[#0d3aa8] p-4 ring-1 ring-white/10 hover:brightness-110">
            <p className="text-sm font-semibold">Ative os recebimentos</p>
            <p className="mt-1 text-xs leading-relaxed text-white/75">Sem isso, o motorista não consegue pagar pelo Pix. Leva 2 minutos.</p>
          </Link>
        )}
        <Link href="/" className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/[0.07] hover:text-white">
          <Globe size={18} aria-hidden /> Ver o site
        </Link>
        <Link href="/painel/conta" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/[0.07] hover:text-white">
          <Settings size={18} aria-hidden /> Configurações
        </Link>
        <Link href="/painel/avisos" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/[0.07] hover:text-white">
          <Bell size={18} aria-hidden /> <span className="flex-1">Avisos</span> <Contador n={notificacoes} />
        </Link>
        <Link href="/painel/suporte" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/[0.07] hover:text-white">
          <LifeBuoy size={18} aria-hidden /> Suporte
        </Link>
        <form action="/sair" method="post">
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
        <Link href="/painel/conta" className="flex items-center gap-3 rounded-xl py-1 pr-2 pl-1 hover:bg-cartao-2">
          <Avatar nome={perfil.nome} foto={perfil.foto} tamanho="sm" />
          <span className="max-w-48 truncate text-sm font-medium">{perfil.nome}</span>
        </Link>
      </div>

      {/* Celular: o mesmo cabeçalho e o mesmo rodapé do modo motorista, com as abas do locador. */}
      <BarraTopo className="lg:hidden" />
      <BarraInferior
        abas={[
          { href: "/painel", rotulo: "Início", icone: LayoutDashboard, ativo: (c) => c === "/painel" },
          { href: "/painel/veiculos", rotulo: "Frota", icone: Car, ativo: (c) => c.startsWith("/painel/veiculos") },
          { href: "/painel/financeiro", rotulo: "Financeiro", icone: CircleDollarSign, ativo: (c) => c.startsWith("/painel/financeiro") },
        ]}
        central={<BotaoCentral aoTocar={() => setAcoesAbertas(true)} />}
      />

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
