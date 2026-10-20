import { notFound } from "next/navigation";
import { Botao, BotaoLink, Cartao, Selo, Suave, Titulo, classeEntrada } from "@/components/ui";
import { formatarPlaca } from "@/dominio/cadastro/documentos";
import { data, formatarData } from "@/dominio/datas/data";
import { exigirEquipe } from "@/lib/sessao";
import { STATUS_VEICULO } from "@/lib/rotulos";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { mudarStatusVeiculo, registrarKm } from "../acoes";

const km = new Intl.NumberFormat("pt-BR");

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
      <Titulo
        acao={v.status === "disponivel" ? <BotaoLink href={`/painel/motoristas/convidar?veiculo=${v.id}`}>Convidar motorista</BotaoLink> : undefined}
      >
        {formatarPlaca(v.placa)} · {v.modelo}
      </Titulo>

      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="font-medium">Situação</p>
            <Selo tom={status.tom}>{status.rotulo}</Selo>
          </div>
          <Suave>
            {[v.ano_fabricacao && v.ano_modelo ? `${v.ano_fabricacao}/${v.ano_modelo}` : null, v.cor, v.renavam ? `Renavam ${v.renavam}` : null]
              .filter(Boolean)
              .join(" · ") || "Sem dados adicionais"}
          </Suave>
          {v.status !== "alugado" && (
            <form action={mudarStatusVeiculo.bind(null, v.id)} className="mt-2 flex gap-2">
              <select name="status" defaultValue={v.status} className={classeEntrada}>
                <option value="disponivel">Disponível</option>
                <option value="em_manutencao">Em manutenção</option>
                <option value="em_recuperacao">Em recuperação</option>
                <option value="vendido">Vendido</option>
              </select>
              <Botao variante="secundario">Mudar</Botao>
            </form>
          )}
        </Cartao>

        <Cartao className="flex flex-col gap-2">
          <p className="font-medium">Odômetro</p>
          <p className="text-3xl font-semibold">{km.format(v.odometro_atual)} km</p>
          <form action={registrarKm.bind(null, v.id)} className="mt-2 flex gap-2">
            <input name="km" inputMode="numeric" placeholder="Novo km" className={classeEntrada} min={v.odometro_atual} required />
            <Botao variante="secundario">Registrar</Botao>
          </form>
        </Cartao>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold">Histórico de km</h2>
      <Cartao>
        <ul className="divide-y divide-[var(--borda)]">
          {(leituras ?? []).map((l) => (
            <li key={l.id} className="flex justify-between py-2 text-sm">
              <span>{formatarData(data(l.lido_em))}</span>
              <span>{km.format(l.km)} km</span>
              <span style={{ color: "var(--suave)" }}>{l.origem}</span>
            </li>
          ))}
        </ul>
      </Cartao>
    </>
  );
}
