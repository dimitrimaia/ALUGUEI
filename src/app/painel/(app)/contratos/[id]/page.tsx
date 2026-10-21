import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardCheck, FileText } from "lucide-react";
import { BotaoLink, CabecalhoPagina, Cartao, DadoRotulado, Selo, Suave } from "@/components/ui";
import { formatarPlaca } from "@/dominio/cadastro/documentos";
import type { ParametrosContrato } from "@/dominio/contrato/parametros";
import { nomeDiaDaSemana } from "@/dominio/contrato/variaveis";
import { data, formatarData, hoje } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { BotaoAcao } from "@/components/painel/botao-acao";
import { ResumoVistoria } from "@/components/resumo-vistoria";
import { gerarPix } from "../../financeiro/acoes";
import { decidirAcao } from "./checkins/acoes";
import type { ChecklistVistoria } from "@/dominio/vistoria/roteiro";
import { linkTemporario } from "@/lib/evidencias";
import { fotosDaVistoria } from "@/lib/vistorias";
import { exigirEquipe } from "@/lib/sessao";
import { STATUS_CONTRATO, TIPO_OBRIGACAO } from "@/lib/rotulos";
import { urlDoSite } from "@/lib/site";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { CompartilharConvite } from "../../motoristas/[id]/compartilhar";

const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

