import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { AssistenteCopiloto } from "@/components/plantao/assistente";
import { configPlantao } from "@/lib/plantao";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Assistente do Copiloto" };

export default async function Assistente() {
  const usuario = await exigirUsuario("/m/plantao/assistente");
  const c = await configPlantao(usuario.id);
  return (
    <div>
      <CabecalhoMotorista titulo="Assistente do Copiloto" voltar="/m/plantao/semaforo" />
      <AssistenteCopiloto perfil={c.perfil} criterios={c.criterios} preferencias={c.preferencias} meta={c.meta} />
    </div>
  );
}
