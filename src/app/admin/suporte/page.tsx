import { LifeBuoy } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { CabecalhoPagina, Selo, Vazio } from "@/components/ui";
import { exigirEquipeAluguei } from "@/lib/equipe-aluguei";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Suporte · equipe", robots: { index: false } };

/** Fila da equipe do Aluguei. Abertos (esperando resposta) primeiro. */
export default async function FilaSuporte() {
  await exigirEquipeAluguei();
  const { data } = await supabaseAdmin().from("atendimentos").select("*").order("ultima_mensagem_em", { ascending: false }).limit(100);
  const lista = [...(data ?? [])].sort((a, b) => Number(b.status === "aberto") - Number(a.status === "aberto"));
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <CabecalhoPagina titulo="Suporte" subtitulo={`${lista.filter((a) => a.status === "aberto").length} esperando resposta`} acao={<Link href="/admin/verificacoes" className="text-sm font-semibold text-marca">Verificação de carros</Link>} />
      {!lista.length ? (
        <Vazio icone={LifeBuoy} titulo="Nenhum atendimento">Quando alguém escrever para o suporte, aparece aqui.</Vazio>
      ) : (
        <div className="divide-y divide-borda overflow-hidden rounded-[1.1rem] border border-borda bg-cartao shadow-cartao">
          {lista.map((a) => (
            <Link key={a.id} href={`/admin/suporte/${a.id}` as Route} className="flex items-center gap-3 px-4 py-3 hover:bg-cartao-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{a.assunto}</span>
                <span className="block text-xs text-suave">{a.canal === "whatsapp" ? "WhatsApp" : a.modo === "locador" ? "Locador" : "Motorista"} · {new Date(a.ultima_mensagem_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}</span>
              </span>
              <Selo tom={a.status === "aberto" ? "alerta" : a.status === "respondido" ? "ok" : "neutro"}>{a.status === "aberto" ? "Responder" : a.status === "respondido" ? "Respondido" : "Encerrado"}</Selo>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
