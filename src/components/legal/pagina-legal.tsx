import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Marca } from "@/components/ui";

export const CONTATO = "suporte@aluguei.xyz";
export const CONTROLADOR = "50.076.948 DEMETRIUS FRANCISCO DETERLING NOGUEIRA MAIA, CNPJ 50.076.948/0001-07";

/** Moldura das páginas públicas de política (privacidade, termos, exclusão de conta). */
export function PaginaLegal({ titulo, atualizada, children }: { titulo: string; atualizada: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-fundo">
      <header className="border-b border-borda bg-cartao">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/"><Marca /></Link>
          <nav className="flex gap-4 text-sm font-semibold text-suave">
            <Link href={"/privacidade" as Route}>Privacidade</Link>
            <Link href={"/termos" as Route}>Termos</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="text-3xl font-bold tracking-tight">{titulo}</h1>
        <p className="mt-1 text-sm text-suave">Atualizada em {atualizada}</p>
        <div className="legal mt-6 flex flex-col gap-4 text-[0.95rem] leading-relaxed [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_a]:font-semibold [&_a]:text-marca">{children}</div>
      </main>
    </div>
  );
}
