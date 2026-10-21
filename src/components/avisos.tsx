import { Bell, BellOff, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Vazio } from "@/components/ui";
import { marcarAvisosLidos } from "@/lib/acoes-avisos";
import { supabaseAdmin } from "@/lib/supabase/admin";

function quando(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const mesmoDia = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) === hoje.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return mesmoDia
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });
}

/** Central de avisos (os mesmos nos dois modos: são da pessoa, não do modo). */
export async function ListaAvisos({ usuarioId }: { usuarioId: string }) {
  const { data } = await supabaseAdmin().from("notificacoes").select("id, titulo, texto, criado_em, lida_em").eq("destinatario_usuario_id", usuarioId).eq("canal", "app").order("criado_em", { ascending: false }).limit(60);
  const avisos = data ?? [];
  if (!avisos.length) return <Vazio icone={BellOff} titulo="Nenhum aviso ainda">Lembretes de pagamento e de check-in, mensagens novas e respostas do suporte aparecem aqui.</Vazio>;
  const naoLidos = avisos.filter((a) => !a.lida_em).length;
  return (
    <div className="flex flex-col gap-3">
      {naoLidos > 0 && (
        <form action={async () => { "use server"; await marcarAvisosLidos(); }} className="flex justify-end">
          <button className="text-sm font-semibold text-marca">Marcar {naoLidos === 1 ? "o novo" : `os ${naoLidos} novos`} como lidos</button>
        </form>
      )}
      <div className="divide-y divide-borda overflow-hidden rounded-[1.1rem] border border-borda bg-cartao shadow-cartao">
        {avisos.map((a) => (
          <Link key={a.id} href={`/avisos/${a.id}` as Route} className="flex items-start gap-3 px-4 py-3 hover:bg-cartao-2">
            <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${a.lida_em ? "bg-cartao-2 text-suave" : "bg-marca-suave text-marca"}`}><Bell size={17} /></span>
            <span className="min-w-0 flex-1">
              <span className={`block text-sm ${a.lida_em ? "font-medium" : "font-bold"}`}>{a.titulo ?? "Aviso"}</span>
              <span className="line-clamp-2 block text-xs text-suave">{a.texto}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-[0.7rem] text-suave">{quando(a.criado_em)}</span>
              {!a.lida_em ? <span className="size-2.5 rounded-full bg-marca" aria-label="Novo" /> : <ChevronRight size={15} className="text-suave" />}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
