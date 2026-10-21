"use client";

import { Car, Home, MessageCircle, Search, UserRound } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConta } from "@/components/conta/contexto";
import { Avatar } from "@/components/ui";

const ABAS = [
  { href: "/m", rotulo: "Início", icone: Home, ativo: (c: string) => c === "/m" },
  { href: "/m/buscar", rotulo: "Buscar", icone: Search, ativo: (c: string) => c.startsWith("/m/buscar") },
  { href: "/m/carros", rotulo: "Meus carros", icone: Car, ativo: (c: string) => /^\/m\/(carros?|contrato|vistoria|extrato|pagar)(\/|$)/.test(c) },
  { href: "/m/conversas", rotulo: "Conversas", icone: MessageCircle, ativo: (c: string) => c.startsWith("/m/conversas") },
  { href: "/m/conta", rotulo: "Conta", icone: UserRound, ativo: (c: string) => c.startsWith("/m/conta") },
] as const;

/** Abas fixas embaixo, como num app. O menu completo fica no botão ☰ do topo. */
export function AbasMotorista() {
  const caminho = usePathname();
  const { perfil, naoLidas } = useConta();
  if (caminho.startsWith("/m/cadastro") || /^\/m\/conversas\/./.test(caminho)) return null;
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-cartao/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto grid max-w-[30rem] grid-cols-5">
        {ABAS.map(({ href, rotulo, icone: Icone, ativo }) => {
          const atual = ativo(caminho);
          return (
            <Link key={href} href={href as Route} aria-current={atual ? "page" : undefined} className={`relative flex flex-col items-center gap-1 pt-2 pb-1.5 text-[0.66rem] font-semibold ${atual ? "text-marca" : "text-suave"}`}>
              <span className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${atual ? "bg-marca-suave" : ""}`}>
                {href === "/m/conta" && perfil.foto ? <Avatar nome={perfil.nome} foto={perfil.foto} className={`!size-6 ${atual ? "ring-2 ring-marca" : ""}`} /> : <Icone size={20} />}
              </span>
              {rotulo}
              {href === "/m/conversas" && naoLidas > 0 && <span className="absolute top-1.5 left-1/2 ml-2.5 grid min-w-4 place-items-center rounded-full bg-[#ffb020] px-1 text-[0.6rem] font-bold text-[#3a2500] ring-2 ring-cartao">{naoLidas}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
