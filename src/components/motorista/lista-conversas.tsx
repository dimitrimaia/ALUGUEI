import { MessageCircle } from "lucide-react";
import Link from "next/link";
import type { ResumoConversa } from "@/lib/conversas";

const quando = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });

export function ListaConversas({ conversas }: { conversas: ResumoConversa[] }) {
  return (
    <div className="divide-y divide-borda overflow-hidden rounded-[1.1rem] border border-borda bg-cartao shadow-cartao">
      {conversas.map((c) => (
        <Link key={c.id} href={`/m/conversas/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-cartao-2">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-suave text-marca"><MessageCircle size={18} /></span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate text-sm ${c.naoLida ? "font-bold" : "font-medium"}`}>{c.carro}</span>
            <span className="block truncate text-xs text-suave">{c.locador}</span>
          </span>
          <span className="flex flex-col items-end gap-1">
            <span className="text-[0.7rem] text-suave">{quando(c.ultimaMensagemEm)}</span>
            {c.naoLida && <span className="size-2.5 rounded-full bg-marca" aria-label="Mensagem nova" />}
          </span>
        </Link>
      ))}
    </div>
  );
}
