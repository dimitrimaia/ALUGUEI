import { CabecalhoPagina, Cartao } from "@/components/ui";
import { FormularioVeiculo } from "./formulario";

export default function NovoVeiculo() {
  return (
    <div className="max-w-2xl">
      <CabecalhoPagina titulo="Novo veículo" voltar={{ href: "/painel/veiculos", rotulo: "Veículos" }} />
      <Cartao>
        <FormularioVeiculo />
      </Cartao>
    </div>
  );
}
