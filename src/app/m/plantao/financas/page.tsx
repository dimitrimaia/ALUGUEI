import { CalendarCheck, ChevronRight, ClipboardCheck, PiggyBank, Plus, Target } from "lucide-react";
import Link from "next/link";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { AnelMeta, ConfigurarFinancas, FormReserva } from "@/components/plantao/financas";
import { BotaoLink, Cartao } from "@/components/ui";
import { type DataISO, somarDias, somarMeses } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { taxas } from "@/dominio/ganhos/custos";
import { diaOperacional, diasDeTrabalho, progressoMetaMensal, sugestaoReserva } from "@/dominio/ganhos/financas";
import { resumir } from "@/dominio/ganhos/plantao";
import { configPlantao, dadosDoPeriodo, paraDominio } from "@/lib/plantao";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Finanças" };

/** Finanças do motorista: meta do mês, reserva para manutenção e fechamento do dia. */
export default async function Financas() {
  const usuario = await exigirUsuario("/m/plantao/financas");
  const config = await configPlantao(usuario.id);
  const f = config.financas;
  const dia = diaOperacional(f.virada);
  const inicioMes = `${dia.slice(0, 8)}01` as DataISO;
  const fimMes = somarDias(somarMeses(inicioMes, 1), -1);
  const [dados, { data: reservas }, { data: aceitasHoje }] = await Promise.all([
    dadosDoPeriodo(usuario.id, inicioMes, dia),
    supabaseAdmin().from("reservas_manutencao").select("valor_centavos").eq("usuario_id", usuario.id),
    supabaseAdmin().from("corridas_avaliadas").select("valor_centavos").eq("usuario_id", usuario.id).eq("decisao", "aceitei").gte("ocorrida_em", `${dia}T00:00:00-03:00`),
  ]);
  const t = taxas(config.perfil);
  const d = paraDominio(dados);
  const r = resumir(d.ganhos, d.despesas, d.jornadas, t, Number(dia.slice(8, 10)), new Date());
  const restantes = diasDeTrabalho(dia, fimMes, f.diasTrabalho);
  const meta = progressoMetaMensal(f.metaMensal, r.lucro, restantes);
  const guardado = (reservas ?? []).reduce((s, x) => s + x.valor_centavos, 0);
  const reserva = sugestaoReserva(t.desgastePorKm, r.km, guardado);
  const lancadasHoje = dados.ganhos.filter((g) => g.dia === dia).reduce((s, g) => s + g.corridas, 0);
  const semLancar = Math.max(0, (aceitasHoje?.length ?? 0) - lancadasHoje);
  const mes = new Date(`${dia}T12:00:00-03:00`).toLocaleDateString("pt-BR", { month: "long", timeZone: "America/Sao_Paulo" });

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo="Finanças" voltar="/m/plantao" />

      <section className="fundo-marca rounded-[1.4rem] p-5 text-white shadow-flutuante">
        <p className="flex items-center gap-1.5 text-sm text-white/80"><Target size={15} /> Lucro de {mes}</p>
        <div className="mt-2 flex items-center gap-4">
          {f.metaMensal > 0 && (
            <div className="relative grid place-items-center">
              <AnelMeta percentual={meta.percentual} />
              <span className="absolute text-lg font-extrabold">{meta.percentual}%</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[1.9rem] leading-tight font-bold tabular-nums">{formatarBRL(r.lucro)}</p>
            {f.metaMensal > 0 ? (
              <p className="text-sm text-white/80">{meta.batida ? "Meta do mês batida! 🎉" : <>de {formatarBRL(f.metaMensal)} · faltam <strong className="text-white">{formatarBRL(meta.falta)}</strong></>}</p>
            ) : (
              <p className="text-sm text-white/80">Defina uma meta do mês abaixo.</p>
            )}
            {f.metaMensal > 0 && !meta.batida && meta.porDia > 0 && <p className="mt-1 text-sm text-white/80">{formatarBRL(meta.porDia)} por dia nos {restantes} dias de trabalho que faltam</p>}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[["ganhos", formatarBRL(r.bruto)], ["gastos", formatarBRL(r.despesas + r.fixosDoPeriodo + r.combustivelEstimado)], ["por hora", r.lucroPorHora !== null ? formatarBRL(r.lucroPorHora) : "—"]].map(([a, b]) => (
            <div key={a} className="rounded-xl bg-white/12 py-2 ring-1 ring-white/15"><p className="text-[0.65rem] text-white/75">{a}</p><p className="text-sm font-bold tabular-nums">{b}</p></div>
          ))}
        </div>
      </section>

      {semLancar > 0 && (
        <Link href="/m/plantao/fechar" className="flex items-center gap-3 rounded-[1.1rem] border border-alerta/30 bg-alerta-suave p-4">
          <ClipboardCheck size={20} className="shrink-0 text-alerta" />
          <span className="min-w-0 flex-1 text-sm"><strong>{semLancar} {semLancar === 1 ? "corrida aceita" : "corridas aceitas"} hoje sem lançamento.</strong> Feche o dia para o lucro ficar certo.</span>
          <ChevronRight size={17} className="text-suave" />
        </Link>
      )}

      <div className="grid grid-cols-3 gap-2">
        <BotaoLink href="/m/plantao/fechar" icone={CalendarCheck} className="col-span-3 h-12">Fechar o dia em 1 minuto</BotaoLink>
        <BotaoLink href="/m/plantao/ganho" variante="secundario" icone={Plus}>Receita</BotaoLink>
        <BotaoLink href="/m/plantao/despesa" variante="secundario" icone={Plus}>Despesa</BotaoLink>
        <BotaoLink href="/m/plantao/extrato?periodo=mes" variante="secundario">Extrato</BotaoLink>
      </div>

      <Cartao className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-bold"><PiggyBank size={18} className="text-marca" /> Reserva para manutenção</h2>
            <p className="text-xs text-suave">Pelo desgaste dos {r.km.toLocaleString("pt-BR")} km do mês, o ideal era ter {formatarBRL(reserva.deveria)} guardados.</p>
          </div>
          <p className="shrink-0 text-right"><span className="block text-xl font-extrabold tabular-nums">{formatarBRL(guardado)}</span><span className="text-xs text-suave">guardados</span></p>
        </div>
        {reserva.falta > 0 && <p className="rounded-xl bg-cartao-2 px-3 py-2 text-sm">Sugestão: guarde mais <strong>{formatarBRL(reserva.falta)}</strong>. Quando vier a troca de óleo ou os pneus, o dinheiro já está lá.</p>}
        <FormReserva />
      </Cartao>

      <ConfigurarFinancas inicial={f} />
    </div>
  );
}
