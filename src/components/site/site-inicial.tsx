"use client";

import { Building2, Car, ChevronRight, CircleHelp, Layers, ListOrdered, LogIn, Menu, Tag, UserPlus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { Gaveta } from "@/components/gaveta";
import { lerPerfilEscolhido, salvarPerfilEscolhido } from "@/lib/perfil-escolhido";
import { Marca } from "@/components/ui";
import { ACOES_PERFIL, BotaoPerfil } from "./escolha-perfil";

type Perfil = "locador" | "motorista";

// As duas versões têm as mesmas seções, com os mesmos endereços.
const SECOES = [
  { href: "#como-funciona", rotulo: "Como funciona", icone: ListOrdered },
  { href: "#recursos", rotulo: "Recursos", icone: Layers },
  { href: "#preco", rotulo: "Preço", icone: Tag },
  { href: "#duvidas", rotulo: "Dúvidas", icone: CircleHelp },
];

/**
 * Página inicial com duas versões, alternadas pelo seletor flutuante:
 * locador (azul forte) e motorista (claro). O cabeçalho fica fixo no topo.
 */
export function SiteInicial({ locador, motorista }: { locador: ReactNode; motorista: ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil>("locador");
  const [rolou, setRolou] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const daUrl = new URLSearchParams(location.search).get("para");
    const inicial = daUrl === "motorista" || daUrl === "locador" ? daUrl : lerPerfilEscolhido();
    if (inicial) {
      setPerfil(inicial);
      salvarPerfilEscolhido(inicial);
    }
    const aoRolar = () => setRolou(window.scrollY > 24);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  function trocar(p: Perfil) {
    setPerfil(p);
    salvarPerfilEscolhido(p);
    const url = new URL(location.href);
    if (p === "motorista") url.searchParams.set("para", "motorista");
    else url.searchParams.delete("para");
    history.replaceState(null, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Sobre o azul do locador, no topo, o cabeçalho é transparente e branco.
  const sobreAzul = perfil === "locador" && !rolou;

  return (
    // A visão do motorista é sempre clara, mesmo com o aparelho no tema escuro.
    <div className={`min-h-dvh bg-cartao ${perfil === "motorista" ? "tema-claro" : ""}`}>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${sobreAzul ? "text-white" : "border-b border-borda bg-cartao/90 text-texto shadow-cartao backdrop-blur"}`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
          <Link href="/" aria-label="Aluguei, início" onClick={() => window.scrollTo({ top: 0 })}>
            <Marca inverso={sobreAzul} />
          </Link>
          <nav className={`hidden items-center gap-6 text-sm font-semibold md:flex ${sobreAzul ? "text-white/80" : "text-suave"}`} aria-label="Seções">
            {SECOES.map((s) => <a key={s.href} href={s.href} className="hover:text-current hover:opacity-100">{s.rotulo}</a>)}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <BotaoPerfil tipo="entrar" rotulo="Entrar" estilo={sobreAzul ? "text-white hover:bg-white/10" : "hover:bg-cartao-2"} />
            <BotaoPerfil tipo="criar" rotulo="Criar conta" estilo={sobreAzul ? "bg-white text-[#0b2a6b] hover:bg-white/90" : "bg-marca text-white shadow-marca hover:bg-marca-forte"} />
          </div>
          <button
            onClick={() => setMenu(true)}
            aria-label="Abrir menu"
            aria-expanded={menu}
            className={`grid size-10 place-items-center rounded-xl md:hidden ${sobreAzul ? "bg-white/10 ring-1 ring-white/20" : "bg-cartao-2"}`}
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      <div key={perfil} className="animar-entrada">{perfil === "locador" ? locador : motorista}</div>

      <footer className="border-t border-borda bg-cartao pb-28">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-8 text-center">
          <Marca className="text-base" />
          <p className="text-xs text-suave">© {new Date().getFullYear()} Aluguei · Locação de carros para motoristas de aplicativo</p>
        </div>
      </footer>

      {/* Seletor flutuante de perfil */}
      <div className="fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
        <div className="flex gap-1 rounded-full border border-borda bg-cartao/95 p-1.5 shadow-flutuante backdrop-blur" role="tablist" aria-label="Ver o Aluguei como">
          {([["locador", "Locador", Building2], ["motorista", "Motorista", Car]] as const).map(([id, rotulo, Icone]) => (
            <button
              key={id}
              role="tab"
              aria-selected={perfil === id}
              onClick={() => trocar(id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors ${perfil === id ? "bg-marca text-white shadow-marca" : "text-suave hover:text-texto"}`}
            >
              <Icone size={17} /> {rotulo}
            </button>
          ))}
        </div>
      </div>

      <Gaveta aberta={menu} aoFechar={() => setMenu(false)} lado="direita" escura rotulo="Menu do site">
        <div className="flex flex-1 flex-col px-5 pt-5 pb-6">
          <Link href="/" onClick={() => setMenu(false)} className="w-fit"><Marca inverso /></Link>
          <nav className="mt-7 flex flex-col gap-0.5" aria-label="Seções">
            {SECOES.map(({ href, rotulo, icone: Icone }) => (
              <a key={href} href={href} onClick={() => setMenu(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 font-semibold text-white/85 hover:bg-white/[0.07]">
                <Icone size={20} className="text-[#7dd3fc]" /> {rotulo}
              </a>
            ))}
          </nav>
          <div className="mt-8 flex flex-col gap-6">
            {([["criar", "Criar conta", UserPlus], ["entrar", "Já tenho conta", LogIn]] as const).map(([tipo, titulo, Icone]) => (
              <div key={tipo}>
                <p className="mb-2 flex items-center gap-2 px-1 text-[0.7rem] font-semibold tracking-[0.12em] text-white/50 uppercase"><Icone size={14} /> {titulo}</p>
                <div className="flex flex-col gap-2">
                  {ACOES_PERFIL[tipo].map(({ href, rotulo, detalhe, icone: I }) => (
                    <Link
                      key={href}
                      href={href as Route}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 ${tipo === "criar" ? "bg-white text-[#0b2a6b]" : "bg-white/[0.08] text-white ring-1 ring-white/12"}`}
                    >
                      <I size={20} className={tipo === "criar" ? "text-[#1f56e8]" : "text-[#7dd3fc]"} />
                      <span className="flex-1">
                        <span className="block text-sm font-semibold">{rotulo}</span>
                        <span className={`block text-xs ${tipo === "criar" ? "text-[#5b6880]" : "text-white/55"}`}>{detalhe}</span>
                      </span>
                      <ChevronRight size={18} className="opacity-50" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <footer className="mt-auto border-t border-white/10 pt-5 text-center">
            <Marca inverso className="text-sm" />
            <p className="mt-1.5 text-[0.7rem] text-white/45">© {new Date().getFullYear()} Aluguei · Locação para motoristas de app</p>
          </footer>
        </div>
      </Gaveta>
    </div>
  );
}
