import { ChevronRight, Download, Info, Plus, Receipt, TrendingUp } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { BotaoExcluir } from "@/components/plantao/excluir";
import { BotaoLink, Cartao, DadoRotulado, Vazio } from "@/components/ui";
import { data, diaDaSemana, formatarData, hoje, somarDias } from "@/dominio/datas/data";
import { nomeDiaDaSemana } from "@/dominio/contrato/variaveis";
import { arredondar, formatarBRL } from "@/dominio/dinheiro/centavos";
import { taxas } from "@/dominio/ganhos/custos";
import { NOME_DESPESA, NOME_PLATAFORMA, resumir } from "@/dominio/ganhos/plantao";
import { configPlantao, dadosDoPeriodo, intervaloExtrato, paraDominio, type PeriodoExtrato, PERIODOS_EXTRATO } from "@/lib/plantao";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Extrato do plantão" };

const FILTROS = { tudo: "Tudo", ganhos: "Ganhos", gastos: "Gastos" } as const;
type Filtro = keyof typeof FILTROS;

/** Extrato do plantão: cada número do Plantão aberto, com de onde ele veio. */
export default async function ExtratoPlantao({ searchParams }: { searchParams: Promise<{ periodo?: string; filtro?: string }> }) {
  const usuario = await exigirUsuario("/m/plantao/extrato");
  const q = await searchParams;
  const periodo: PeriodoExtrato = q.periodo && q.periodo in PERIODOS_EXTRATO ? (q.periodo as PeriodoExtrato) : "hoje";
  const filtro: Filtro = q.filtro && q.filtro in FILTROS ? (q.filtro as Filtro) : "tudo";
  const { de, ate, dias } = intervaloExtrato(periodo);
  const [config, dados] = await Promise.all([configPlantao(usuario.id), dadosDoPeriodo(usuario.id, de, ate)]);
  const t = taxas(config.perfil);
  const d = paraDominio(dados);
  const r = resumir(d.ganhos, d.despesas, d.jornadas, t, dias, new Date());
  const gastos = r.despesas + r.fixosDoPeriodo + r.combustivelEstimado;
  const url = (x: { periodo?: PeriodoExtrato; filtro?: Filtro }) => `/m/plantao/extrato?periodo=${x.periodo ?? periodo}&filtro=${x.filtro ?? filtro}` as Route;

  const itens = [
    ...(filtro !== "gastos" ? dados.ganhos.map((g) => ({ tipo: "ganho" as const, id: g.id, dia: g.dia, quando: g.criado_em, titulo: NOME_PLATAFORMA[g.plataforma] ?? g.plataforma, detalhe: g.corridas === 1 ? "1 corrida" : `${g.corridas} corridas`, valor: g.valor_centavos })) : []),
    ...(filtro !== "ganhos" ? dados.despesas.map((x) => ({ tipo: "despesa" as const, id: x.id, dia: x.dia, quando: x.criado_em, titulo: NOME_DESPESA[x.categoria] ?? x.categoria, detalhe: [x.descricao, x.quantidade_mil ? `${(x.quantidade_mil / 1000).toLocaleString("pt-BR")} L` : null].filter(Boolean).join(" · "), valor: -x.valor_centavos })) : []),
  ].sort((a, b) => b.quando.localeCompare(a.quando));
  const porDia = [...new Set(itens.map((i) => i.dia))].sort().reverse();
  const nomeDia = (dia: string) => (dia === hoje() ? "Hoje" : dia === somarDias(hoje(), -1) ? "Ontem" : `${nomeDiaDaSemana(diaDaSemana(data(dia)))}, ${formatarData(data(dia)).slice(0, 5)}`);
  const csv = periodo === "hoje" ? "hoje" : periodo === "semana" ? "semana" : "mes";

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo="Extrato" voltar="/m/plantao" />

      <nav aria-label="Período" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {(Object.keys(PERIODOS_EXTRATO) as PeriodoExtrato[]).map((p) => (
          <Link key={p} href={url({ periodo: p })} aria-current={p === periodo ? "page" : undefined} className={`inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-semibold ${p === periodo ? "border-marca bg-marca text-white" : "border-borda bg-cartao text-suave"}`}>
            {PERIODOS_EXTRATO[p]}
          </Link>
        ))}
      </nav>

      <section className="grid grid-cols-3 gap-2">
        {[
          { f: "ganhos" as const, rotulo: "Ganhos", valor: `+${formatarBRL(r.bruto)}`, cor: "text-ok" },
          { f: "gastos" as const, rotulo: "Gastos", valor: `−${formatarBRL(gastos)}`, cor: "" },
          { f: "tudo" as const, rotulo: "Lucro", valor: formatarBRL(r.lucro), cor: r.lucro < 0 ? "text-perigo" : "" },
        ].map((c) => (
          <Link key={c.f} href={url({ filtro: c.f })} aria-current={filtro === c.f ? "true" : undefined} className={`rounded-[1.1rem] border bg-cartao p-3 shadow-cartao transition-colors ${filtro === c.f ? "border-marca ring-3 ring-marca/15" : "border-borda"}`}>
            <p className="text-[0.7rem] font-semibold text-suave">{c.rotulo}</p>
            <p className={`text-[0.95rem] font-bold tabular-nums [overflow-wrap:anywhere] ${c.cor}`}>{c.valor}</p>
          </Link>
        ))}
      </section>

      {filtro !== "gastos" && r.porPlataforma.length > 0 && (
        <Cartao>
          <h2 className="flex items-center gap-2 text-sm font-bold"><TrendingUp size={16} className="text-ok" /> Ganhos por app</h2>
          <dl className="mt-1 divide-y divide-borda">
            {r.porPlataforma.map((p) => (
              <DadoRotulado key={p.plataforma} rotulo={`${NOME_PLATAFORMA[p.plataforma]} · ${p.corridas} ${p.corridas === 1 ? "corrida" : "corridas"}`}>
                <span className="text-ok">+{formatarBRL(p.valor)}</span>
              </DadoRotulado>
            ))}
            {r.corridas > 0 && <DadoRotulado rotulo="Média por corrida">{formatarBRL(arredondar(r.bruto / r.corridas))}</DadoRotulado>}
          </dl>
        </Cartao>
      )}

      {filtro !== "ganhos" && gastos > 0 && (
        <Cartao>
          <h2 className="flex items-center gap-2 text-sm font-bold"><Receipt size={16} /> De onde vêm os gastos</h2>
          <dl className="mt-1 divide-y divide-borda">
            {r.porCategoria.map((c) => <DadoRotulado key={c.categoria} rotulo={`${NOME_DESPESA[c.categoria]} (lançado)`}>−{formatarBRL(c.valor)}</DadoRotulado>)}
            {r.fixosDoPeriodo > 0 &&
              config.perfil.fixosMensais
                .filter((f) => f.valor > 0)
                .map((f) => (
                  <DadoRotulado key={f.nome} rotulo={`${f.nome}: ${formatarBRL(f.valor)}/mês, ${dias} ${dias === 1 ? "dia" : "dias"}`}>−{formatarBRL(arredondar((f.valor * dias) / 30))}</DadoRotulado>
                ))}
            {r.combustivelEstimado > 0 && <DadoRotulado rotulo={`Combustível estimado: ${r.km.toLocaleString("pt-BR")} km × ${formatarBRL(Math.round(t.combustivelPorKm))}`}>−{formatarBRL(r.combustivelEstimado)}</DadoRotulado>}
          </dl>
          <p className="mt-2 flex gap-2 rounded-xl bg-cartao-2 p-3 text-xs text-suave">
            <Info size={15} className="mt-px shrink-0 text-marca" />
            <span>
              Os gastos fixos do mês (como o aluguel) entram todo dia, rodando ou não: assim o lucro mostra o que sobra de verdade.
              {r.combustivelEstimado > 0 && " O combustível é estimado pelo km do plantão até você lançar um abastecimento."} <Link href="/m/plantao/custos" className="font-semibold text-marca">Ajustar custos</Link>
            </span>
          </p>
        </Cartao>
      )}

      <div className="grid grid-cols-2 gap-2">
        <BotaoLink href="/m/plantao/ganho" variante="secundario" icone={Plus}>Ganho</BotaoLink>
        <BotaoLink href="/m/plantao/despesa" variante="secundario" icone={Plus}>Despesa</BotaoLink>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight">Lançamentos</h2>
          {!!itens.length && <a href={`/m/plantao/relatorios/csv?periodo=${csv}`} className="inline-flex items-center gap-1 text-sm font-semibold text-marca"><Download size={15} /> Planilha</a>}
        </div>
        {porDia.length ? (
          porDia.map((dia) => {
            const doDia = itens.filter((i) => i.dia === dia);
            const total = doDia.reduce((s, i) => s + i.valor, 0);
            return (
              <div key={dia}>
                <div className="mb-1.5 flex items-baseline justify-between px-1 text-xs font-semibold text-suave">
                  <span className="capitalize">{nomeDia(dia)}</span>
                  <span className="tabular-nums">{total >= 0 ? "+" : "−"}{formatarBRL(Math.abs(total))}</span>
                </div>
                <div className="divide-y divide-borda overflow-hidden rounded-[1.1rem] border border-borda bg-cartao shadow-cartao">
                  {doDia.map((l) => (
                    <div key={l.id} className="flex items-center gap-3 py-2.5 pr-2 pl-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{l.titulo}</p>
                        <p className="truncate text-xs text-suave">{new Date(l.quando).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}{l.detalhe ? ` · ${l.detalhe}` : ""}</p>
                      </div>
                      <span className={`text-sm font-bold tabular-nums ${l.valor >= 0 ? "text-ok" : ""}`}>{l.valor >= 0 ? "+" : "−"}{formatarBRL(Math.abs(l.valor))}</span>
                      <BotaoExcluir tipo={l.tipo} id={l.id} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <Vazio titulo={filtro === "gastos" ? "Nenhuma despesa lançada" : filtro === "ganhos" ? "Nenhum ganho lançado" : "Nada lançado neste período"}>
            {filtro === "gastos" && gastos > 0 ? "Os gastos acima são os fixos do mês e a estimativa de combustível." : "Lance os ganhos de cada app e as despesas para ver tudo aqui."}
          </Vazio>
        )}
      </section>

      <Link href="/m/plantao/relatorios" className="flex items-center justify-between rounded-[1.1rem] border border-borda bg-cartao p-4 text-sm font-semibold shadow-cartao">
        Gráficos e semáforo nos relatórios <ChevronRight size={17} className="text-suave" />
      </Link>
    </div>
  );
}
