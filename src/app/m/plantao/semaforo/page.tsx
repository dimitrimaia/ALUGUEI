import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { AtivarSemaforo } from "@/components/plantao/ativar-semaforo";
import { SincronizarPlantao } from "@/components/plantao/sincronizar";
import { configPlantao } from "@/lib/plantao";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Copiloto" };

export default async function Semaforo() {
  const usuario = await exigirUsuario("/m/plantao/semaforo");
  const c = await configPlantao(usuario.id);
  return (
    <div>
      <CabecalhoMotorista titulo="Copiloto" voltar="/m/plantao" />
      <SincronizarPlantao perfil={c.perfil} criterios={c.criterios} />
      <AtivarSemaforo />
    </div>
  );
}
