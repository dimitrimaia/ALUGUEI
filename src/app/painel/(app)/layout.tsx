import Link from "next/link";
import { exigirEquipe } from "@/lib/sessao";

const MENU = [
  { href: "/painel", rotulo: "Visão geral" },
  { href: "/painel/veiculos", rotulo: "Veículos" },
  { href: "/painel/motoristas", rotulo: "Motoristas" },
  { href: "/painel/contratos", rotulo: "Contratos" },
] as const;

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const { organizacao } = await exigirEquipe();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[14rem_1fr]">
      <aside className="border-b p-4 md:border-r md:border-b-0" style={{ borderColor: "var(--borda)" }}>
        <p className="font-semibold">Aluguei</p>
        <p className="mb-4 truncate text-sm" style={{ color: "var(--suave)" }}>{organizacao.nome}</p>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {MENU.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 whitespace-nowrap hover:underline">
              {item.rotulo}
            </Link>
          ))}
        </nav>
        <form action="/sair" method="post" className="mt-4 hidden md:block">
          <button className="text-sm underline" style={{ color: "var(--suave)" }}>Sair</button>
        </form>
      </aside>
      <main className="mx-auto w-full max-w-5xl p-4 md:p-8">{children}</main>
    </div>
  );
}
