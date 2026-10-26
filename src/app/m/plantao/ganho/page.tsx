import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { FormGanho } from "@/components/plantao/formularios";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Lançar ganho" };

export default async function LancarGanho() {
  await exigirUsuario("/m/plantao/ganho");
  return (
    <div>
      <CabecalhoMotorista titulo="Lançar ganho" voltar="/m/plantao" />
      <FormGanho />
    </div>
  );
}
