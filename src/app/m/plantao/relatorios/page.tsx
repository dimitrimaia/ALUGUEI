import { Download } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { BotaoExcluir } from "@/components/plantao/excluir";
import { Cartao, DadoRotulado, Vazio } from "@/components/ui";
import { data, formatarData, somarDias } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { taxas } from "@/dominio/ganhos/custos";
import { NOME_DESPESA, NOME_PLATAFORMA, resumir } from "@/dominio/ganhos/plantao";
import { configPlantao, dadosDoPeriodo, intervalo, paraDominio, type Periodo, PERIODOS } from "@/lib/plantao";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Relatórios" };

export default async function Relatorios({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const usuario = await exigirUsuario("/m/plantao/relatorios");
  const pedido = (await searchParams).periodo;
  const periodo: Periodo = pedido === "hoje" || pedido === "mes" ? pedido : "semana";
  const { de, ate, dias } = intervalo(periodo);
  const [config, dados] = await Promise.all([configPlantao(usuario.id), dadosDoPeriodo(usuario.id, de, ate)]);
  const d = paraDominio(dados);
  const r = resumir(d.ganhos, d.despesas, d.jornadas, taxas(config.perfil), dias, new Date());
  const porDia = Array.from({ length: dias }, (_, i) => {
    const dia = somarDias(de, i);
    return { dia, valor: d.ganhos.filter((g) => g.dia === dia).reduce((s, g) => s + g.valor, 0) };
  });
  const maior = Math.max(1, ...porDia.map((x) => x.valor));
  const aceitas = dados.corridas.filter((c) => c.decisao === "aceitei");
  const mediaKmAceitas = aceitas.length ? Math.round(aceitas.reduce((s, c) => s + (c.valor_centavos * 1000) / Math.max(100, c.metros_corrida + (c.metros_busca ?? 0)), 0) / aceitas.length) : null;
  const lancamentos = [
    ...dados.ganhos.map((g) => ({ tipo: "ganho" as const, id: g.id, dia: g.dia, quando: g.criado_em, titulo: NOME_PLATAFORMA[g.plataforma] ?? g.plataforma, detalhe: g.corridas > 1 ? `${g.corridas} corridas` : "1 corrida", valor: g.valor_centavos })),
    ...dados.despesas.map((x) => ({ tipo: "despesa" as const, id: x.id, dia: x.dia, quando: x.criado_em, titulo: NOME_DESPESA[x.categoria] ?? x.categoria, detalhe: x.descricao ?? "", valor: -x.valor_centavos })),
  ].sort((a, b) => b.quando.localeCompare(a.quando));

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo="Relatórios" voltar="/m/plantao" />
      <nav className="grid grid-cols-3 gap-1 rounded-2xl bg-cartao-2 p-1" aria-label="Período">
        {(Object.keys(PERIODOS) as Periodo[]).map((p) => (
          <Link key={p} href={`/m/plantao/relatorios?periodo=${p}` as Route} aria-current={p === periodo ? "page" : undefined} className={`grid h-10 place-items-center rounded-xl text-sm font-semibold ${p === periodo ? "bg-cartao shadow-cartao" : "text-suave"}`}>
            {PERIODOS[p]}
          </Link>
        ))}
      </nav>

      <section className="fundo-marca rounded-[1.4rem] p-5 text-white shadow-flutuante">
        <p className="text-sm text-white/75">Lucro {periodo === "hoje" ? "de hoje" : `em ${PERIODOS[periodo].toLowerCase()}`}</p>
        <p className="text-[2rem] leading-tight font-bold tabular-nums">{formatarBRL(r.lucro)}</p>
        <p className="text-sm text-white/75">de {formatarBRL(r.bruto)} em ganhos · {r.corridas} corridas</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            ["por hora", r.porHora !== null ? formatarBRL(r.porHora) : "—"],
            ["por km", r.porKm !== null ? formatarBRL(r.porKm) : "—"],
            ["horas", r.horas ? `${r.horas.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h` : "—"],
          ].map(([rotulo, valor]) => (
            <div key={rotulo} className="rounded-xl bg-white/12 py-2 ring-1 ring-white/15"><p className="text-[0.65rem] text-white/75">{rotulo}</p><p className="font-bold tabular-nums">{valor}</p></div>
          ))}
        </div>
      </section>

      {periodo !== "hoje" && (
        <Cartao>
          <h2 className="mb-3 text-sm font-bold">Ganhos por dia</h2>
          <div className="flex h-32 items-end gap-[2px]" role="img" aria-label={`Ganhos por dia: ${porDia.map((x) => `${formatarData(x.dia).slice(0, 5)} ${formatarBRL(x.valor)}`).join(", ")}`}>
            {porDia.map((x) => (
              <div key={x.dia} className="group relative flex h-full flex-1 items-end" title={`${formatarData(x.dia)}: ${formatarBRL(x.valor)}`}>
                <div className="w-full rounded-t-[4px] bg-marca transition-opacity group-hover:opacity-80" style={{ height: `${x.valor ? Math.max(3, (x.valor / maior) * 100) : 0}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[0.65rem] text-suave"><span>{formatarData(data(de)).slice(0, 5)}</span><span>maior dia: {formatarBRL(maior === 1 ? 0 : maior)}</span><span>{formatarData(data(ate)).slice(0, 5)}</span></div>
        </Cartao>
      )}

      <Cartao>
        <h2 className="text-sm font-bold">Para onde foi o dinheiro</h2>
        <dl className="mt-1 divide-y divide-borda">
          {r.porPlataforma.map((p) => <DadoRotulado key={p.plataforma} rotulo={`${NOME_PLATAFORMA[p.plataforma]} · ${p.corridas} corridas`}><span className="text-ok">+{formatarBRL(p.valor)}</span></DadoRotulado>)}
          {r.porCategoria.map((c) => <DadoRotulado key={c.categoria} rotulo={NOME_DESPESA[c.categoria]}>−{formatarBRL(c.valor)}</DadoRotulado>)}
          {r.fixosDoPeriodo > 0 && <DadoRotulado rotulo={`Fixos do período (aluguel, seguro), ${dias} ${dias === 1 ? "dia" : "dias"}`}>−{formatarBRL(r.fixosDoPeriodo)}</DadoRotulado>}
          {r.combustivelEstimado > 0 && <DadoRotulado rotulo="Combustível estimado pelo km (sem abastecimento lançado)">−{formatarBRL(r.combustivelEstimado)}</DadoRotulado>}
          <DadoRotulado rotulo="Lucro"><strong className={r.lucro < 0 ? "text-perigo" : ""}>{formatarBRL(r.lucro)}</strong></DadoRotulado>
        </dl>
      </Cartao>

      {!!dados.corridas.length && (
        <Cartao>
          <h2 className="text-sm font-bold">Semáforo</h2>
          <dl className="mt-1 divide-y divide-borda">
            <DadoRotulado rotulo="Ofertas avaliadas">{dados.corridas.length}</DadoRotulado>
            <DadoRotulado rotulo="Verdes · amarelas · vermelhas">{["verde", "amarelo", "vermelho"].map((s) => dados.corridas.filter((c) => c.sinal === s).length).join(" · ")}</DadoRotulado>
            <DadoRotulado rotulo="Aceitas · recusadas">{aceitas.length} · {dados.corridas.filter((c) => c.decisao === "recusei").length}</DadoRotulado>
            {mediaKmAceitas !== null && <DadoRotulado rotulo="Média por km das aceitas">{formatarBRL(mediaKmAceitas)}</DadoRotulado>}
          </dl>
        </Cartao>
      )}

      <section>
        <div className="mt-1 mb-2.5 flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight">Lançamentos</h2>
          {!!lancamentos.length && <a href={`/m/plantao/relatorios/csv?periodo=${periodo}`} className="inline-flex items-center gap-1 text-sm font-semibold text-marca"><Download size={15} /> Planilha</a>}
        </div>
        {lancamentos.length ? (
          <div className="divide-y divide-borda overflow-hidden rounded-[1.1rem] border border-borda bg-cartao shadow-cartao">
            {lancamentos.map((l) => (
              <div key={l.id} className="flex items-center gap-3 py-2.5 pr-2 pl-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{l.titulo}</p>
                  <p className="truncate text-xs text-suave">{formatarData(data(l.dia)).slice(0, 5)}{l.detalhe ? ` · ${l.detalhe}` : ""}</p>
                </div>
                <span className={`text-sm font-bold tabular-nums ${l.valor >= 0 ? "text-ok" : ""}`}>{l.valor >= 0 ? "+" : "−"}{formatarBRL(Math.abs(l.valor))}</span>
                <BotaoExcluir tipo={l.tipo} id={l.id} />
              </div>
            ))}
          </div>
        ) : (
          <Vazio titulo="Nada lançado neste período">Lance os ganhos de cada app e as despesas no Plantão.</Vazio>
        )}
      </section>
    </div>
  );
}
