import { AlertTriangle, ArrowDownToLine, CircleDollarSign, Clock, Landmark, RefreshCw, Split } from "lucide-react";
import { BotaoAcao } from "@/components/painel/botao-acao";
import { Aviso, BotaoLink, CabecalhoPagina, Cartao, Indicador, Selo, Vazio } from "@/components/ui";
import { data, formatarData, hoje } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { contaDoLocador } from "@/lib/cobrancas";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { atualizarCobrancas, registrarPagamentoPorFora } from "./acoes";

const STATUS = {
  emitida: { rotulo: "Aguardando", tom: "neutro" },
  vencida: { rotulo: "Vencida", tom: "perigo" },
  paga: { rotulo: "Paga", tom: "ok" },
  cancelada: { rotulo: "Cancelada", tom: "neutro" },
  estornada: { rotulo: "Estornada", tom: "alerta" },
} as const;

/** RF-061: recebido, a receber e inadimplência, com exportação. */
export default async function Financeiro() {
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const dia = hoje();
  const inicioMes = `${dia.slice(0, 7)}-01`;
  const [conta, { data: cobrancas }, { data: contratos }, { data: locatarios }, { data: obrigacoes }] = await Promise.all([
    contaDoLocador(organizacao.id),
    supabase.from("cobrancas").select("*").eq("organizacao_id", organizacao.id).order("vencimento", { ascending: false }).limit(100),
    supabase.from("contratos").select("id, locatario_id").eq("organizacao_id", organizacao.id),
    supabase.from("locatarios").select("id, nome").eq("organizacao_id", organizacao.id),
    supabase.from("obrigacoes").select("id, tipo").eq("organizacao_id", organizacao.id).neq("tipo", "checkin"),
  ]);
  const tipo = (obrigacaoId: string | null) => (obrigacoes?.find((o) => o.id === obrigacaoId)?.tipo === "caucao_parcela" ? "Caução" : "Aluguel");
  const lista = cobrancas ?? [];
  const nome = (contratoId: string) => locatarios?.find((l) => l.id === contratos?.find((c) => c.id === contratoId)?.locatario_id)?.nome ?? "—";
  const pagasNoMes = lista.filter((c) => c.status === "paga" && c.pago_em && c.pago_em.slice(0, 10) >= inicioMes);
  const recebido = pagasNoMes.reduce((s, c) => s + (c.valor_pago_centavos ?? c.valor_centavos), 0);
  const taxa = pagasNoMes.reduce((s, c) => s + c.split_plataforma_centavos, 0);
  const aReceber = lista.filter((c) => c.status === "emitida" && c.vencimento >= dia).reduce((s, c) => s + c.valor_centavos, 0);
  const atrasadas = lista.filter((c) => (c.status === "emitida" || c.status === "vencida") && c.vencimento < dia);
  const emAtraso = atrasadas.reduce((s, c) => s + c.valor_centavos, 0);

  return (
    <>
      <CabecalhoPagina
        titulo="Financeiro"
        subtitulo="Cobranças Pix, pagamentos e atrasos."
        acao={
          <>
            <BotaoAcao acao={atualizarCobrancas} rotulo="Atualizar" icone={<RefreshCw size={18} aria-hidden />} tamanho="md" />
            <BotaoLink href="/painel/financeiro/exportar" variante="secundario" icone={ArrowDownToLine} prefetch={false}>Exportar CSV</BotaoLink>
          </>
        }
      />

      {!conta && (
        <div className="mb-6">
          <Aviso tom="alerta" titulo="Ative os recebimentos para cobrar no Pix">
            <span className="flex flex-wrap items-center gap-3">Sem a conta de recebimento, as cobranças não são emitidas. <BotaoLink href="/painel/recebimentos" tamanho="sm" icone={Landmark}>Ativar agora</BotaoLink></span>
          </Aviso>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Indicador icone={CircleDollarSign} rotulo="Recebido no mês" valor={formatarBRL(recebido)} tom="ok" detalhe={`${pagasNoMes.length} pagamento(s)`} />
        <Indicador icone={Clock} rotulo="A receber" valor={formatarBRL(aReceber)} tom="marca" />
        <Indicador icone={AlertTriangle} rotulo="Em atraso" valor={formatarBRL(emAtraso)} tom="perigo" detalhe={`${atrasadas.length} cobrança(s)`} />
        <Indicador icone={Split} rotulo="Taxa Aluguei no mês" valor={formatarBRL(taxa)} tom="info" detalhe="Descontada no próprio Pix" />
      </section>

      <h2 className="mt-7 mb-3 text-base font-bold tracking-tight">Cobranças</h2>
      {!lista.length ? (
        <Vazio icone={CircleDollarSign} titulo="Nenhuma cobrança ainda">As cobranças são geradas 3 dias antes de cada vencimento, ou na hora pela ficha do contrato.</Vazio>
      ) : (
        <>
        <div className="divide-y divide-borda overflow-hidden rounded-[1.1rem] border border-borda bg-cartao shadow-cartao md:hidden">
          {lista.map((c) => {
            const atrasada = (c.status === "emitida" || c.status === "vencida") && c.vencimento < dia;
            const s = atrasada ? STATUS.vencida : STATUS[c.status as keyof typeof STATUS] ?? STATUS.emitida;
            return (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{nome(c.contrato_id)}</p>
                  <p className="text-xs text-suave">{tipo(c.obrigacao_id)} · {formatarData(data(c.vencimento))}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold tabular-nums">{formatarBRL(c.valor_pago_centavos ?? c.valor_centavos)}</span>
                  {c.status !== "paga" && c.status !== "cancelada" ? (
                    <BotaoAcao acao={registrarPagamentoPorFora.bind(null, c.id)} rotulo="Recebi por fora" confirmar="Marcar como pago?" />
                  ) : (
                    <Selo tom={s.tom}>{s.rotulo}</Selo>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <Cartao className="hidden overflow-hidden p-0 sm:p-0 md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="bg-cartao-2 text-left text-xs font-semibold tracking-wide text-suave uppercase">
                <tr>
                  <th className="px-5 py-3">Vencimento</th>
                  <th className="px-5 py-3">Motorista</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3 text-right">Valor</th>
                  <th className="px-5 py-3">Situação</th>
                  <th className="px-5 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {lista.map((c) => {
                  const atrasada = (c.status === "emitida" || c.status === "vencida") && c.vencimento < dia;
                  const s = atrasada ? STATUS.vencida : STATUS[c.status as keyof typeof STATUS] ?? STATUS.emitida;
                  return (
                    <tr key={c.id} className="hover:bg-cartao-2/60">
                      <td className="px-5 py-3.5 font-medium tabular-nums">{formatarData(data(c.vencimento))}</td>
                      <td className="px-5 py-3.5">{nome(c.contrato_id)}</td>
                      <td className="px-5 py-3.5 text-suave">{tipo(c.obrigacao_id)}</td>
                      <td className="px-5 py-3.5 text-right font-bold tabular-nums">
                        {formatarBRL(c.valor_pago_centavos ?? c.valor_centavos)}
                        {c.valor_pago_centavos !== null && c.valor_pago_centavos > c.valor_centavos && <span className="block text-xs font-medium text-alerta">com encargos</span>}
                      </td>
                      <td className="px-5 py-3.5"><Selo tom={s.tom}>{s.rotulo}</Selo>{c.pago_em && <span className="ml-2 text-xs text-suave">{new Date(c.pago_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>}</td>
                      <td className="px-5 py-3.5 text-right">
                        {c.status !== "paga" && c.status !== "cancelada" && (
                          <BotaoAcao acao={registrarPagamentoPorFora.bind(null, c.id)} rotulo="Recebi por fora" confirmar="Registrar como pago?" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Cartao>
        </>
      )}
    </>
  );
}
