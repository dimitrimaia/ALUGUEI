import { ChevronRight, Clock, ShieldCheck } from "lucide-react";
import { DecisaoOferta } from "@/components/plantao/decisao";
import type { Route } from "next";
import Link from "next/link";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { COR_SINAL } from "@/components/plantao/semaforo-cartao";
import { Cartao, Vazio } from "@/components/ui";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { avaliarCorrida } from "@/dominio/ganhos/corrida";
import { taxas } from "@/dominio/ganhos/custos";
import { configPlantao, dadosDoPeriodo, intervaloExtrato, type PeriodoExtrato, PERIODOS_EXTRATO } from "@/lib/plantao";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Histórico de ofertas" };

const FILTROS = { todas: "Todas", aceitas: "Aceitas", recusadas: "Recusadas" } as const;
type Filtro = keyof typeof FILTROS;
const NOME_APP: Record<string, string> = { uber: "Uber", "99": "99", indrive: "inDrive" };

/** Todas as ofertas que o Copiloto avaliou, com o que você aceitou, recusou e o prejuízo que evitou. */
export default async function HistoricoOfertas({ searchParams }: { searchParams: Promise<{ periodo?: string; filtro?: string }> }) {
  const usuario = await exigirUsuario("/m/plantao/historico");
  const q = await searchParams;
  const periodo: PeriodoExtrato = q.periodo && q.periodo in PERIODOS_EXTRATO ? (q.periodo as PeriodoExtrato) : "semana";
  const filtro: Filtro = q.filtro && q.filtro in FILTROS ? (q.filtro as Filtro) : "todas";
  const { de, ate } = intervaloExtrato(periodo);
  const [config, dados] = await Promise.all([configPlantao(usuario.id), dadosDoPeriodo(usuario.id, de, ate)]);
  const t = taxas(config.perfil);
  const todas = dados.corridas.map((c) => ({
    ...c,
    a: avaliarCorrida({ valor: c.valor_centavos, kmCorrida: c.metros_corrida / 1000, minutosCorrida: c.minutos_corrida, kmBusca: c.metros_busca != null ? c.metros_busca / 1000 : null, minutosBusca: c.minutos_busca }, t, config.criterios),
  }));
  const lista = todas.filter((c) => filtro === "todas" || (filtro === "aceitas" ? c.decisao === "aceitei" : c.decisao === "recusei"));
  const recusadasRuins = todas.filter((c) => c.decisao === "recusei" && c.a.lucro < 0);
  const evitado = recusadasRuins.reduce((s, c) => s + -c.a.lucro, 0);
  const aceitas = todas.filter((c) => c.decisao === "aceitei");
  const url = (x: { periodo?: PeriodoExtrato; filtro?: Filtro }) => `/m/plantao/historico?periodo=${x.periodo ?? periodo}&filtro=${x.filtro ?? filtro}` as Route;

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo="Histórico de ofertas" voltar="/m/plantao" />
      <nav aria-label="Período" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {(Object.keys(PERIODOS_EXTRATO) as PeriodoExtrato[]).map((p) => (
          <Link key={p} href={url({ periodo: p })} className={`inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-semibold ${p === periodo ? "border-marca bg-marca text-white" : "border-borda bg-cartao text-suave"}`}>{PERIODOS_EXTRATO[p]}</Link>
        ))}
      </nav>

      <section className="fundo-marca rounded-[1.4rem] p-5 text-white shadow-flutuante">
        <p className="flex items-center gap-2 text-sm text-white/80"><ShieldCheck size={16} /> Prejuízo evitado</p>
        <p className="text-[2rem] leading-tight font-bold tabular-nums">{formatarBRL(evitado)}</p>
        <p className="text-sm text-white/75">{recusadasRuins.length} {recusadasRuins.length === 1 ? "oferta ruim recusada" : "ofertas ruins recusadas"} · {todas.length} avaliadas</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            ["aceitas", String(aceitas.length)],
            ["média aceitas", aceitas.length ? formatarBRL(Math.round(aceitas.reduce((s, c) => s + c.a.porKm, 0) / aceitas.length)) + "/km" : "—"],
            ["verdes", String(todas.filter((c) => c.a.sinal === "verde").length)],
          ].map(([r, v]) => (
            <div key={r} className="rounded-xl bg-white/12 py-2 ring-1 ring-white/15"><p className="text-[0.65rem] text-white/75">{r}</p><p className="text-sm font-bold tabular-nums">{v}</p></div>
          ))}
        </div>
      </section>

      <nav className="grid grid-cols-3 gap-1 rounded-2xl bg-cartao-2 p-1" aria-label="Filtro">
        {(Object.keys(FILTROS) as Filtro[]).map((f) => (
          <Link key={f} href={url({ filtro: f })} className={`grid h-10 place-items-center rounded-xl text-sm font-semibold ${f === filtro ? "bg-cartao shadow-cartao" : "text-suave"}`}>{FILTROS[f]}</Link>
        ))}
      </nav>

      {lista.length ? (
        <div className="flex flex-col gap-2">
          {lista.map((c) => (
            <Cartao key={c.id} className="flex items-center gap-3 !p-3">
              <span className={`h-12 w-1.5 shrink-0 rounded-full ${COR_SINAL[c.a.sinal].fundo}`} aria-label={COR_SINAL[c.a.sinal].rotulo} />
              <Link href={`/m/plantao/historico/${c.id}` as Route} className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2"><span className="font-bold tabular-nums">{formatarBRL(c.valor_centavos)}</span><span className="text-xs text-suave">{c.app ? NOME_APP[c.app] ?? c.app : "Digitada"} · {new Date(c.ocorrida_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}</span></p>
                <p className="text-xs text-suave tabular-nums">{formatarBRL(c.a.porKm)}/km · {formatarBRL(c.a.porHora)}/h · lucro <span className={c.a.lucro < 0 ? "font-semibold text-perigo" : "font-semibold text-ok"}>{formatarBRL(c.a.lucro)}</span></p>
              </Link>
              <DecisaoOferta id={c.id} decisao={c.decisao} />
            </Cartao>
          ))}
        </div>
      ) : (
        <Vazio titulo="Nenhuma oferta neste período">Ligue o Copiloto: cada oferta que ele avalia aparece aqui, com o que você aceitou e recusou.</Vazio>
      )}
      <Link href="/m/plantao/horarios" className="flex items-center gap-3 rounded-[1.1rem] border border-borda bg-cartao p-4 text-sm font-semibold shadow-cartao"><Clock size={18} className="text-marca" /> <span className="flex-1">Melhores horários para rodar</span> <ChevronRight size={17} className="text-suave" /></Link>
      <p className="text-center text-xs text-suave">Toque numa oferta para editar, ou no 👍/👎 para corrigir rápido. O lucro é recalculado com os custos atuais do seu carro.</p>
    </div>
  );
}
