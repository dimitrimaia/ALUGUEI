"use client";

import { Car, FileText, LayoutDashboard, LogOut, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Marca } from "@/components/ui";

const MENU = [
  { href: "/painel", rotulo: "Início", icone: LayoutDashboard },
  { href: "/painel/veiculos", rotulo: "Veículos", icone: Car },
  { href: "/painel/motoristas", rotulo: "Motoristas", icone: Users },
  { href: "/painel/contratos", rotulo: "Contratos", icone: FileText },
] as const;

function ativo(caminho: string, href: string) {
  return href === "/painel" ? caminho === href : caminho === href || caminho.startsWith(`${href}/`);
}

/** Barra lateral no computador; barra superior + abas inferiores no celular. */
export function NavegacaoPainel({ organizacao, pendentes }: { organizacao: string; pendentes: number }) {
  const caminho = usePathname();
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-borda bg-cartao px-4 py-5 lg:flex">
        <Link href="/painel" className="px-2"><Marca /></Link>
        <p className="mt-1 truncate px-2 text-sm text-suave">{organizacao}</p>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Principal">
          {MENU.map(({ href, rotulo, icone: Icone }) => {
            const atual = ativo(caminho, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={atual ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-colors ${atual ? "bg-marca-suave text-marca" : "text-suave hover:bg-cartao-2 hover:text-texto"}`}
              >
                <Icone size={20} aria-hidden />
                <span className="flex-1">{rotulo}</span>
                {href === "/painel/motoristas" && pendentes > 0 && (
                  <span className="rounded-full bg-alerta px-2 text-xs font-bold text-white">{pendentes}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <form action="/sair" method="post" className="mt-auto">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-suave hover:bg-cartao-2 hover:text-texto">
            <LogOut size={18} aria-hidden /> Sair
          </button>
        </form>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-borda bg-cartao/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/painel"><Marca /></Link>
        <span className="max-w-[45%] truncate text-sm text-suave">{organizacao}</span>
      </header>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-borda bg-cartao/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {MENU.map(({ href, rotulo, icone: Icone }) => {
          const atual = ativo(caminho, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={atual ? "page" : undefined}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[0.7rem] font-semibold ${atual ? "text-marca" : "text-suave"}`}
            >
              <Icone size={22} aria-hidden />
              {rotulo}
              {href === "/painel/motoristas" && pendentes > 0 && (
                <span className="absolute top-1.5 left-1/2 ml-2 size-2.5 rounded-full bg-alerta" aria-label={`${pendentes} pendente(s)`} />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
