import { CalendarClock, Car, CheckCircle2, Circle, ClipboardCheck, FileSignature, KeyRound, UserCheck } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { CabecalhoPagina, Cartao, Indicador, ItemLista, Lista, Selo, Vazio } from "@/components/ui";
import { formatarPlaca } from "@/dominio/cadastro/documentos";
import { data, formatarData, hoje, somarDias } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { exigirEquipe } from "@/lib/sessao";
import { TIPO_OBRIGACAO } from "@/lib/rotulos";
import { supabaseServidor } from "@/lib/supabase/servidor";

/** Painel do locador (RF-120): o que precisa de atenção hoje, e a semana que vem. */
export default async function VisaoGeral() {
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const dia = hoje();
  const [{ data: veiculos }, { data: motoristas }, { data: contratos }, { data: proximas }] = await Promise.all([
    supabase.from("veiculos").select("id, status, placa, modelo").eq("organizacao_id", organizacao.id),
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
  ]);

  const v = veiculos ?? [];
  const m = motoristas ?? [];
  const c = contratos ?? [];
  const nomeMotorista = (contratoId: string) => {
    const k = c.find((x) => x.id === contratoId);
    return m.find((x) => x.id === k?.locatario_id)?.nome ?? "—";
  };

  const passos = [
    { feito: v.length > 0, titulo: "Cadastre um veículo", href: "/painel/veiculos/novo" },
    { feito: m.length > 0, titulo: "Convide um motorista pelo WhatsApp", href: "/painel/motoristas/convidar" },
    { feito: c.length > 0, titulo: "Gere e assine o contrato", href: "/painel/motoristas" },
    { feito: c.some((x) => x.status === "ativo"), titulo: "Faça a vistoria de entrega", href: "/painel/contratos" },
  ] as const;
  const emAndamento = passos.some((p) => !p.feito);

  const pendencias = [
    ...m.filter((x) => x.status === "em_analise").map((x) => ({ id: x.id, href: `/painel/motoristas/${x.id}`, icone: UserCheck, titulo: x.nome, detalhe: "Cadastro para analisar", tom: "alerta" as const, selo: "Analisar" })),
    ...c.filter((x) => x.status === "aguardando_assinatura").map((x) => ({ id: x.id, href: `/painel/contratos/${x.id}`, icone: FileSignature, titulo: m.find((y) => y.id === x.locatario_id)?.nome ?? "Contrato", detalhe: "Aguardando assinatura do motorista", tom: "neutro" as const, selo: "Assinatura" })),
    ...c.filter((x) => x.status === "assinado").map((x) => {
      const carro = v.find((y) => y.id === x.veiculo_id);
      return { id: x.id, href: `/painel/contratos/${x.id}/vistoria`, icone: ClipboardCheck, titulo: carro ? `${formatarPlaca(carro.placa)} · ${carro.modelo}` : "Vistoria", detalhe: "Contrato assinado: falta a vistoria de entrega", tom: "marca" as const, selo: "Vistoriar" };
    }),
  ];

  return (
    <>
      <CabecalhoPagina titulo="Início" subtitulo="O que precisa da sua atenção hoje." />

      {emAndamento && (
        <Cartao className="mb-6">
          <p className="font-semibold">Primeiros passos</p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {passos.map((p) => (
              <li key={p.titulo}>
                <Link href={p.href as Route} className={`flex items-center gap-3 rounded-xl border border-borda px-3 py-3 transition-colors hover:bg-cartao-2 ${p.feito ? "text-suave" : ""}`}>
                  {p.feito ? <CheckCircle2 className="text-ok" size={20} aria-hidden /> : <Circle className="text-borda-forte" size={20} aria-hidden />}
                  <span className={p.feito ? "line-through" : "font-medium"}>{p.titulo}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Cartao>
      )}

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Indicador icone={KeyRound} rotulo="Alugados" valor={v.filter((x) => x.status === "alugado").length} detalhe={`de ${v.length} veículo(s)`} />
        <Indicador icone={Car} rotulo="Disponíveis" valor={v.filter((x) => x.status === "disponivel").length} tom="ok" />
        <Indicador icone={UserCheck} rotulo="Para analisar" valor={m.filter((x) => x.status === "em_analise").length} tom="alerta" />
        <Indicador icone={FileSignature} rotulo="Contratos ativos" valor={c.filter((x) => x.status === "ativo").length} tom="info" />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Pendências</h2>
          {pendencias.length ? (
            <Lista>
              {pendencias.map((p) => (
                <ItemLista key={`${p.selo}${p.id}`} href={p.href as Route} icone={p.icone} titulo={p.titulo} detalhe={p.detalhe} lateral={<Selo tom={p.tom}>{p.selo}</Selo>} />
              ))}
            </Lista>
          ) : (
            <Vazio icone={CheckCircle2} titulo="Tudo em dia">Nenhuma pendência agora.</Vazio>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Próximos 7 dias</h2>
          {proximas?.length ? (
            <Lista>
              {proximas.map((o) => (
                <ItemLista
                  key={o.id}
                  href={`/painel/contratos/${o.contrato_id}` as Route}
                  icone={CalendarClock}
                  titulo={`${TIPO_OBRIGACAO[o.tipo]} · ${nomeMotorista(o.contrato_id)}`}
                  detalhe={formatarData(data(o.vencimento))}
                  lateral={o.valor_centavos !== null ? <span className="font-semibold">{formatarBRL(o.valor_centavos)}</span> : undefined}
                />
              ))}
            </Lista>
          ) : (
            <Vazio icone={CalendarClock} titulo="Semana livre">Sem vencimentos nem check-ins nos próximos dias.</Vazio>
          )}
        </section>
      </div>
    </>
  );
}