export default async function FichaContrato({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const { data: c } = await supabase.from("contratos").select("*").eq("id", id).eq("organizacao_id", organizacao.id).maybeSingle();
  if (!c) notFound();

  const [{ data: l }, { data: v }, { data: provas }, { data: agenda }, { data: vistoria }] = await Promise.all([
    supabase.from("locatarios").select("nome, telefone").eq("id", c.locatario_id).single(),
    supabase.from("veiculos").select("placa, modelo").eq("id", c.veiculo_id).single(),
    supabase.from("evidencias").select("id, tipo, finalidade, caminho_storage, recebido_em, ip, sha256").eq("contrato_id", id).order("recebido_em"),
    supabase.from("obrigacoes").select("id, tipo, vencimento, valor_centavos, status").eq("contrato_id", id).order("vencimento").limit(40),
    supabase.from("vistorias").select("*").eq("contrato_id", id).eq("tipo", "entrega").maybeSingle(),
  ]);
  const [{ data: cobrancas }, { data: lancamentos }, { data: checkins }, { data: acoes }] = await Promise.all([
    supabase.from("cobrancas").select("id, obrigacao_id, status, valor_pago_centavos").eq("contrato_id", id),
    supabase.from("lancamentos").select("id, descricao, valor_centavos, competencia, tipo").eq("contrato_id", id).order("competencia", { ascending: false }).order("criado_em", { ascending: false }),
    supabase.from("checkins").select("id, obrigacao_id, odometro_informado, revisado_por").eq("contrato_id", id),
    supabase.from("acoes_pendentes").select("id, tipo, motivo, criado_em").eq("contrato_id", id).eq("status", "pendente").order("criado_em"),
  ]);
  const saldoAberto = (lancamentos ?? []).reduce((s, l) => s + l.valor_centavos, 0);
  const dia = hoje();
  const checklist = vistoria?.checklist as unknown as ChecklistVistoria | undefined;
  const fotosVistoria = checklist ? await fotosDaVistoria(checklist) : {};
  const p = c.parametros as unknown as ParametrosContrato;
  const pdf = provas?.find((e) => e.id === c.pdf_evidencia_id);
  const linkPdf = pdf ? await linkTemporario(pdf.caminho_storage) : null;
  const aceites = (provas ?? []).filter((e) => e.tipo === "aceite");
  const status = STATUS_CONTRATO[c.status];

  return (
    <>
      <CabecalhoPagina
        voltar={{ href: "/painel/contratos", rotulo: "Contratos" }}
        tituloCurto={l?.nome ?? "Contrato"}
        titulo={<span className="flex flex-wrap items-center gap-3">{l?.nome} <Selo tom={status.tom}>{status.rotulo}</Selo></span>}
        subtitulo={v ? `${formatarPlaca(v.placa)} · ${v.modelo}` : undefined}
        acao={c.status === "assinado" ? <BotaoLink href={`/painel/contratos/${c.id}/vistoria` as Route} icone={ClipboardCheck}>Fazer vistoria de entrega</BotaoLink> : undefined}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {c.status === "aguardando_assinatura" && l && (
          <Cartao className="flex flex-col gap-3 lg:col-span-2">
            <p className="font-semibold">Enviar para o motorista assinar</p>
            <CompartilharConvite link={`${await urlDoSite()}/m`} telefone={l.telefone} nome={l.nome} locador={organizacao.nome} mensagem="Seu contrato está pronto. Entre no app para ler e assinar:" />
          </Cartao>
        )}
        <Cartao>
          <p className="mb-1 font-semibold">Condições</p>
          <dl className="divide-y divide-borda">
            <DadoRotulado rotulo="Vigência">{formatarData(p.inicio)} a {formatarData(p.fim)}</DadoRotulado>
            <DadoRotulado rotulo="Aluguel">{formatarBRL(p.aluguelSemanal)} toda {nomeDiaDaSemana(p.diaVencimento)}</DadoRotulado>
            <DadoRotulado rotulo="Caução">{formatarBRL(p.caucao.total)} em {p.caucao.parcelas.length}x</DadoRotulado>
            <DadoRotulado rotulo="Franquia">{p.km.franquiaMensal.toLocaleString("pt-BR")} km/mês</DadoRotulado>
            <DadoRotulado rotulo="Km excedente">{formatarBRL(p.km.valorExcedente)}/km</DadoRotulado>
          </dl>
        </Cartao>
        <Cartao className="flex flex-col gap-2">
          <p className="font-semibold">Documento e assinaturas</p>
          {linkPdf && (
            <a href={linkPdf} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-borda px-3 py-2.5 font-medium hover:bg-cartao-2">
              <FileText size={18} className="text-marca" aria-hidden /> Abrir contrato (PDF)
            </a>
          )}
          {c.pdf_sha256 && <Suave>Código de verificação: <span className="font-mono text-xs break-all">{c.pdf_sha256}</span></Suave>}
          {aceites.map((a) => (
            <Suave key={a.id}>
              {a.finalidade.endsWith("locador") ? "Locador" : "Motorista"} assinou em {quando(a.recebido_em)}{a.ip ? ` · IP ${a.ip}` : ""}
            </Suave>
          ))}
        </Cartao>
        {!!lancamentos?.length && (
          <Cartao className="lg:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold">Extrato</p>
              <span className={`text-sm font-bold ${saldoAberto > 0 ? "text-perigo" : "text-ok"}`}>{saldoAberto > 0 ? `${formatarBRL(saldoAberto)} em aberto` : "Em dia"}</span>
            </div>
            <ul className="divide-y divide-borda text-sm">
              {lancamentos.map((l) => (
                <li key={l.id} className="flex justify-between gap-2 py-2.5">
                  <span className="w-24 tabular-nums">{formatarData(data(l.competencia))}</span>
                  <span className="flex-1">{l.descricao}</span>
                  <span className={`font-semibold tabular-nums ${l.valor_centavos < 0 ? "text-ok" : ""}`}>{l.valor_centavos < 0 ? "+ " : "− "}{formatarBRL(Math.abs(l.valor_centavos))}</span>
                </li>
              ))}
            </ul>
          </Cartao>
        )}
        {vistoria && checklist && (
          <section className="lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Vistoria de entrega</h2>
              {vistoria.aceite_locatario_evidencia_id ? <Selo tom="ok">Confirmada pelo motorista</Selo> : <Selo tom="alerta">Aguardando o motorista confirmar</Selo>}
            </div>
            {!vistoria.aceite_locatario_evidencia_id && l && (
              <Cartao className="mb-4">
                <p className="mb-2 font-semibold">Peça ao motorista para confirmar no celular dele</p>
                <CompartilharConvite link={`${await urlDoSite()}/m`} telefone={l.telefone} nome={l.nome} locador={organizacao.nome} mensagem="A vistoria do carro está pronta. Confira e confirme no app:" />
              </Cartao>
            )}
            <ResumoVistoria checklist={checklist} odometro={vistoria.odometro} combustivel={vistoria.combustivel_oitavos} fotos={fotosVistoria} />
          </section>
        )}
        {!!acoes?.length && (
          <Cartao className="flex flex-col gap-3 lg:col-span-2">
            <p className="font-semibold">Decisões pendentes</p>
            {acoes.map((a) => (
              <div key={a.id} className="flex flex-col gap-2 rounded-xl bg-alerta-suave p-3 sm:flex-row sm:items-center">
                <p className="flex-1 text-sm">{a.motivo}</p>
                <div className="flex gap-2">
                  <BotaoAcao acao={decidirAcao.bind(null, a.id, "registrar")} rotulo="Registrar infração" variante="secundario" confirmar="Registrar como infração no histórico do contrato?" />
                  <BotaoAcao acao={decidirAcao.bind(null, a.id, "dispensar")} rotulo="Dispensar" />
                </div>
              </div>
            ))}
            <p className="text-xs text-suave">O app só registra. Notificação formal, multa ou rescisão continuam sendo decisão sua.</p>
          </Cartao>
        )}
        {!!agenda?.length && (
          <Cartao className="lg:col-span-2">
            <p className="mb-2 font-semibold">Agenda do contrato</p>
            <ul className="divide-y divide-borda text-sm">
              {agenda.map((o) => {
                const cob = cobrancas?.find((x) => x.obrigacao_id === o.id && x.status !== "cancelada");
                const cobravel = o.tipo !== "checkin" && o.status !== "cumprida";
                return (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span className="w-24 tabular-nums">{formatarData(data(o.vencimento))}</span>
                    <span className="flex-1">{TIPO_OBRIGACAO[o.tipo]}</span>
                    <span className="w-24 text-right font-semibold tabular-nums">{o.valor_centavos !== null ? formatarBRL(o.valor_centavos) : ""}</span>
                    <span className="flex w-36 justify-end">
                      {o.tipo === "checkin" ? (
                        (() => {
                          const ck = checkins?.find((x) => x.obrigacao_id === o.id);
                          if (ck) return <Link href={`/painel/contratos/${id}/checkins/${ck.id}` as Route} className="text-sm font-semibold text-marca">{ck.revisado_por ? "Ver fotos" : "Revisar fotos"}</Link>;
                          return o.vencimento < dia ? <Selo tom="perigo">Não enviado</Selo> : null;
                        })()
                      ) : o.status === "cumprida" ? (
                        <Selo tom="ok">Pago</Selo>
                      ) : cob ? (
                        <Selo tom={o.vencimento < dia ? "perigo" : "neutro"}>{o.vencimento < dia ? "Pix vencido" : "Pix enviado"}</Selo>
                      ) : cobravel && c.status === "ativo" ? (
                        <BotaoAcao acao={gerarPix.bind(null, o.id)} rotulo="Gerar Pix" />
                      ) : o.vencimento < dia ? (
                        <Selo tom="perigo">Em atraso</Selo>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Cartao>
        )}
      </div>
    </>
  );
}
