import { LogOut } from "lucide-react";
import Link from "next/link";
import { Marca } from "@/components/ui";

/** Casca do app do motorista: pensado para celular, centralizado em telas maiores. */
export default function LayoutMotorista({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-borda bg-cartao/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link href="/m"><Marca /></Link>
          <form action="/sair" method="post">
            <button className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-suave hover:bg-cartao-2" aria-label="Sair">
              <LogOut size={18} aria-hidden /> Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 pt-5 pb-10">{children}</main>
    </div>
  );
}
