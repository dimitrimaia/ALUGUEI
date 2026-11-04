import type { Route } from "next";
import Link from "next/link";
import { Selo } from "@/components/ui";
import { Filtros, Numero, quando, Tabela, TituloAdmin } from "@/components/admin/ui";
import { hoje } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { conferirCobranca } from "../acoes-admin";

export const metadata = { title: "Cobranças" };

export default async function Cobrancas({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "" } = await searchParams;
  const admin = supabaseAdmin();
  const dia = hoje();
  let q = admin.from("cobrancas").select("*").order("vencimento", { ascending: false }).limit(1000);
  if (status === "vencida") q = q.in("status", ["emitida", "vencida"]).lt("vencimento", dia);
  else if (status) q = q.eq("status", status);
  const [{ data: cobrancas }, { data: orgs }] = await Promise.all([q, admin.from("organizacoes").select("id, nome").limit(5000)]);
  const lista = cobrancas ?? [];
  const soma = (f: (c: (typeof lista)[number]) => number) => lista.reduce((s, c) => s + f(c), 0);
  return (
    <main className="mx-auto max-w-6xl">
      <TituloAdmin titulo="Cobranças" subtitulo={`${lista.length} cobranças`} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Numero rotulo="Valor" valor={formatarBRL(soma((c) => c.valor_centavos))} />
        <Numero rotulo="Recebido" valor={formatarBRL(soma((c) => c.valor_pago_centavos ?? 0))} tom="ok" />
        <Numero rotulo="Plataforma" valor={formatarBRL(soma((c) => (c.status === "paga" ? c.split_plataforma_centavos : 0)))} />
      </div>
      <Filtros base="/admin/cobrancas" param="status" atual={status} opcoes={[["", "Todas"], ["emitida", "Em aberto"], ["vencida", "Vencidas"], ["paga", "Pagas"], ["cancelada", "Canceladas"]]} />
      <Tabela
        colunas={["Vencimento", "Locadora", "Valor", "Status", "Pago em", ""]}
        linhas={lista.map((c) => {
          const atrasada = (c.status === "emitida" || c.status === "vencida") && c.vencimento < dia;
          return {
            chave: c.id,
            href: `/admin/cobrancas/${c.id}`,
            celulas: [
              c.vencimento,
              <Link key="o" href={`/admin/locadoras/${c.organizacao_id}` as Route} className="text-marca">{orgs?.find((o) => o.id === c.organizacao_id)?.nome ?? "—"}</Link>,
              formatarBRL(c.valor_centavos),
              <Selo key="s" tom={c.status === "paga" ? "ok" : atrasada ? "perigo" : "neutro"}>{atrasada ? "vencida" : c.status}</Selo>,
              quando(c.pago_em, true),
              c.provedor_id && c.status !== "paga" ? <form key="f" action={conferirCobranca.bind(null, c.id)}><button className="text-xs font-semibold text-marca">Conferir no Asaas</button></form> : null,
            ],
          };
        })}
        vazio="Nenhuma cobrança."
      />
    </main>
  );
}
