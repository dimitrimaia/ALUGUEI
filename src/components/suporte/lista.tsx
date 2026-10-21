import { ChevronRight, LifeBuoy } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Selo } from "@/components/ui";
import type { Linha } from "@/db/tipos";

const STATUS = { aberto: { rotulo: "Aguardando o suporte", tom: "alerta" }, respondido: { rotulo: "Respondido", tom: "ok" }, encerrado: { rotulo: "Encerrado", tom: "neutro" } } as const;

export function ListaAtendimentos({ atendimentos, base }: { atendimentos: Linha<"atendimentos">[]; base: string }) {
  if (!atendimentos.length) return null;
  return (
    <section>
      <h2 className="mt-1 mb-2.5 text-base font-bold tracking-tight">Seus atendimentos</h2>
      <div className="divide-y divide-borda overflow-hidden rounded-[1.1rem] border border-borda bg-cartao shadow-cartao">
        {atendimentos.map((a) => {
          const novo = a.status === "respondido" && (!a.lido_usuario_em || a.lido_usuario_em < a.ultima_mensagem_em);
          return (
            <Link key={a.id} href={`${base}/${a.id}` as Route} className="flex items-center gap-3 px-4 py-3 hover:bg-cartao-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-marca-suave text-marca"><LifeBuoy size={17} /></span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm ${novo ? "font-bold" : "font-semibold"}`}>{a.assunto}</span>
                <span className="block text-xs text-suave">{new Date(a.ultima_mensagem_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" })}</span>
              </span>
              <Selo tom={STATUS[a.status].tom}>{novo ? "Resposta nova" : STATUS[a.status].rotulo}</Selo>
              <ChevronRight size={16} className="shrink-0 text-suave" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
