import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { EditorCustos } from "@/components/plantao/editor-custos";
import { configPlantao } from "@/lib/plantao";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Custos do carro" };

export default async function Custos() {
  const usuario = await exigirUsuario("/m/plantao/custos");
  const c = await configPlantao(usuario.id);
  return (
    <div>
      <CabecalhoMotorista titulo="Custos do carro" voltar="/m/plantao" />
      <EditorCustos inicial={c.perfil} metaInicial={c.meta} aluguelSemanal={c.aluguelSemanal} />
    </div>
  );
}
