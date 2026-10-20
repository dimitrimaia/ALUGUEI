import { Cartao, Suave, Titulo } from "@/components/ui";
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
    <>
      <Titulo>Convidar motorista</Titulo>
      <Suave className="mb-4">
        O motorista recebe um link, vê o carro e as condições, e faz o cadastro pelo celular.
      </Suave>
      <Cartao className="max-w-xl">
        <FormularioConvite veiculos={veiculos} veiculoInicial={veiculo} />
      </Cartao>
    </>
  );
}
