import Link from "next/link";
import { BotaoLink, Cartao, Selo, Suave, Titulo, Vazio } from "@/components/ui";
import { formatarPlaca } from "@/dominio/cadastro/documentos";
import { exigirEquipe } from "@/lib/sessao";
import { STATUS_VEICULO } from "@/lib/rotulos";
import { supabaseServidor } from "@/lib/supabase/servidor";

const km = new Intl.NumberFormat("pt-BR");

export default async function Veiculos() {
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const { data: veiculos } = await supabase
    .from("veiculos")
    .select("id, placa, modelo, ano_modelo, cor, odometro_atual, status")
    .eq("organizacao_id", organizacao.id)
    .order("criado_em", { ascending: false });

  return (
    <>
      <Titulo acao={<BotaoLink href="/painel/veiculos/novo">Novo veículo</BotaoLink>}>Veículos</Titulo>
      {!veiculos?.length ? (
        <Vazio>Nenhum veículo cadastrado ainda.</Vazio>
      ) : (
        <ul className="grid gap-3">
          {veiculos.map((v) => (
            <li key={v.id}>
              <Link href={`/painel/veiculos/${v.id}`}>
                <Cartao className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{formatarPlaca(v.placa)} · {v.modelo}</p>
                    <Suave>{[v.ano_modelo, v.cor, `${km.format(v.odometro_atual)} km`].filter(Boolean).join(" · ")}</Suave>
                  </div>
                  <Selo tom={STATUS_VEICULO[v.status].tom}>{STATUS_VEICULO[v.status].rotulo}</Selo>
                </Cartao>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
