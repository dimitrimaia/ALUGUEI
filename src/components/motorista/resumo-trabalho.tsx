import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { data, type DataISO, diasEntre, formatarData, hoje } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { taxas } from "@/dominio/ganhos/custos";
import { NOME_PLATAFORMA, resumir } from "@/dominio/ganhos/plantao";
import { configPlantao, dadosDoPeriodo, intervaloExtrato, paraDominio } from "@/lib/plantao";

const FILTROS = { hoje: "Hoje", ontem: "Ontem", semana: "7 dias", mes: "Mês", trinta: "30 dias", perso: "Período" } as const;
export type FiltroResumo = keyof typeof FILTROS;

function lerData(s: string | undefined): DataISO | null {
  try {
    return s ? data(s) : null;
  } catch {
    return null;
  }
}

/** Intervalo do filtro; o personalizado vem de ?de=&ate= (até 366 dias, nunca no futuro). */
export function intervaloResumo(filtro: FiltroResumo, de?: string, ate?: string): { de: DataISO; ate: DataISO; dias: number } {
  if (filtro !== "perso") return intervaloExtrato(filtro);
  const dia = hoje();
  let fim = lerData(ate) ?? dia;
  if (fim > dia) fim = dia;
  let inicio = lerData(de) ?? fim;
  if (inicio > fim) inicio = fim;
  if (diasEntre(inicio, fim) > 365) inicio = data(new Date(Date.parse(fim) - 365 * 86_400_000).toISOString().slice(0, 10));
  return { de: inicio, ate: fim, dias: diasEntre(inicio, fim) + 1 };
}

/**
 * Bloco "Seu trabalho" da tela inicial: ganhos (lançados e corridas aceitas no
 * Copiloto), gastos, lucro, corridas e R$/hora do período escolhido no filtro.
 */
export async function ResumoTrabalho({ usuarioId, filtro, de, ate }: { usuarioId: string; filtro: FiltroResumo; de?: string; ate?: string }) {
  const i = intervaloResumo(filtro, de, ate);
  const [config, dados] = await Promise.all([configPlantao(usuarioId), dadosDoPeriodo(usuarioId, i.de, i.ate)]);
  const d = paraDominio(dados);
  const r = resumir(d.ganhos, d.despesas, d.jornadas, taxas(config.perfil), i.dias, new Date());
  const gastos = r.despesas + r.fixosDoPeriodo + r.combustivelEstimado;
  const link = (f: FiltroResumo) => (f === "perso" ? `/m?resumo=perso&de=${i.de}&ate=${i.ate}` : `/m?resumo=${f}`) as Route;
  const extrato = (filtro === "hoje" || filtro === "ontem" || filtro === "semana" || filtro === "mes" || filtro === "trinta" ? `/m/plantao/extrato?periodo=${filtro}` : "/m/plantao/extrato") as Route;
  return (
    <section className="flex flex-col gap-3 rounded-[1.1rem] border border-borda bg-cartao p-4 shadow-cartao">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">Seu trabalho</h2>
        <span className="text-xs text-suave">{i.de === i.ate ? formatarData(i.de) : `${formatarData(i.de).slice(0, 5)} a ${formatarData(i.ate).slice(0, 5)}`}</span>
      </div>
      <nav aria-label="Período" className="grid grid-cols-6 gap-0.5 rounded-xl bg-cartao-2 p-1">
        {(Object.keys(FILTROS) as FiltroResumo[]).map((f) => (
          <Link key={f} href={link(f)} scroll={false} aria-current={f === filtro ? "page" : undefined} className={`grid h-8 place-items-center rounded-lg text-[0.68rem] font-semibold ${f === filtro ? "bg-cartao text-texto shadow-cartao" : "text-suave"}`}>{FILTROS[f]}</Link>
        ))}
      </nav>
      {filtro === "perso" && (
        <form action="/m" className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <input type="hidden" name="resumo" value="perso" />
          <label className="flex flex-col gap-1 text-xs font-medium text-suave">De<input type="date" name="de" defaultValue={i.de} max={hoje()} className="h-10 rounded-xl border border-borda bg-cartao px-2 text-sm text-texto" /></label>
          <label className="flex flex-col gap-1 text-xs font-medium text-suave">Até<input type="date" name="ate" defaultValue={i.ate} max={hoje()} className="h-10 rounded-xl border border-borda bg-cartao px-2 text-sm text-texto" /></label>
          <button className="h-10 rounded-xl bg-marca px-3 text-sm font-semibold text-white">Ver</button>
        </form>
      )}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-cartao-2 p-2.5"><p className="text-[0.7rem] text-suave">Ganhos</p><p className="text-[0.95rem] font-bold whitespace-nowrap text-ok tabular-nums">{formatarBRL(r.bruto)}</p></div>
        <div className="rounded-xl bg-cartao-2 p-2.5"><p className="text-[0.7rem] text-suave">Gastos</p><p className="text-[0.95rem] font-bold whitespace-nowrap tabular-nums">{formatarBRL(gastos)}</p></div>
        <div className="rounded-xl bg-cartao-2 p-2.5"><p className="text-[0.7rem] text-suave">Lucro</p><p className={`text-[0.95rem] font-bold whitespace-nowrap tabular-nums ${r.lucro < 0 ? "text-perigo" : "text-texto"}`}>{formatarBRL(r.lucro)}</p></div>
      </div>
      <p className="text-xs text-suave">
        {r.corridas} corrida{r.corridas === 1 ? "" : "s"}
        {r.porHora !== null ? ` · ${formatarBRL(r.porHora)}/h` : ""}
        {r.porPlataforma.length ? ` · ${r.porPlataforma.map((p) => `${NOME_PLATAFORMA[p.plataforma] ?? p.plataforma} ${formatarBRL(p.valor)}`).join(" · ")}` : ""}
      </p>
      <p className="text-[0.7rem] text-suave">Gastos: o que você lançou{r.fixosDoPeriodo ? `, ${formatarBRL(r.fixosDoPeriodo)} de fixos (aluguel e outros) pelos ${i.dias} dia${i.dias > 1 ? "s" : ""}` : ""}{r.combustivelEstimado ? ` e ${formatarBRL(r.combustivelEstimado)} de combustível estimado` : ""}.</p>
      <Link href={extrato} className="flex items-center justify-end gap-1 text-sm font-semibold text-marca">Ver extrato <ChevronRight size={15} /></Link>
    </section>
  );
}
