import { CalendarClock, ClipboardCheck, Droplets, LogOut, MessageCircle, Pencil, ShieldAlert, Wallet } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { AcoesAluguel, PerguntasLocadora } from "@/components/plantao/aluguel";
import { Aviso, Cartao, Placa } from "@/components/ui";
import { type DataISO, diasEntre, formatarData, hoje, somarDias } from "@/dominio/datas/data";
import { type Centavos, formatarBRL } from "@/dominio/dinheiro/centavos";
import { custoParaSair, fimPrazoMinimo, kmDoCiclo, lembretesDoDia, proximaVistoria, proximoPagamento, trocaDeOleo } from "@/dominio/ganhos/aluguel";
import { aluguelExterno, leiturasDeKm } from "@/lib/aluguel-externo";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Meu carro alugado" };

const km = (n: number) => n.toLocaleString("pt-BR");
const emDias = (d: number) => (d === 0 ? "hoje" : d === 1 ? "amanhã" : d < 0 ? `há ${-d} dia${d < -1 ? "s" : ""}` : `em ${d} dias`);

function Bloco({ icone: Icone, titulo, valor, detalhe, tom = "marca" }: { icone: typeof Wallet; titulo: string; valor: string; detalhe?: string; tom?: "marca" | "alerta" | "perigo" }) {
  const cor = { marca: "bg-marca-suave text-marca", alerta: "bg-alerta/15 text-alerta", perigo: "bg-perigo/15 text-perigo" }[tom];
  return (
    <Cartao className="flex flex-col gap-2 p-3">
      <span className={`grid size-9 place-items-center rounded-xl ${cor}`}><Icone size={18} /></span>
      <span className="text-[0.7rem] font-semibold tracking-wide text-suave uppercase">{titulo}</span>
      <span className="text-base leading-tight font-bold">{valor}</span>
      {detalhe && <span className="text-xs leading-tight text-suave">{detalhe}</span>}
    </Cartao>
  );
}

