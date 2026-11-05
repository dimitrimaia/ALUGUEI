import { Map as MapIcon, Route as RotaIcone, KeyRound, BarChart3, History, PiggyBank, Calculator, Car, ChevronRight, Fuel, Gauge, Link2, Plus, Receipt, Settings2, Target, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { Cronometro } from "@/components/plantao/cronometro";
import { FormEncerrar, FormIniciar } from "@/components/plantao/formularios";
import { SincronizarPlantao } from "@/components/plantao/sincronizar";
import { BotaoLink, Selo } from "@/components/ui";
import { hoje } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { taxas } from "@/dominio/ganhos/custos";
import { minutosJornada, NOME_DESPESA, NOME_PLATAFORMA, progressoMeta, resumir } from "@/dominio/ganhos/plantao";
import { configPlantao, dadosDoPeriodo, jornadaAberta, paraDominio } from "@/lib/plantao";
import { exigirUsuario } from "@/lib/sessao";
import { aluguelExterno, leiturasDeKm } from "@/lib/aluguel-externo";
import { lembretesDoDia } from "@/dominio/ganhos/aluguel";

export const metadata = { title: "Plantão" };

const FERRAMENTAS = [
  { href: "/m/plantao/calculadora?aba=particular", rotulo: "Corrida particular", detalhe: "Quanto cobrar, com paradas", icone: RotaIcone },
  { href: "/m/plantao/calculadora?aba=viagem", rotulo: "Viagem", detalhe: "Rota, pedágio e passageiros", icone: MapIcon },
  { href: "/m/plantao/calculadora", rotulo: "Calculadora", detalhe: "Oferta, entrega e combustível", icone: Calculator },
  { href: "/m/plantao/semaforo", rotulo: "Copiloto", detalhe: "Bolha sobre o inDrive e a Uber", icone: Gauge },
  { href: "/m/plantao/extrato", rotulo: "Extrato", detalhe: "Ganhos e gastos, um a um", icone: BarChart3 },
  { href: "/m/plantao/historico", rotulo: "Ofertas", detalhe: "Aceitas, recusadas e prejuízo evitado", icone: History },
  { href: "/m/plantao/financas", rotulo: "Finanças", detalhe: "Meta do mês e reserva", icone: PiggyBank },
  { href: "/m/caronas", rotulo: "Caronas", detalhe: "Divida o custo da viagem", icone: Users },
  { href: "/m/clientes", rotulo: "Meus clientes", detalhe: "Seu link de corridas", icone: Link2 },
  { href: "/m/plantao/aluguel", rotulo: "Carro alugado", detalhe: "Vistoria, km do mês e prazo", icone: KeyRound },
  { href: "/m/plantao/custos", rotulo: "Custos do carro", detalhe: "Base do lucro real", icone: Settings2 },
] as const;

/** Plantão: o painel do dia de trabalho, com as ferramentas do motorista (tudo em um). */
export default async function Plantao() {
  const usuario = await exigirUsuario("/m/plantao");
  const dia = hoje();
  const [config, aberta, dados, lembretesAluguel] = await Promise.all([configPlantao(usuario.id), jornadaAberta(usuario.id), dadosDoPeriodo(usuario.id, dia, dia), aluguelExterno(usuario.id).then((a) => (a ? leiturasDeKm(usuario.id, a).then((l) => lembretesDoDia(a, dia, l)) : [])).catch(() => [])]);
  const t = taxas(config.perfil);
  const agora = new Date();
  const d = paraDominio(dados);
  const r = resumir(d.ganhos, d.despesas, d.jornadas, t, 1, agora);
  const meta = aberta?.meta_centavos || config.meta;
  const minutos = aberta ? minutosJornada({ inicio: aberta.inicio, fim: null, kmRodados: null }, agora) : 0;
  const progresso = progressoMeta(meta, r.bruto, minutos);
  const lancamentos = [
    ...dados.ganhos.map((g) => ({ id: g.id, quando: g.criado_em, titulo: `${NOME_PLATAFORMA[g.plataforma] ?? g.plataforma}${g.corridas > 1 ? ` · ${g.corridas} corridas` : ""}${g.automatico ? " (Copiloto)" : ""}`, valor: g.valor_centavos })),
    ...dados.despesas.map((d) => ({ id: d.id, quando: d.criado_em, titulo: NOME_DESPESA[d.categoria] ?? d.categoria, valor: -d.valor_centavos })),
  ].sort((a, b) => b.quando.localeCompare(a.quando));

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista raiz titulo="Plantão" subtitulo="Seu dia de trabalho, com o lucro de verdade." />
      <SincronizarPlantao perfil={config.perfil} criterios={config.criterios} preferencias={config.preferencias} />
      {lembretesAluguel.slice(0, 2).map((l) => (
        <Link key={l.chave} href="/m/plantao/aluguel" className={`flex items-center gap-3 rounded-[1.1rem] border p-3 text-sm ${l.nivel === "perigo" ? "border-perigo/30 bg-perigo/10" : l.nivel === "alerta" ? "border-alerta/30 bg-alerta/10" : "border-borda bg-cartao"}`}>
          <KeyRound size={18} className={l.nivel === "perigo" ? "shrink-0 text-perigo" : "shrink-0 text-alerta"} />
          <span className="min-w-0 flex-1"><span className="block font-semibold">{l.titulo}</span><span className="block text-xs text-suave">{l.texto}</span></span>
          <ChevronRight size={16} className="shrink-0 text-suave" />
        </Link>
      ))}

      <section className="fundo-marca relative -mt-1 overflow-hidden rounded-[1.4rem] p-5 shadow-flutuante">
        <div className="grade-sutil absolute inset-0 opacity-60 [mask-image:radial-gradient(80%_80%_at_90%_0%,black,transparent)]" aria-hidden />
        <div className="relative">
          {aberta ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm text-white/80">
                  <span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[#4ade80] opacity-75" /><span className="relative inline-flex size-2.5 rounded-full bg-[#4ade80]" /></span>
                  Em plantão há <Cronometro desde={aberta.inicio} />
                </p>
                {r.porHora !== null && <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums">{formatarBRL(r.porHora)}/h</span>}
              </div>
              <p className="mt-1 text-[2.1rem] leading-tight font-bold tracking-tight tabular-nums">{formatarBRL(r.bruto)}</p>
              <Link href="/m/plantao/extrato" className="inline-flex items-center gap-1 text-sm text-white/75">ganhos hoje · lucro <strong className="text-white">{formatarBRL(r.lucro)}</strong> <ChevronRight size={14} /></Link>
              {meta > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-white/75">
                    <span className="flex items-center gap-1"><Target size={13} /> Meta {formatarBRL(meta)}</span>
                    <span>{progresso.batida ? "Meta batida! 🎉" : progresso.minutosRestantes !== null ? `faltam ${formatarBRL(progresso.falta)} · ~${Math.ceil(progresso.minutosRestantes / 60)}h no ritmo` : `faltam ${formatarBRL(progresso.falta)}`}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white" style={{ width: `${progresso.percentual}%` }} /></div>
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <BotaoLink href="/m/plantao/ganho" variante="claro" icone={Plus} className="h-11 rounded-xl">Lançar ganho</BotaoLink>
                <FormEncerrar kmInicial={aberta.km_inicial} />
              </div>
            </>
          ) : (
            <>
              <p className="font-semibold">Pronto para rodar?</p>
              <p className="mt-0.5 mb-4 text-sm text-white/75">Inicie o plantão para acompanhar horas, meta e lucro por hora.{r.bruto > 0 && ` Hoje: ${formatarBRL(r.bruto)}.`}</p>
              <FormIniciar metaPadrao={config.meta ? String(config.meta / 100) : ""} />
            </>
          )}
        </div>
      </section>

      {!config.salvo && (
        <Link href="/m/plantao/custos" className="flex items-center gap-3 rounded-[1.1rem] border border-marca/30 bg-marca-suave p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-marca text-white"><Fuel size={19} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Configure os custos do seu carro</span>
            <span className="block text-xs text-suave">{config.aluguelSemanal ? "O aluguel do seu contrato já entrou. Falta o combustível e a média do carro." : "Combustível, média e aluguel: 1 minuto, e o lucro fica real."}</span>
          </span>
          <ChevronRight size={18} className="text-suave" />
        </Link>
      )}

      <div className="grid grid-cols-3 gap-2">
        {[
          { rotulo: "Lucro hoje", valor: formatarBRL(r.lucro), tom: r.lucro < 0 ? "text-perigo" : "", filtro: "tudo" },
          { rotulo: "Corridas", valor: String(r.corridas), tom: "", filtro: "ganhos" },
          { rotulo: "Gastos", valor: formatarBRL(r.despesas + r.fixosDoPeriodo + r.combustivelEstimado), tom: "", filtro: "gastos" },
        ].map((i) => (
          <Link key={i.rotulo} href={`/m/plantao/extrato?periodo=hoje&filtro=${i.filtro}` as Route} className="relative rounded-[1.1rem] border border-borda bg-cartao p-3 shadow-cartao transition-transform active:scale-[0.97]">
            <p className="text-[0.7rem] font-semibold text-suave">{i.rotulo}</p>
            <p className={`text-[0.95rem] font-bold tabular-nums [overflow-wrap:anywhere] ${i.tom}`}>{i.valor}</p>
            <ChevronRight size={14} className="absolute top-3 right-2 text-suave" />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <BotaoLink href="/m/plantao/ganho" variante="secundario" icone={Plus}>Ganho</BotaoLink>
        <BotaoLink href="/m/plantao/despesa" variante="secundario" icone={Receipt}>Despesa</BotaoLink>
      </div>

      <section>
        <h2 className="mt-1 mb-2.5 text-base font-bold tracking-tight">Ferramentas</h2>
        <div className="grid grid-cols-2 gap-2">
          {FERRAMENTAS.map(({ href, rotulo, detalhe, icone: Icone }) => (
            <Link key={href} href={href as Route} className="flex items-center gap-3 rounded-[1.1rem] border border-borda bg-cartao p-3 shadow-cartao transition-transform active:scale-[0.98]">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-marca-suave text-marca"><Icone size={19} /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{rotulo}</span>
                <span className="block text-[0.7rem] leading-tight text-suave">{detalhe}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {!!lancamentos.length && (
        <section>
          <div className="mt-1 mb-2.5 flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight">Lançamentos de hoje</h2>
            <Link href="/m/plantao/extrato" className="text-sm font-semibold text-marca">Ver extrato</Link>
          </div>
          <div className="divide-y divide-borda overflow-hidden rounded-[1.1rem] border border-borda bg-cartao shadow-cartao">
            {lancamentos.slice(0, 6).map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`grid size-9 place-items-center rounded-lg ${l.valor >= 0 ? "bg-ok-suave text-ok" : "bg-cartao-2 text-suave"}`}>{l.valor >= 0 ? <Car size={17} /> : <Receipt size={17} />}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{l.titulo}</p>
                  <p className="text-xs text-suave">{new Date(l.quando).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}</p>
                </div>
                <span className={`text-sm font-bold tabular-nums ${l.valor >= 0 ? "text-ok" : ""}`}>{l.valor >= 0 ? "+" : "−"}{formatarBRL(Math.abs(l.valor))}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <Link href="/m/plantao/ajuda" className="text-center text-sm font-semibold text-marca">Dúvidas e diagnóstico do Copiloto</Link>

      {!!dados.corridas.length && (
        <section>
          <div className="mt-1 mb-2.5 flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight">Ofertas avaliadas hoje</h2>
            <Link href="/m/plantao/historico?periodo=hoje" className="text-sm font-semibold text-marca">Ver todas</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["verde", "amarelo", "vermelho"] as const).map((s) => (
              <Selo key={s} tom={s === "verde" ? "ok" : s === "amarelo" ? "alerta" : "perigo"}>{dados.corridas.filter((c) => c.sinal === s).length} {s === "verde" ? "boas" : s === "amarelo" ? "a avaliar" : "ruins"}</Selo>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
