import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { FormDespesa } from "@/components/plantao/formularios";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Lançar despesa" };

export default async function LancarDespesa() {
  await exigirUsuario("/m/plantao/despesa");
  return (
    <div>
      <CabecalhoMotorista titulo="Lançar despesa" voltar="/m/plantao" />
      <FormDespesa />
    </div>
  );
}
