import { Car, Plus } from "lucide-react";
import { BotaoLink, CabecalhoPagina, ItemLista, Lista, Selo, Vazio } from "@/components/ui";
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
      <CabecalhoPagina
        titulo="Veículos"
        subtitulo={veiculos?.length ? `${veiculos.length} na frota` : undefined}
        acao={<BotaoLink href="/painel/veiculos/novo" icone={Plus}>Novo veículo</BotaoLink>}
      />
      {!veiculos?.length ? (
        <Vazio icone={Car} titulo="Nenhum veículo ainda" acao={<BotaoLink href="/painel/veiculos/novo" icone={Plus}>Cadastrar veículo</BotaoLink>}>
          Cadastre o carro com placa e km atual. Depois é só convidar o motorista.
        </Vazio>
      ) : (
        <Lista>
          {veiculos.map((v) => (
            <ItemLista
              key={v.id}
              href={`/painel/veiculos/${v.id}`}
              icone={Car}
              titulo={`${formatarPlaca(v.placa)} · ${v.modelo}`}
              detalhe={[v.ano_modelo, v.cor, `${km.format(v.odometro_atual)} km`].filter(Boolean).join(" · ")}
              lateral={<Selo tom={STATUS_VEICULO[v.status].tom}>{STATUS_VEICULO[v.status].rotulo}</Selo>}
            />
          ))}
        </Lista>
      )}
    </>
  );
}