/** Painel do carro alugado fora do Aluguei: o que o contrato cobra e quando. */
export default async function MeuCarroAlugado({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await exigirUsuario(`/m/plantao/aluguel/${id}`);
  const a = await aluguelExterno(usuario.id, id);
  if (!a) notFound();
  const dia = hoje();
  const leituras = await leiturasDeKm(usuario.id, a);
  const lembretes = lembretesDoDia(a, dia, leituras);
  const pagamento = proximoPagamento(a, dia);
  const vistoria = proximaVistoria(a);
  const fim = fimPrazoMinimo(a);
  const sair = custoParaSair(a, dia);
  const k = kmDoCiclo(a, leituras, dia);
  const oleo = trocaDeOleo(a, k.kmAtual);
  const whatsapp = a.telefoneLocadora.replace(/\D/g, "");
  const dataBR = (d: DataISO) => formatarData(d).slice(0, 5);
  const brl = (c: Centavos) => formatarBRL(c).replace(",00", "");

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo={a.modelo || "Carro alugado"} voltar="/m/plantao/aluguel" acao={<Link href={`/m/plantao/aluguel/${id}/editar` as Route} className="flex h-9 items-center gap-1.5 rounded-xl border border-borda bg-cartao px-3 text-sm font-semibold text-marca"><Pencil size={15} /> Editar</Link>} />

      <Cartao className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{a.modelo || "Carro alugado"}</p>
          <p className="truncate text-sm text-suave">{a.locadora}{a.numeroContrato && ` · ${a.numeroContrato}`}</p>
          <p className="text-xs text-suave">Desde {formatarData(a.inicio)} · {brl(a.valorSemanal)} por semana</p>
        </div>
        {a.placa && <Placa placa={a.placa} tamanho="sm" />}
      </Cartao>

      {a.devolucao ? (
        <Aviso tom="ok" titulo={`Carro devolvido em ${formatarData(a.devolucao)}`}>
          {a.caucao > 0 ? `A ${a.locadora} tem até ${formatarData(somarDias(a.devolucao, a.devolucaoCaucaoDias))} para devolver a caução de ${brl(a.caucao)} e a nota promissória.` : "Os lembretes pararam."}
        </Aviso>
      ) : (
        lembretes.map((l) => <Aviso key={l.chave} tom={l.nivel === "info" ? "info" : l.nivel} titulo={l.titulo}>{l.texto}</Aviso>)
      )}

      {!a.devolucao && (
        <>
          <Link href={`/m/plantao/aluguel/${id}/editar` as Route} className="-mt-1 flex items-center gap-2 self-start text-xs font-semibold text-marca"><CalendarClock size={14} /> Datas erradas? Corrigir início, 1º pagamento e vistoria</Link>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Bloco icone={Wallet} titulo="Próximo aluguel" valor={`${dataBR(pagamento)} · ${brl(a.valorSemanal)}`} detalhe={`Vence ${emDias(diasEntre(dia, pagamento))}. De 7 em 7 dias.`} tom={diasEntre(dia, pagamento) <= 1 ? "alerta" : "marca"} />
            {vistoria && <Bloco icone={ClipboardCheck} titulo="Próxima vistoria" valor={dataBR(vistoria)} detalhe={`${emDias(diasEntre(dia, vistoria)).replace(/^./, (c) => c.toUpperCase())} · a cada ${a.vistoriaCadaDias} dias`} tom={diasEntre(dia, vistoria) < 0 ? "perigo" : diasEntre(dia, vistoria) <= 2 ? "alerta" : "marca"} />}
            {fim && <Bloco icone={CalendarClock} titulo="Prazo mínimo" valor={sair.dentroDoPrazo ? `Até ${dataBR(fim)}` : "Cumprido"} detalhe={sair.dentroDoPrazo ? `Dia ${diasEntre(a.inicio, dia) + 1} de ${a.prazoMinimoDias}` : `Para sair, avise com ${a.avisoSaidaDias} dias.`} />}
            <Bloco icone={LogOut} titulo="Sair hoje custa" valor={sair.multa ? brl(sair.multa) : "Sem multa"} detalhe={sair.dentroDoPrazo ? `${a.multaRescisaoBps / 100}% de ${sair.semanasRestantes} semana${sair.semanasRestantes > 1 ? "s" : ""}${sair.multaExtraPossivel ? `; pode somar ${brl(sair.multaExtraPossivel)}` : ""}` : `Aviso de ${a.avisoSaidaDias} dias`} tom={sair.multa ? "alerta" : "marca"} />
          </div>

          {k.limite > 0 && (
            <Cartao className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <h2 className="font-bold">Km do mês</h2>
                <span className="text-xs text-suave">{dataBR(k.de)} a {dataBR(k.ate)}</span>
              </div>
              <div className="flex items-baseline gap-1.5"><span className="text-2xl font-bold tabular-nums">{km(k.rodados)}</span><span className="text-sm text-suave">de {km(k.limite)} km</span></div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-cartao-2">
                <div className={`h-full rounded-full ${k.rodados > k.limite ? "bg-perigo" : k.projecao > k.limite ? "bg-alerta" : "bg-ok"}`} style={{ width: `${Math.min(100, (k.rodados * 100) / k.limite)}%` }} />
              </div>
              <p className="text-xs text-suave">
                {k.kmAtual === null
                  ? "Anote o km do painel abaixo (ou no início e no fim do plantão) para acompanhar."
                  : k.custoExcedenteProjetado
                    ? `No ritmo de agora: ${km(k.projecao)} km no mês, ≈ ${brl(k.custoExcedenteProjetado)} de km excedente (${brl(a.valorKmExcedente)}/km). Até ${km(k.porDiaRestante ?? 0)} km por dia fica dentro.`
                    : `No ritmo de agora: ${km(k.projecao)} km no mês, dentro do limite. Pode rodar até ${km(k.porDiaRestante ?? 0)} km por dia.`}
              </p>
            </Cartao>
          )}

          {oleo && (
            <Bloco icone={Droplets} titulo="Troca de óleo" valor={oleo.faltam > 0 ? `Faltam ${km(oleo.faltam)} km` : `Passou ${km(-oleo.faltam)} km`} detalhe={`Próxima com ${km(oleo.proximaKm)} km no painel. Combine com a locadora antes.`} tom={oleo.faltam <= 0 ? "perigo" : oleo.faltam <= 500 ? "alerta" : "marca"} />
          )}

          <AcoesAluguel id={id} devolvido={a.devolucao} temVistoria={a.vistoriaCadaDias > 0} temOleo={Boolean(a.trocaOleoCadaKm)} />
        </>
      )}

      {a.devolucao && <AcoesAluguel id={id} devolvido={a.devolucao} temVistoria={false} temOleo={false} />}

      <Cartao className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 font-bold"><ShieldAlert size={18} className="text-marca" /> Proteção e garantias</h2>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
          {a.franquiaRoubo > 0 && (<><dt className="text-suave">Franquia roubo/perda</dt><dd className="text-right font-semibold">{brl(a.franquiaRoubo)}</dd></>)}
          {a.franquiaColisao > 0 && (<><dt className="text-suave">Franquia batida</dt><dd className="text-right font-semibold">{brl(a.franquiaColisao)}</dd></>)}
          {a.franquiaTerceiros > 0 && (<><dt className="text-suave">Carro de terceiro</dt><dd className="text-right font-semibold">{brl(a.franquiaTerceiros)}</dd></>)}
          {a.caucao > 0 && (<><dt className="text-suave">Caução</dt><dd className="text-right font-semibold">{brl(a.caucao)}</dd></>)}
          <dt className="text-suave">Nota promissória</dt><dd className={`text-right font-semibold ${a.valorPromissoria === null ? "text-alerta" : ""}`}>{a.valorPromissoria === null ? "Em branco" : brl(a.valorPromissoria)}</dd>
          {a.acrescimoMultaBps > 0 && (<><dt className="text-suave">Multa de trânsito</dt><dd className="text-right font-semibold">+{a.acrescimoMultaBps / 100}%</dd></>)}
        </dl>
        <p className="text-xs text-suave">Para não perder a proteção: respeite a velocidade, não rode na reserva, avise a locadora na hora de qualquer batida (com B.O.) e não faça acordo sem ela.</p>
        {a.observacoes && <p className="rounded-xl bg-cartao-2 p-3 text-xs whitespace-pre-line">{a.observacoes}</p>}
      </Cartao>

      <PerguntasLocadora id={id} inicial={a.perguntas} />

      {whatsapp && (
        <a href={`https://wa.me/${whatsapp.length <= 11 ? `55${whatsapp}` : whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-borda-forte bg-cartao py-3 text-sm font-semibold">
          <MessageCircle size={17} /> Falar com a {a.locadora}
        </a>
      )}
    </div>
  );
}
