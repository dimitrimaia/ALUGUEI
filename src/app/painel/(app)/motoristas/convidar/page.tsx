import { CabecalhoPagina, Cartao } from "@/components/ui";
import { formatarPlaca } from "@/dominio/cadastro/documentos";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { FormularioConvite } from "./formulario";

export default async function Convidar({ searchParams }: { searchParams: Promise<{ veiculo?: string }> }) {
  const { veiculo } = await searchParams;
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const { data } = await supabase
    .from("veiculos")
    .select("id, placa, modelo")
    .eq("organizacao_id", organizacao.id)
    .eq("status", "disponivel")
    .order("modelo");

  const veiculos = (data ?? []).map((v) => ({ id: v.id, rotulo: `${formatarPlaca(v.placa)} · ${v.modelo}` }));

  return (
    <div className="max-w-2xl">
      <CabecalhoPagina
        voltar={{ href: "/painel/motoristas", rotulo: "Motoristas" }}
        titulo="Convidar motorista"
        subtitulo="Ele recebe um link, vê o carro e as condições e faz o cadastro pelo celular."
      />
      <Cartao>
        <FormularioConvite veiculos={veiculos} veiculoInicial={veiculo} />
      </Cartao>
    </div>
  );
}
