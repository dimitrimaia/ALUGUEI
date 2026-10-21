import { ArrowRight, Wallet, CalendarClock, Car, CheckCircle2, ClipboardCheck, FileSignature, KeyRound, Plus, UserCheck, UserPlus, Wrench } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { BotaoLink, Cartao, ItemLista, Lista, Placa, Selo, Vazio } from "@/components/ui";
import { formatarPlaca } from "@/dominio/cadastro/documentos";
import { data, formatarData, hoje, somarDias } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { perfilResumido } from "@/lib/conta";
import { exigirEquipe } from "@/lib/sessao";
import { STATUS_VEICULO, TIPO_OBRIGACAO } from "@/lib/rotulos";
import { supabaseServidor } from "@/lib/supabase/servidor";

function saudacao() {
  const hora = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(new Date()));
  return hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
}

/** Painel do locador (RF-120): o que precisa de atenção hoje, e a semana que vem. */
export default async function VisaoGeral() {
  const [{ organizacao }, perfil] = await Promise.all([exigirEquipe(), perfilResumido()]);
  const primeiroNome = (perfil?.nomeInformado || "").split(" ")[0];
  const supabase = await supabaseServidor();
  const dia = hoje();
  const [{ data: veiculos }, { data: motoristas }, { data: contratos }, { data: proximas }, { data: informados }] = await Promise.all([
    supabase.from("veiculos").select("id, status, placa, modelo, odometro_atual").eq("organizacao_id", organizacao.id).order("criado_em"),
    supabase.from("locatarios").select("id, nome, status").eq("organizacao_id", organizacao.id),
    supabase.from("contratos").select("id, status, locatario_id, veiculo_id").eq("organizacao_id", organizacao.id),
    supabase
      .from("obrigacoes")
      .select("id, tipo, vencimento, valor_centavos, contrato_id, status")
      .eq("organizacao_id", organizacao.id)
      .eq("status", "pendente")
      .gte("vencimento", dia)
      .lte("vencimento", somarDias(dia, 7))
      .order("vencimento")
      .limit(8),
    supabase.from("obrigacoes").select("id, contrato_id, valor_centavos").eq("organizacao_id", organizacao.id).in("status", ["pendente", "atrasada"]).not("pagamento_informado_em", "is", null),
  ]);

  const v = veiculos ?? [];
  const m = motoristas ?? [];
  const c = contratos ?? [];
  const nomeMotorista = (contratoId: string) => {
    const k = c.find((x) => x.id === contratoId);
    return m.find((x) => x.id === k?.locatario_id)?.nome ?? "—";
  };
  const alugados = v.filter((x) => x.status === "alugado").length;
  const ocupacao = v.length ? Math.round((alugados / v.length) * 100) : 0;
  const aReceber = (proximas ?? []).reduce((s, o) => s + (o.valor_centavos ?? 0), 0);

  const passos = [
    { feito: v.length > 0, titulo: "Cadastre um veículo", href: "/painel/veiculos/novo", icone: Car },
    { feito: m.length > 0, titulo: "Anuncie e aprove um motorista", href: "/painel/anuncios", icone: UserPlus },
    { feito: c.length > 0, titulo: "Gere e assine o contrato", href: "/painel/motoristas", icone: FileSignature },
    { feito: c.some((x) => x.status === "ativo"), titulo: "Faça a vistoria de entrega", href: "/painel/contratos", icone: ClipboardCheck },
  ] as const;
  const feitos = passos.filter((p) => p.feito).length;

  const pendencias = [
    ...(informados ?? []).map((o) => ({ id: o.id, href: "/painel/financeiro", icone: Wallet, titulo: `${nomeMotorista(o.contrato_id)} avisou que pagou`, detalhe: `Pix direto de ${formatarBRL(o.valor_centavos ?? 0)}: confira no banco e dê baixa`, tom: "ok" as const, selo: "Conferir" })),
    ...m.filter((x) => x.status === "em_analise").map((x) => ({ id: x.id, href: `/painel/motoristas/${x.id}`, icone: UserCheck, titulo: x.nome, detalhe: "Cadastro para analisar", tom: "alerta" as const, selo: "Analisar" })),
    ...c.filter((x) => x.status === "aguardando_assinatura").map((x) => ({ id: x.id, href: `/painel/contratos/${x.id}`, icone: FileSignature, titulo: m.find((y) => y.id === x.locatario_id)?.nome ?? "Contrato", detalhe: "Aguardando a assinatura do motorista", tom: "neutro" as const, selo: "Assinatura" })),
    ...c.filter((x) => x.status === "assinado").map((x) => {
      const carro = v.find((y) => y.id === x.veiculo_id);
      return { id: x.id, href: `/painel/contratos/${x.id}/vistoria`, icone: ClipboardCheck, titulo: carro ? `${formatarPlaca(carro.placa)} · ${carro.modelo}` : "Vistoria", detalhe: "Contrato assinado: falta a vistoria de entrega", tom: "marca" as const, selo: "Vistoriar" };
    }),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="-mb-2">
        <p className="text-sm text-suave">{saudacao()}{primeiroNome ? `, ${primeiroNome}` : ""} 👋</p>
        <h1 className="text-[1.4rem] leading-tight font-bold tracking-tight">{organizacao.nome} hoje</h1>
      </div>
      {/* Destaque */}
      <section className="fundo-marca relative overflow-hidden rounded-[1.4rem] p-5 shadow-flutuante sm:p-7">
        <div className="grade-sutil absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_80%_at_80%_20%,black,transparent)]" aria-hidden />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-white/75">A receber nos próximos 7 dias</p>
            <p className="mt-1 text-[1.85rem] leading-tight font-bold tracking-tight tabular-nums [overflow-wrap:anywhere] sm:text-5xl">{formatarBRL(aReceber)}</p>
            <p className="mt-2 text-sm text-white/75">{(() => { const n = (proximas ?? []).filter((o) => o.tipo !== "checkin").length; return n === 1 ? "1 cobrança programada" : `${n} cobranças programadas`; })()}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { rotulo: "Rodando", valor: alugados },
              { rotulo: "Ocupação", valor: `${ocupacao}%` },
              { rotulo: "Frota", valor: v.length },
            ].map((x) => (
              <div key={x.rotulo} className="min-w-0 rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15 backdrop-blur sm:min-w-28 sm:px-4">
                <p className="truncate text-xs font-medium text-white/70">{x.rotulo}</p>
                <p className="text-lg leading-tight font-bold tabular-nums sm:text-2xl">{x.valor}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {feitos < passos.length && (
        <Cartao>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-bold">Primeiros passos</p>
              <p className="text-sm text-suave">{feitos} de {passos.length} concluídos</p>
            </div>
            <div className="h-2 w-40 rounded-full bg-cartao-2"><div className="h-2 rounded-full bg-marca" style={{ width: `${(feitos / passos.length) * 100}%` }} /></div>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {passos.map(({ feito, titulo, href, icone: Icone }, i) => (
              <li key={titulo}>
                <Link href={href as Route} className={`flex h-full items-center gap-3 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-cartao ${feito ? "border-borda bg-cartao-2" : "border-marca/30 bg-marca-suave/40"}`}>
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${feito ? "bg-ok-suave text-ok" : "bg-marca text-white"}`}>
                    {feito ? <CheckCircle2 size={20} aria-hidden /> : <Icone size={20} aria-hidden />}
                  </span>
                  <span>
                    <span className="block text-xs font-semibold text-suave">Passo {i + 1}</span>
                    <span className={`block text-sm font-semibold ${feito ? "text-suave line-through" : ""}`}>{titulo}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Cartao>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-6">
          <section>
            <CabecalhoSecao titulo="Precisa de você" />
            {pendencias.length ? (
              <Lista>
                {pendencias.map((p) => (
                  <ItemLista key={`${p.selo}${p.id}`} href={p.href} icone={p.icone} titulo={p.titulo} detalhe={p.detalhe} lateral={<Selo tom={p.tom}>{p.selo}</Selo>} />
                ))}
              </Lista>
            ) : (
              <Vazio icone={CheckCircle2} titulo="Tudo em dia">Nenhuma pendência agora.</Vazio>
            )}
          </section>
          <section>
            <CabecalhoSecao titulo="Próximos 7 dias" />
            {proximas?.length ? (
              <Lista>
                {proximas.map((o) => (
                  <ItemLista
                    key={o.id}
                    href={`/painel/contratos/${o.contrato_id}`}
                    inicio={<DataCompacta iso={o.vencimento} />}
                    titulo={TIPO_OBRIGACAO[o.tipo]}
                    detalhe={nomeMotorista(o.contrato_id)}
                    lateral={o.valor_centavos !== null ? <span className="font-bold">{formatarBRL(o.valor_centavos)}</span> : <Selo tom="info">Fotos</Selo>}
                  />
                ))}
              </Lista>
            ) : (
              <Vazio icone={CalendarClock} titulo="Semana livre">Sem vencimentos nem check-ins nos próximos dias.</Vazio>
            )}
          </section>
        </div>

        <section>
          <CabecalhoSecao titulo="Sua frota" acao={<Link href="/painel/veiculos" className="inline-flex items-center gap-1 text-sm font-semibold text-marca">Ver todos <ArrowRight size={16} /></Link>} />
          {v.length ? (
            <Cartao className="flex flex-col gap-4">
              <div className="flex flex-col items-center gap-5 sm:flex-row">
                <Anel percentual={ocupacao} />
                <div className="grid w-full flex-1 grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  {[
                    { icone: KeyRound, rotulo: "Alugados", n: alugados, cor: "text-marca" },
                    { icone: Car, rotulo: "Disponíveis", n: v.filter((x) => x.status === "disponivel").length, cor: "text-ok" },
                    { icone: Wrench, rotulo: "Manutenção", n: v.filter((x) => x.status === "em_manutencao").length, cor: "text-alerta" },
                    { icone: UserCheck, rotulo: "Em análise", n: m.filter((x) => x.status === "em_analise").length, cor: "text-info" },
                  ].map(({ icone: Icone, rotulo, n, cor }) => (
                    <div key={rotulo} className="flex items-center gap-2">
                      <Icone size={16} className={cor} aria-hidden />
                      <span className="text-suave">{rotulo}</span>
                      <span className="ml-auto font-bold">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
              <ul className="divide-y divide-borda border-t border-borda">
                {v.slice(0, 5).map((x) => (
                  <li key={x.id}>
                    <Link href={`/painel/veiculos/${x.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-marca">
                      <span className="flex min-w-0 items-center gap-3">
                        <Placa placa={x.placa} tamanho="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{x.modelo}</span>
                          <span className="block text-xs text-suave">{x.odometro_atual.toLocaleString("pt-BR")} km</span>
                        </span>
                      </span>
                      <Selo tom={STATUS_VEICULO[x.status].tom}>{STATUS_VEICULO[x.status].rotulo}</Selo>
                    </Link>
                  </li>
                ))}
              </ul>
            </Cartao>
          ) : (
            <Vazio icone={Car} titulo="Sem veículos" acao={<BotaoLink href="/painel/veiculos/novo" icone={Plus}>Cadastrar veículo</BotaoLink>}>Cadastre o primeiro carro da frota.</Vazio>
          )}
        </section>
      </div>
    </div>
  );
}

function CabecalhoSecao({ titulo, acao }: { titulo: string; acao?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-bold tracking-tight">{titulo}</h2>
      {acao}
    </div>
  );
}

const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function DataCompacta({ iso }: { iso: string }) {
  const d = data(iso);
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-marca-suave leading-none text-marca" title={formatarData(d)}>
      <span className="text-center">
        <span className="block text-base font-extrabold">{d.slice(8, 10)}</span>
        <span className="block text-[0.6rem] font-bold">{MESES[Number(d.slice(5, 7)) - 1]}</span>
      </span>
    </span>
  );
}

function Anel({ percentual }: { percentual: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-20 shrink-0">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--cartao-2)" strokeWidth="9" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--marca)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(percentual / 100) * c} ${c}`} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-center">
        <span>
          <span className="block text-lg font-extrabold">{percentual}%</span>
          <span className="block text-[0.65rem] font-semibold text-suave">ocupação</span>
        </span>
      </span>
    </div>
  );
}
