import { Gauge, UserPlus } from "lucide-react";
import { notFound } from "next/navigation";
import { Botao, BotaoLink, CabecalhoPagina, Cartao, DadoRotulado, Selo, classeEntrada } from "@/components/ui";
import { formatarPlaca } from "@/dominio/cadastro/documentos";
import { data, formatarData } from "@/dominio/datas/data";
import { exigirEquipe } from "@/lib/sessao";
import { STATUS_VEICULO } from "@/lib/rotulos";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { mudarStatusVeiculo, registrarKm } from "../acoes";

const km = new Intl.NumberFormat("pt-BR");
const ORIGEM: Record<string, string> = { manual: "Manual", vistoria: "Vistoria", checkin: "Check-in", manutencao: "Manutenção" };

/** Ficha do veículo (RF-013). Contratos, manutenções e custos entram aqui conforme forem criados. */
export default async function FichaVeiculo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const [{ data: v }, { data: leituras }] = await Promise.all([
    supabase.from("veiculos").select("*").eq("id", id).eq("organizacao_id", organizacao.id).maybeSingle(),
    supabase.from("leituras_odometro").select("id, km, origem, lido_em").eq("veiculo_id", id).order("lido_em", { ascending: false }).order("criado_em", { ascending: false }).limit(20),
  ]);
  if (!v) notFound();
  const status = STATUS_VEICULO[v.status];

  return (
    <>
      <CabecalhoPagina
        voltar={{ href: "/painel/veiculos", rotulo: "Veículos" }}
        titulo={<span className="flex flex-wrap items-center gap-3">{v.modelo} <Selo tom={status.tom}>{status.rotulo}</Selo></span>}
        subtitulo={formatarPlaca(v.placa)}
        acao={v.status === "disponivel" ? <BotaoLink href={`/painel/motoristas/convidar?veiculo=${v.id}`} icone={UserPlus}>Convidar motorista</BotaoLink> : undefined}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Cartao className="lg:col-span-2">
          <p className="mb-2 font-semibold">Dados do veículo</p>
          <dl className="divide-y divide-borda">
            <DadoRotulado rotulo="Placa">{formatarPlaca(v.placa)}</DadoRotulado>
            <DadoRotulado rotulo="Ano">{v.ano_fabricacao && v.ano_modelo ? `${v.ano_fabricacao}/${v.ano_modelo}` : v.ano_modelo ?? "—"}</DadoRotulado>
            <DadoRotulado rotulo="Cor">{v.cor ?? "—"}</DadoRotulado>
            <DadoRotulado rotulo="Renavam">{v.renavam ?? "—"}</DadoRotulado>
          </dl>
          {v.status !== "alugado" && (
            <form action={mudarStatusVeiculo.bind(null, v.id)} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <select name="status" defaultValue={v.status} className={classeEntrada} aria-label="Situação do veículo">
                <option value="disponivel">Disponível</option>
                <option value="em_manutencao">Em manutenção</option>
                <option value="em_recuperacao">Em recuperação</option>
                <option value="vendido">Vendido</option>
              </select>
              <Botao variante="secundario">Mudar situação</Botao>
            </form>
          )}
        </Cartao>

        <Cartao>
          <div className="flex items-center gap-2 text-suave"><Gauge size={18} aria-hidden /> Odômetro</div>
          <p className="mt-1 text-3xl font-bold tracking-tight">{km.format(v.odometro_atual)} <span className="text-lg font-semibold text-suave">km</span></p>
          <form action={registrarKm.bind(null, v.id)} className="mt-4 flex gap-2">
            <input name="km" inputMode="numeric" placeholder="Novo km" aria-label="Novo km" className={classeEntrada} required />
            <Botao variante="secundario">Registrar</Botao>
          </form>
        </Cartao>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold">Histórico de km</h2>
      <Cartao className="p-0 sm:p-0">
        <ul className="divide-y divide-borda">
          {(leituras ?? []).map((l) => (
            <li key={l.id} className="grid grid-cols-3 px-4 py-3 text-sm sm:px-5">
              <span>{formatarData(data(l.lido_em))}</span>
              <span className="text-center font-semibold">{km.format(l.km)} km</span>
              <span className="text-right text-suave">{ORIGEM[l.origem] ?? l.origem}</span>
            </li>
          ))}
        </ul>
      </Cartao>
    </>
  );
}
