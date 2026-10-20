"use client";

import { ArrowRight, CircleHelp, Layers, ListOrdered, Menu, Tag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Gaveta } from "@/components/gaveta";
import { BotaoLink, Marca } from "@/components/ui";

const SECOES = [
  { href: "#como-funciona", rotulo: "Como funciona", icone: ListOrdered },
  { href: "#recursos", rotulo: "Recursos", icone: Layers },
  { href: "#preco", rotulo: "Preço", icone: Tag },
  { href: "#duvidas", rotulo: "Dúvidas", icone: CircleHelp },
] as const;

/** Cabeçalho do site: menu no topo no computador, menu lateral no celular. */
export function CabecalhoSite() {
  const [aberto, setAberto] = useState(false);
  return (
    <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
      <Link href="/" aria-label="Aluguei, início"><Marca inverso /></Link>
      <div className="flex items-center gap-2">
        <nav className="mr-2 hidden items-center gap-6 text-sm font-semibold text-white/80 md:flex" aria-label="Seções">
          {SECOES.map((s) => <a key={s.href} href={s.href} className="hover:text-white">{s.rotulo}</a>)}
        </nav>
        <BotaoLink href="/entrar?perfil=motorista" variante="vidro" tamanho="sm" className="hidden sm:inline-flex">Sou motorista</BotaoLink>
        <BotaoLink href="/entrar?perfil=locador" variante="claro" tamanho="sm" className="hidden sm:inline-flex">Entrar</BotaoLink>
        <button
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          aria-expanded={aberto}
          className="grid size-11 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/20 md:hidden"
        >
          <Menu size={22} />
        </button>
      </div>

      <Gaveta aberta={aberto} aoFechar={() => setAberto(false)} lado="direita" escura rotulo="Menu do site">
        <div className="flex flex-1 flex-col px-5 pt-5 pb-6">
          <Link href="/" onClick={() => setAberto(false)} className="w-fit"><Marca inverso /></Link>
          <nav className="mt-8 flex flex-col gap-1" aria-label="Seções">
            {SECOES.map(({ href, rotulo, icone: Icone }) => (
              <a key={href} href={href} onClick={() => setAberto(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 font-semibold text-white/85 hover:bg-white/[0.07]">
                <Icone size={20} className="text-[#7dd3fc]" /> {rotulo}
              </a>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-3 pt-8">
            <BotaoLink href="/entrar?perfil=locador" variante="claro" tamanho="lg" className="w-full">Criar conta de locador <ArrowRight size={18} /></BotaoLink>
            <BotaoLink href="/entrar?perfil=locador" variante="vidro" tamanho="lg" className="w-full">Já tenho conta: entrar</BotaoLink>
            <BotaoLink href="/entrar?perfil=motorista" variante="vidro" tamanho="lg" className="w-full">Sou motorista</BotaoLink>
          </div>
        </div>
      </Gaveta>
    </header>
  );
}
