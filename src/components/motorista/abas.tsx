"use client";

import { FileText, Home, Receipt } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/m", rotulo: "Início", icone: Home, ativo: (c: string) => c === "/m" },
  { href: "/m/extrato", rotulo: "Extrato", icone: Receipt, ativo: (c: string) => c.startsWith("/m/extrato") || c.startsWith("/m/pagar") },
  { href: "/m/meu-contrato", rotulo: "Contrato", icone: FileText, ativo: (c: string) => c.startsWith("/m/contrato") },
] as const;

/** Abas fixas embaixo, como num app. O menu completo fica no botão ☰ do topo. */
export function AbasMotorista() {
  const caminho = usePathname();
  if (caminho.startsWith("/m/cadastro")) return null;
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-cartao/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto grid max-w-[30rem] grid-cols-3">
        {ABAS.map(({ href, rotulo, icone: Icone, ativo }) => {
          const atual = ativo(caminho);
          return (
            <Link key={href} href={href as Route} aria-current={atual ? "page" : undefined} className={`flex flex-col items-center gap-1 pt-2.5 pb-2 text-[0.7rem] font-semibold ${atual ? "text-marca" : "text-suave"}`}>
              <span className={`grid h-7 w-14 place-items-center rounded-full ${atual ? "bg-marca-suave" : ""}`}><Icone size={21} /></span>
              {rotulo}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
