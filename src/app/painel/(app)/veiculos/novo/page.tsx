import { Cartao, Titulo } from "@/components/ui";
import { FormularioVeiculo } from "./formulario";

export default function NovoVeiculo() {
  return (
    <>
      <Titulo>Novo veículo</Titulo>
      <Cartao className="max-w-xl">
        <FormularioVeiculo />
      </Cartao>
    </>
  );
}
