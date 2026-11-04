import type { Route } from "next";
import Link from "next/link";
import { Filtros, Tabela, TituloAdmin } from "@/components/admin/ui";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Contratos" };

export default async function Contratos({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "" } = await searchParams;
  const admin = supabaseAdmin();
  let q = admin.from("contratos").select("id, status, inicio, fim, parametros, organizacao_id, locatario_id, veiculo_id").order("inicio", { ascending: false }).limit(1000);
  if (status) q = q.eq("status", status as "ativo");
  const { data: contratos } = await q;
  const lista = contratos ?? [];
  const [{ data: orgs }, { data: locs }, { data: carros }] = await Promise.all([
    admin.from("organizacoes").select("id, nome").limit(5000),
    lista.length ? admin.from("locatarios").select("id, nome, usuario_id").in("id", [...new Set(lista.map((k) => k.locatario_id))]) : Promise.resolve({ data: [] as { id: string; nome: string; usuario_id: string | null }[] }),
    lista.length ? admin.from("veiculos").select("id, placa").in("id", [...new Set(lista.map((k) => k.veiculo_id))]) : Promise.resolve({ data: [] as { id: string; placa: string }[] }),
  ]);
  return (
    <main className="mx-auto max-w-6xl">
      <TituloAdmin titulo="Contratos" subtitulo={`${lista.length} contratos`} />
      <Filtros base="/admin/contratos" param="status" atual={status} opcoes={[["", "Todos"], ["ativo", "Ativos"], ["aguardando_assinatura", "Aguardando assinatura"], ["assinado", "Assinados"], ["encerrado", "Encerrados"], ["rescindido", "Rescindidos"]]} />
      <Tabela
        colunas={["Motorista", "Carro", "Locadora", "Status", "Período", "Aluguel"]}
        linhas={lista.map((k) => {
          const loc = locs?.find((l) => l.id === k.locatario_id);
          return {
            chave: k.id,
            celulas: [
              loc?.usuario_id ? <Link key="m" href={`/admin/usuarios/${loc.usuario_id}` as Route} className="font-semibold text-marca">{loc.nome}</Link> : (loc?.nome ?? "—"),
              carros?.find((c) => c.id === k.veiculo_id)?.placa ?? "—",
              <Link key="o" href={`/admin/locadoras/${k.organizacao_id}` as Route} className="text-marca">{orgs?.find((o) => o.id === k.organizacao_id)?.nome ?? "—"}</Link>,
              k.status,
              `${k.inicio} → ${k.fim}`,
              `${formatarBRL(((k.parametros ?? {}) as { aluguelSemanal?: number }).aluguelSemanal ?? 0)}/sem`,
            ],
          };
        })}
        vazio="Nenhum contrato."
      />
    </main>
  );
}
