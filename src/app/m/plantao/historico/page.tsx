import { ChevronRight, Clock, ShieldCheck } from "lucide-react";
import { DecisaoOferta } from "@/components/plantao/decisao";
import type { Route } from "next";
import Link from "next/link";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { COR_SINAL } from "@/components/plantao/semaforo-cartao";
import { Cartao, Vazio } from "@/components/ui";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { avaliarCorrida } from "@/dominio/ganhos/corrida";
import { criteriosDoApp, taxas } from "@/dominio/ganhos/custos";
import { configPlantao, dadosDoPeriodo, intervaloExtrato, type PeriodoExtrato, PERIODOS_EXTRATO } from "@/lib/plantao";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Minhas corridas" };

const FILTROS = { todas: "Todas", aceitas: "Fiz", recusadas: "Não fiz", revisar: "Revisar" } as const;
type Filtro = keyof typeof FILTROS;
const NOME_APP: Record<string, string> = { uber: "Uber", "99": "99", indrive: "inDrive", "37city": "37 City" };

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
    a: avaliarCorrida({ valor: (c as { valor_final_centavos?: number | null }).valor_final_centavos ?? c.valor_centavos, kmCorrida: c.metros_corrida / 1000, minutosCorrida: c.minutos_corrida, kmBusca: c.metros_busca != null ? c.metros_busca / 1000 : null, minutosBusca: c.minutos_busca }, t, criteriosDoApp(config.criterios, c.app)),
  }));
  const semResposta = (c: { decisao: string | null }) => c.decisao !== "aceitei" && c.decisao !== "recusei";
  const lista = todas.filter((c) => filtro === "todas" || (filtro === "aceitas" ? c.decisao === "aceitei" : filtro === "recusadas" ? c.decisao === "recusei" : semResposta(c)));
  const pendentes = todas.filter(semResposta).length;
  const recusadasRuins = todas.filter((c) => c.decisao === "recusei" && c.a.lucro < 0);
  const evitado = recusadasRuins.reduce((s, c) => s + -c.a.lucro, 0);
  const aceitas = todas.filter((c) => c.decisao === "aceitei");
  const url = (x: { periodo?: PeriodoExtrato; filtro?: Filtro }) => `/m/plantao/historico?periodo=${x.periodo ?? periodo}&filtro=${x.filtro ?? filtro}` as Route;

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo="Minhas corridas" voltar="/m/plantao" />
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
            ["feitas", String(aceitas.length)],
            ["média feitas", aceitas.length ? formatarBRL(Math.round(aceitas.reduce((s, c) => s + c.a.porKm, 0) / aceitas.length)) + "/km" : "—"],
            ["verdes", String(todas.filter((c) => c.a.sinal === "verde").length)],
          ].map(([r, v]) => (
            <div key={r} className="rounded-xl bg-white/12 py-2 ring-1 ring-white/15"><p className="text-[0.65rem] text-white/75">{r}</p><p className="text-sm font-bold tabular-nums">{v}</p></div>
          ))}
        </div>
      </section>

      {pendentes > 0 && filtro !== "revisar" && (
        <Link href={url({ filtro: "revisar" })} className="flex items-center gap-3 rounded-[1.1rem] border border-alerta/40 bg-alerta-suave p-3 text-sm">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-alerta font-bold text-white">{pendentes}</span>
          <span className="flex-1"><strong>{pendentes === 1 ? "1 corrida sem resposta" : `${pendentes} corridas sem resposta`}.</strong> Marque se fez ou não para o seu ganho ficar certo.</span>
          <ChevronRight size={17} className="text-suave" />
        </Link>
      )}

      <nav className="grid grid-cols-4 gap-1 rounded-2xl bg-cartao-2 p-1" aria-label="Filtro">
        {(Object.keys(FILTROS) as Filtro[]).map((f) => (
          <Link key={f} href={url({ filtro: f })} className={`grid h-10 place-items-center rounded-xl text-sm font-semibold ${f === filtro ? "bg-cartao shadow-cartao" : "text-suave"}`}>
            {FILTROS[f]}{f === "revisar" && pendentes > 0 ? ` (${pendentes})` : ""}
          </Link>
        ))}
      </nav>
      <p className="-mt-2 text-xs text-suave">Só as corridas marcadas como <strong>Fiz</strong> entram no seu ganho. O Copiloto marca sozinho quando percebe; se errou, corrija aqui.</p>

      {lista.length ? (
        <div className="flex flex-col gap-2">
          {lista.map((c) => (
            <Cartao key={c.id} className={`flex flex-wrap items-center gap-x-3 gap-y-2 !p-3 ${c.decisao === "recusei" ? "opacity-70" : ""}`}>
              <span className={`h-12 w-1.5 shrink-0 rounded-full ${COR_SINAL[c.a.sinal].fundo}`} aria-label={COR_SINAL[c.a.sinal].rotulo} />
              <Link href={`/m/plantao/historico/${c.id}` as Route} className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2"><span className="font-bold tabular-nums">{formatarBRL((c as { valor_final_centavos?: number | null }).valor_final_centavos ?? c.valor_centavos)}</span>{(c as { valor_final_centavos?: number | null }).valor_final_centavos != null && <span className="text-xs text-suave line-through">{formatarBRL(c.valor_centavos)}</span>}{(c as { decisao_origem?: string | null }).decisao_origem === "automatica" && <span className="rounded-full bg-marca-suave px-1.5 text-[0.6rem] font-bold text-marca">auto</span>}<span className="text-xs text-suave">{c.app ? NOME_APP[c.app] ?? c.app : "Digitada"} · {new Date(c.ocorrida_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}</span></p>
                <p className="text-xs text-suave tabular-nums">{formatarBRL(c.a.porKm)}/km · {formatarBRL(c.a.porHora)}/h · lucro <span className={c.a.lucro < 0 ? "font-semibold text-perigo" : "font-semibold text-ok"}>{formatarBRL(c.a.lucro)}</span></p>
                {(() => {
                  // Acompanhada pelo GPS até o fim: o que a corrida foi de verdade.
                  const real = c as { metros_reais?: number | null; minutos_reais?: number | null; valor_final_centavos?: number | null };
                  if (real.metros_reais == null) return null;
                  // Sem GPS na corrida: só o tempo.
                  if (real.metros_reais === 0) return <p className="text-xs font-semibold text-marca tabular-nums">✓ Feita: {real.minutos_reais} min</p>;
                  const km = real.metros_reais / 1000;
                  const valor = real.valor_final_centavos ?? c.valor_centavos;
                  return <p className="text-xs font-semibold text-marca tabular-nums">✓ Feita: {km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km · {real.minutos_reais} min{km >= 0.5 ? ` · ${formatarBRL(Math.round(valor / km))}/km real` : ""}</p>;
                })()}
              </Link>
              <div className="flex w-full items-center justify-between gap-2 border-t border-borda pt-2">
                <span className={`text-xs font-semibold ${c.decisao === "aceitei" ? "text-ok" : c.decisao === "recusei" ? "text-suave" : "text-alerta"}`}>{c.decisao === "aceitei" ? "Conta no ganho" : c.decisao === "recusei" ? "Não conta no ganho" : "Você fez esta corrida?"}</span>
                <DecisaoOferta id={c.id} decisao={c.decisao} />
              </div>
            </Cartao>
          ))}
        </div>
      ) : (
        <Vazio titulo="Nenhuma oferta neste período">Ligue o Copiloto: cada oferta que ele avalia aparece aqui, com o que você aceitou e recusou.</Vazio>
      )}
      <Link href="/m/plantao/horarios" className="flex items-center gap-3 rounded-[1.1rem] border border-borda bg-cartao p-4 text-sm font-semibold shadow-cartao"><Clock size={18} className="text-marca" /> <span className="flex-1">Melhores horários para rodar</span> <ChevronRight size={17} className="text-suave" /></Link>
      <p className="text-center text-xs text-suave">Toque numa corrida para corrigir valor e distância. O lucro é recalculado com os custos atuais do seu carro.</p>
    </div>
  );
}
