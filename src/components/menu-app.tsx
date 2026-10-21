"use client";

import { ChevronRight, Globe, LogOut, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gaveta } from "@/components/gaveta";
import { Avatar, Marca } from "@/components/ui";

export interface ItemMenu {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  contador?: number;
  /** Prefixos que também marcam o item como atual. */
  tambem?: readonly string[];
}

export interface PerfilMenu {
  nome: string;
  foto: string | null;
  detalhe: string;
}

function atual(caminho: string, item: ItemMenu) {
  return [item.href, ...(item.tambem ?? [])].some((h) => caminho === h || caminho.startsWith(`${h}/`));
}

/**
 * Menu lateral das áreas logadas, no mesmo estilo do menu do site: abre pela
 * direita, com a caixa do perfil no topo, as opções em faixas e o rodapé.
 */
export function MenuApp({
  aberto,
  aoFechar,
  inicio,
  perfil,
  conta,
  secoes,
}: {
  aberto: boolean;
  aoFechar: () => void;
  inicio: string;
  perfil: PerfilMenu;
  conta: string;
  secoes: readonly { titulo: string; itens: readonly ItemMenu[] }[];
}) {
  const caminho = usePathname();
  return (
    <Gaveta aberta={aberto} aoFechar={aoFechar} lado="direita" escura rotulo="Menu">
      <div className="flex flex-1 flex-col px-5 pt-5 pb-6">
        <Link href={inicio as Route} className="w-fit" aria-label="Início do app"><Marca inverso /></Link>

        <Link href={conta as Route} className="mt-6 flex items-center gap-3 rounded-xl bg-white px-3.5 py-3 text-[#0b2a6b]">
          <Avatar nome={perfil.nome} foto={perfil.foto} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{perfil.nome}</span>
            <span className="block truncate text-xs text-[#5b6880]">{perfil.detalhe}</span>
          </span>
          <span className="shrink-0 text-[0.7rem] font-semibold text-[#1f56e8]">Perfil</span>
          <ChevronRight size={16} className="-ml-1 shrink-0 opacity-50" />
        </Link>

        {secoes.map(({ titulo, itens }) => (
          <div key={titulo} className="mt-6">
            <p className="mb-1.5 px-1 text-[0.68rem] font-semibold tracking-[0.12em] text-white/45 uppercase">{titulo}</p>
            <nav className="flex flex-col gap-0.5" aria-label={titulo}>
              {itens.map((item) => {
                const Icone = item.icone;
                const ativo = atual(caminho, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href as Route}
                    aria-current={ativo ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] font-semibold ${ativo ? "bg-white/12 text-white" : "text-white/85 hover:bg-white/[0.07]"}`}
                  >
                    <Icone size={19} className="text-[#7dd3fc]" />
                    <span className="flex-1">{item.rotulo}</span>
                    {!!item.contador && <span className="grid min-w-5 place-items-center rounded-full bg-[#ffb020] px-1.5 text-[0.7rem] font-bold text-[#3a2500]">{item.contador}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}

        <div className="mt-8 flex flex-col gap-2">
          <Link href="/" className="flex items-center gap-3 rounded-xl bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/12">
            <Globe size={18} className="text-[#7dd3fc]" /> <span className="flex-1">Ver o site do Aluguei</span> <ChevronRight size={16} className="opacity-50" />
          </Link>
          <form action="/sair" method="post">
            <button className="flex w-full items-center gap-3 rounded-xl bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/12"><LogOut size={18} className="text-[#7dd3fc]" /> Sair</button>
          </form>
        </div>

        <footer className="mt-auto border-t border-white/10 pt-5 text-center">
          <Marca inverso className="text-sm" />
          <p className="mt-1.5 text-[0.7rem] text-white/45">© {new Date().getFullYear()} Aluguei · Locação para motoristas de app</p>
        </footer>
      </div>
    </Gaveta>
  );
}
