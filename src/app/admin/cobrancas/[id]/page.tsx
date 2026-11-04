import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormAcao } from "@/components/admin/form-acao";
import { quando, TituloAdmin } from "@/components/admin/ui";
import { Botao, Cartao, DadoRotulado, classeEntrada } from "@/components/ui";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { cancelarCobranca, estornarCobranca } from "../../acoes-admin";

export const metadata = { title: "Cobrança" };

export default async function Cobranca({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: c } = await supabaseAdmin().from("cobrancas").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const aberta = c.status === "emitida" || c.status === "vencida";
  return (
    <main className="mx-auto max-w-3xl">
      <TituloAdmin titulo={`Cobrança de ${formatarBRL(c.valor_centavos)}`} subtitulo={`vence ${c.vencimento.split("-").reverse().join("/")} · ${c.status}`} acao={<Link href="/admin/cobrancas" className="text-sm font-semibold text-marca">← Cobranças</Link>} />
      <div className="flex flex-col gap-4">
        <Cartao>
          <dl className="divide-y divide-borda">
            <DadoRotulado rotulo="Locadora"><Link href={`/admin/locadoras/${c.organizacao_id}` as Route} className="text-marca">ver locadora</Link></DadoRotulado>
            <DadoRotulado rotulo="Contrato"><Link href={`/admin/contratos/${c.contrato_id}` as Route} className="text-marca">ver contrato</Link></DadoRotulado>
            <DadoRotulado rotulo="Provedor">{c.provedor}{c.provedor_id ? ` · ${c.provedor_id}` : ""}</DadoRotulado>
            <DadoRotulado rotulo="Pago">{c.valor_pago_centavos ? `${formatarBRL(c.valor_pago_centavos)} em ${quando(c.pago_em, true)}` : "—"}</DadoRotulado>
            <DadoRotulado rotulo="Parte da plataforma">{formatarBRL(c.split_plataforma_centavos)}</DadoRotulado>
          </dl>
        </Cartao>
        {aberta && (
          <Cartao className="flex flex-col gap-3">
            <h2 className="font-bold">Cancelar</h2>
            <p className="text-xs text-suave">Cancela no Asaas e aqui. <strong>Só cancelar</strong>: a obrigação continua devida e a rotina diária emite outra cobrança. <strong>Cancelar e isentar</strong>: o motorista não deve mais esse valor (lança a isenção no extrato).</p>
            <FormAcao acao={cancelarCobranca.bind(null, id, false)}>
              <input name="motivo" placeholder="Motivo" className={classeEntrada} />
              <input name="confirmar" placeholder="Digite CANCELAR" className={classeEntrada} required />
              <Botao variante="secundario">Só cancelar</Botao>
            </FormAcao>
            <FormAcao acao={cancelarCobranca.bind(null, id, true)}>
              <input name="motivo" placeholder="Motivo da isenção" className={classeEntrada} required />
              <input name="confirmar" placeholder="Digite CANCELAR" className={classeEntrada} required />
              <Botao variante="perigo">Cancelar e isentar</Botao>
            </FormAcao>
          </Cartao>
        )}
        {c.status === "paga" && c.provedor_id && (
          <Cartao className="flex flex-col gap-3">
            <h2 className="font-bold">Estornar</h2>
            <p className="text-xs text-suave">Devolve o Pix ao pagador pelo Asaas, lança o estorno no extrato e a obrigação volta a ficar pendente. Não dá para desfazer.</p>
            <FormAcao acao={estornarCobranca.bind(null, id)}>
              <input name="motivo" placeholder="Motivo do estorno" className={classeEntrada} required />
              <input name="confirmar" placeholder="Digite ESTORNAR" className={classeEntrada} required />
              <Botao variante="perigo">Estornar</Botao>
            </FormAcao>
          </Cartao>
        )}
      </div>
    </main>
  );
}
