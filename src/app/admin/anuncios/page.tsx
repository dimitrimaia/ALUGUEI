import type { Route } from "next";
import Link from "next/link";
import { Selo } from "@/components/ui";
import { Filtros, quando, Tabela, TituloAdmin } from "@/components/admin/ui";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { moderarAnuncio } from "../acoes-admin";

export const metadata = { title: "Anúncios" };

/** Moderação do marketplace: anúncio com problema é pausado aqui (fica na auditoria). */
export default async function Anuncios({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s = "" } = await searchParams;
  const admin = supabaseAdmin();
  let q = admin.from("anuncios").select("*").order("atualizado_em", { ascending: false }).limit(1000);
  if (s) q = q.eq("status", s as "ativo");
  const [{ data: anuncios }, { data: orgs }, { data: carros }] = await Promise.all([q, admin.from("organizacoes").select("id, nome").limit(5000), admin.from("veiculos").select("id, placa, modelo").limit(20_000)]);
  const org = (id: string) => orgs?.find((o) => o.id === id)?.nome ?? "—";
  const carro = (id: string) => carros?.find((c) => c.id === id);
  return (
    <main className="mx-auto max-w-6xl">
      <TituloAdmin titulo="Anúncios" subtitulo={`${anuncios?.length ?? 0} anúncios`} />
      <Filtros base="/admin/anuncios" param="s" atual={s} opcoes={[["", "Todos"], ["ativo", "Ativos"], ["pausado", "Pausados"]]} />
      <Tabela
        colunas={["Carro", "Locadora", "Cidade", "Semanal", "Status", "Atualizado", ""]}
        linhas={(anuncios ?? []).map((a) => ({
          chave: a.id,
          celulas: [
            `${carro(a.veiculo_id)?.modelo ?? "—"} · ${carro(a.veiculo_id)?.placa ?? ""}`,
            <Link key="o" href={`/admin/locadoras/${a.organizacao_id}` as Route} className="text-marca">{org(a.organizacao_id)}</Link>,
            `${a.cidade}/${a.uf}`,
            formatarBRL(a.aluguel_semanal_centavos),
            <Selo key="s" tom={a.status === "ativo" ? "ok" : "neutro"}>{a.status}</Selo>,
            quando(a.atualizado_em, true),
            <form key="f" action={moderarAnuncio.bind(null, a.id, a.status === "ativo")}><button className={`text-xs font-semibold ${a.status === "ativo" ? "text-perigo" : "text-marca"}`}>{a.status === "ativo" ? "Pausar" : "Reativar"}</button></form>,
          ],
        }))}
        vazio="Nenhum anúncio."
      />
    </main>
  );
}
