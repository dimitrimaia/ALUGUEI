import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { FormOferecer } from "@/components/caronas/formularios";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Oferecer carona" };

export default async function Oferecer() {
  await exigirUsuario("/m/caronas/oferecer");
  return (
    <div>
      <CabecalhoMotorista titulo="Oferecer carona" voltar="/m/caronas" />
      <FormOferecer />
    </div>
  );
}
