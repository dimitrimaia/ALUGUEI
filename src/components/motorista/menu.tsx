"use client";

import { Car, ClipboardCheck, FileText, Globe, Home, LogOut, Menu, MessageCircle, Receipt, Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Gaveta } from "@/components/gaveta";
import { Marca } from "@/components/ui";

const ITENS = [
  { href: "/m", rotulo: "Início", icone: Home },
  { href: "/m/carro", rotulo: "Meu carro", icone: Car },
  { href: "/m/conversas", rotulo: "Conversas", icone: MessageCircle },
  { href: "/carros", rotulo: "Buscar carros", icone: Search },
  { href: "/m/extrato", rotulo: "Extrato", icone: Receipt },
  { href: "/m/meu-contrato", rotulo: "Meu contrato", icone: FileText },
  { href: "/m/minha-vistoria", rotulo: "Vistoria do carro", icone: ClipboardCheck },
] as const;

/** Botão de menu do app do motorista, com a gaveta lateral. */
export function MenuMotorista({ claro = false }: { claro?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const caminho = usePathname();
  return (
    <>
      <button
        onClick={() => setAberto(true)}
        aria-label="Abrir menu"
        aria-expanded={aberto}
        className={`grid size-10 place-items-center rounded-full ${claro ? "bg-white/10 text-white ring-1 ring-white/15" : "hover:bg-cartao-2"}`}
      >
        <Menu size={20} />
      </button>
      <Gaveta aberta={aberto} aoFechar={() => setAberto(false)} lado="direita" rotulo="Menu do motorista">
        <div className="flex flex-1 flex-col px-4 pt-5 pb-5">
          <Link href="/m" className="w-fit px-1"><Marca /></Link>
          <nav className="mt-8 flex flex-col gap-1" aria-label="Menu">
            {ITENS.map(({ href, rotulo, icone: Icone }) => {
              const atual = caminho === href || (href !== "/m" && caminho.startsWith(href));
              return (
                <Link key={href} href={href as Route} aria-current={atual ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 font-semibold ${atual ? "bg-marca-suave text-marca" : "hover:bg-cartao-2"}`}>
                  <Icone size={20} className={atual ? "" : "text-suave"} /> {rotulo}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto flex flex-col gap-1 border-t border-borda pt-4">
            <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-suave hover:bg-cartao-2"><Globe size={18} /> Site do Aluguei</Link>
            <form action="/sair" method="post">
              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-suave hover:bg-cartao-2"><LogOut size={18} /> Sair</button>
            </form>
          </div>
        </div>
      </Gaveta>
    </>
  );
}
