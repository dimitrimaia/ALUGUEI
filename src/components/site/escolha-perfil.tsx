"use client";

import { Building2, Car, ChevronDown } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export const ACOES_PERFIL = {
  entrar: [
    { href: "/entrar?perfil=locador", rotulo: "Entrar como locador", detalhe: "Painel da locadora", icone: Building2 },
    { href: "/entrar?perfil=motorista", rotulo: "Entrar como motorista", detalhe: "Buscar e alugar carros", icone: Car },
  ],
  criar: [
    { href: "/entrar?perfil=locador&novo=1", rotulo: "Sou locador", detalhe: "Tenho carros para alugar", icone: Building2 },
    { href: "/entrar?perfil=motorista&novo=1", rotulo: "Sou motorista", detalhe: "Quero alugar um carro", icone: Car },
  ],
} as const;

/** Botão com menu suspenso que pergunta o perfil antes de ir para o login. */
export function BotaoPerfil({ tipo, rotulo, estilo }: { tipo: keyof typeof ACOES_PERFIL; rotulo: string; estilo: string }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAberto(false);
    document.addEventListener("click", fora);
    return () => document.removeEventListener("click", fora);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setAberto((v) => !v)} aria-expanded={aberto} className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-colors ${estilo}`}>
        {rotulo} <ChevronDown size={16} className={`transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>
      {aberto && (
        <div className="animar-entrada absolute right-0 mt-2 w-64 rounded-2xl border border-borda bg-cartao p-2 text-texto shadow-flutuante">
          {ACOES_PERFIL[tipo].map(({ href, rotulo, detalhe, icone: Icone }) => (
            <Link key={href} href={href as Route} className="flex items-center gap-3 rounded-xl p-3 hover:bg-cartao-2">
              <span className="grid size-10 place-items-center rounded-xl bg-marca-suave text-marca"><Icone size={20} /></span>
              <span>
                <span className="block text-sm font-semibold">{rotulo}</span>
                <span className="block text-xs text-suave">{detalhe}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
