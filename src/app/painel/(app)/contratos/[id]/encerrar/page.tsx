import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { BotaoAcao } from "@/components/painel/botao-acao";
import { Aviso, BotaoLink, CabecalhoPagina, Cartao, DadoRotulado, Selo } from "@/components/ui";
import { hoje as hojeISO } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { type Demonstrativo, MOTIVOS_ENCERRAMENTO, type MotivoEncerramento, itensQuePioraram } from "@/dominio/encerramento/demonstrativo";
import { combustivelPorExtenso } from "@/dominio/vistoria/roteiro";
import { dadosEncerramento } from "@/lib/encerramento";
import { exigirEquipe } from "@/lib/sessao";
import { confirmarDevolucaoCaucao } from "./acoes";
import { FormularioEncerramento } from "./formulario";

export const metadata = { title: "Devolução e encerramento" };

const br = (iso: string) => iso.split("-").reverse().join("/");

/**
 * Devolução do carro e encerramento do contrato (RF-035, RF-045, RF-060):
 * 1. vistoria de devolução; 2. demonstrativo de pendências; 3. caução devolvida.
 */
export default async function Encerrar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizacao } = await exigirEquipe();
  const hoje = hojeISO();
  const d = await dadosEncerramento(id, organizacao.id, hoje);
  if (!d) notFound();
  const c = d.contrato;
  const voltar = { href: `/painel/contratos/${id}`, rotulo: "Contrato" };

  if (c.status === "encerrado" || c.status === "rescindido") {
    const dem = d.devolucao?.pendencias as unknown as (Demonstrativo & { motivo: MotivoEncerramento }) | null;
    return (
      <div className="max-w-2xl">
        <CabecalhoPagina voltar={voltar} titulo={c.status === "rescindido" ? "Contrato rescindido" : "Contrato encerrado"} subtitulo={c.devolucao_em ? `Carro devolvido em ${br(c.devolucao_em)}` : undefined} />
        <div className="flex flex-col gap-4">
          {dem && (
            <Cartao>
              <p className="mb-2 font-semibold">Demonstrativo</p>
              <dl className="divide-y divide-borda">
                <DadoRotulado rotulo="Motivo">{MOTIVOS_ENCERRAMENTO[dem.motivo]?.rotulo}</DadoRotulado>
                <DadoRotulado rotulo="Km rodados">{dem.kmRodados.toLocaleString("pt-BR")} km (franquia {dem.franquiaKm.toLocaleString("pt-BR")} km)</DadoRotulado>
                {dem.pendencias.map((p, i) => <DadoRotulado key={i} rotulo={p.tipo === "km_excedente" ? "Km excedente" : p.descricao}>{formatarBRL(p.valor)}</DadoRotulado>)}
                <DadoRotulado rotulo="Total devido">{formatarBRL(dem.totalDevido)}</DadoRotulado>
                <DadoRotulado rotulo="Usado da caução">{formatarBRL(dem.usoCaucao)}</DadoRotulado>
                {dem.saldoFinal > 0 && <DadoRotulado rotulo="Saldo devedor">{formatarBRL(dem.saldoFinal)}</DadoRotulado>}
              </dl>
            </Cartao>
          )}
          <Cartao className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">Caução a devolver: {formatarBRL(c.caucao_devolver_centavos ?? 0)}</p>
              {c.caucao_devolvida_em ? <Selo tom="ok">Devolvida</Selo> : (c.caucao_devolver_centavos ?? 0) > 0 ? <Selo tom="alerta">Até {br(c.caucao_devolver_ate ?? hoje)}</Selo> : <Selo tom="neutro">Nada a devolver</Selo>}
            </div>
            {!c.caucao_devolvida_em && (c.caucao_devolver_centavos ?? 0) > 0 && (
              <>
                <p className="text-sm text-suave">Faça o Pix para o motorista e confirme aqui. Ele recebe o aviso, e a data fica no histórico do contrato.</p>
                <BotaoAcao acao={confirmarDevolucaoCaucao.bind(null, id)} rotulo="Já devolvi a caução" variante="primario" confirmar="Confirmar que a caução foi devolvida?" />
              </>
            )}
          </Cartao>
        </div>
      </div>
    );
  }

  if (c.status !== "ativo") return <div className="max-w-2xl"><CabecalhoPagina voltar={voltar} titulo="Encerrar contrato" /><Aviso tom="neutro">Só dá para encerrar um contrato ativo.</Aviso></div>;

  if (!d.devolucao || !d.entrega || !d.checklistEntrega || !d.checklistDevolucao) {
    return (
      <div className="max-w-2xl">
        <CabecalhoPagina voltar={voltar} titulo="Devolução do carro" />
        <Cartao className="flex flex-col items-start gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-marca-suave text-marca"><ClipboardCheck size={22} /></span>
          <p className="font-semibold">1. Vistoria de devolução</p>
          <p className="text-sm text-suave">Com o carro na sua frente, faça a mesma vistoria da entrega: fotos, km, combustível e checklist. O app compara com a entrega e monta o demonstrativo de pendências.</p>
          <BotaoLink href={`/painel/contratos/${id}/vistoria?tipo=devolucao`} tamanho="lg">Fazer a vistoria de devolução</BotaoLink>
        </Cartao>
        <ol className="mt-4 flex flex-col gap-2 text-sm text-suave">
          <li>2. Demonstrativo: km excedente, avarias, combustível e o que estiver em aberto.</li>
          <li>3. A caução quita as pendências; o que sobra volta para o motorista em até {d.parametros.prazos.diasUteisDevolucaoCaucao} dias úteis.</li>
        </ol>
      </div>
    );
  }

  const pioraram = itensQuePioraram(d.checklistEntrega, d.checklistDevolucao);
  const faltaCombustivel = d.devolucao.combustivel_oitavos < d.entrega.combustivel_oitavos;
  return (
    <div className="max-w-5xl">
      <CabecalhoPagina voltar={voltar} titulo="Encerrar contrato" subtitulo="2. Demonstrativo da devolução" />
      <Cartao className="mb-4 flex items-center gap-3">
        <CheckCircle2 size={20} className="shrink-0 text-ok" />
        <p className="text-sm">Vistoria de devolução feita: {d.devolucao.odometro.toLocaleString("pt-BR")} km, combustível {combustivelPorExtenso(d.devolucao.combustivel_oitavos)} (na entrega: {combustivelPorExtenso(d.entrega.combustivel_oitavos)}). {pioraram.length ? `${pioraram.length} item(ns) voltaram pior que na entrega.` : "Nenhum item voltou pior que na entrega."}</p>
      </Cartao>
      <FormularioEncerramento
        contratoId={id}
        parametros={d.parametros}
        hoje={hoje}
        kmEntrega={d.entrega.odometro}
        kmDevolucao={d.devolucao.odometro}
        saldoAberto={d.saldoAberto}
        caucaoLancada={d.caucaoLancada}
        caucaoPaga={d.caucaoPaga}
        sugestoes={pioraram.map((p) => ({ descricao: `${p.rotulo}: ${p.observacao ?? (p.estado === "ausente" ? "faltando" : "avaria")}${p.antes ? ` (na entrega: ${p.antes})` : ""}` }))}
        combustivelFaltando={faltaCombustivel ? `Combustível: saiu com ${combustivelPorExtenso(d.entrega.combustivel_oitavos)}, voltou com ${combustivelPorExtenso(d.devolucao.combustivel_oitavos)}` : null}
      />
    </div>
  );
}
