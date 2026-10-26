import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { AjustesCopiloto } from "@/components/plantao/ajustes-copiloto";
import { SincronizarPlantao } from "@/components/plantao/sincronizar";
import { configPlantao } from "@/lib/plantao";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Ajustes do Copiloto" };

export default async function Ajustes() {
  const usuario = await exigirUsuario("/m/plantao/copiloto");
  const c = await configPlantao(usuario.id);
  return (
    <div>
      <CabecalhoMotorista titulo="Ajustes do Copiloto" voltar="/m/plantao/semaforo" />
      <SincronizarPlantao perfil={c.perfil} criterios={c.criterios} preferencias={c.preferencias} />
      <AjustesCopiloto inicial={c.preferencias} />
    </div>
  );
}
