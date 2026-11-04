import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormAcao } from "@/components/admin/form-acao";
import { quando, Tabela, TituloAdmin } from "@/components/admin/ui";
import { Botao, Cartao, DadoRotulado, classeEntrada } from "@/components/ui";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { prorrogarContrato } from "../../acoes-admin";

export const metadata = { title: "Contrato" };

/**
 * Contrato por dentro. As regras (parâmetros) ficam congeladas: a equipe só
 * prorroga o fim. Rescisão e retomada continuam sendo decisão do locador.
 */
export default async function Contrato({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = supabaseAdmin();
  const { data: k } = await admin.from("contratos").select("*").eq("id", id).maybeSingle();
  if (!k) notFound();
  const [{ data: loc }, { data: carro }, { data: org }, { data: cobrancas }] = await Promise.all([
    admin.from("locatarios").select("nome, usuario_id").eq("id", k.locatario_id).maybeSingle(),
    admin.from("veiculos").select("placa, modelo").eq("id", k.veiculo_id).maybeSingle(),
    admin.from("organizacoes").select("nome").eq("id", k.organizacao_id).maybeSingle(),
    admin.from("cobrancas").select("id, vencimento, valor_centavos, status").eq("contrato_id", id).order("vencimento", { ascending: false }).limit(60),
  ]);
  const p = (k.parametros ?? {}) as { aluguelSemanal?: number; caucao?: number };
  return (
    <main className="mx-auto max-w-4xl">
      <TituloAdmin titulo={`${loc?.nome ?? "Motorista"} · ${carro?.placa ?? ""}`} subtitulo={`${org?.nome ?? ""} · ${k.status}`} acao={<Link href="/admin/contratos" className="text-sm font-semibold text-marca">← Contratos</Link>} />
      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-4">
          <Cartao>
            <dl className="divide-y divide-borda">
              <DadoRotulado rotulo="Período">{k.inicio} → {k.fim}</DadoRotulado>
              <DadoRotulado rotulo="Aluguel">{formatarBRL(p.aluguelSemanal ?? 0)}/semana</DadoRotulado>
              <DadoRotulado rotulo="Carro">{carro?.modelo ?? "—"}</DadoRotulado>
              <DadoRotulado rotulo="Assinado">{quando(k.assinado_em, true)}</DadoRotulado>
              {loc?.usuario_id && <DadoRotulado rotulo="Conta"><Link href={`/admin/usuarios/${loc.usuario_id}` as Route} className="text-marca">ver motorista</Link></DadoRotulado>}
            </dl>
          </Cartao>
          <Tabela colunas={["Vencimento", "Valor", "Status"]} linhas={(cobrancas ?? []).map((c) => ({ chave: c.id, href: `/admin/cobrancas/${c.id}`, celulas: [c.vencimento, formatarBRL(c.valor_centavos), c.status] }))} vazio="Nenhuma cobrança." />
        </div>
        {(k.status === "ativo" || k.status === "assinado") && (
          <Cartao className="flex flex-col gap-2">
            <h2 className="font-bold">Prorrogar</h2>
            <p className="text-xs text-suave">Só muda a data de fim; as regras do contrato não mudam.</p>
            <FormAcao acao={prorrogarContrato.bind(null, id)}>
              <input type="date" name="fim" min={k.fim} defaultValue={k.fim} className={classeEntrada} required />
              <Botao>Prorrogar</Botao>
            </FormAcao>
          </Cartao>
        )}
      </div>
    </main>
  );
}
