import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { ListaGravacoes } from "@/components/plantao/gravacoes";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Gravações" };

/** Vídeos da câmera de segurança: ficam só no celular; a lista vem do app. */
export default async function Gravacoes() {
  await exigirUsuario("/m/plantao/gravacoes");
  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo="Gravações" voltar="/m/plantao/copiloto" />
      <ListaGravacoes />
    </div>
  );
}
