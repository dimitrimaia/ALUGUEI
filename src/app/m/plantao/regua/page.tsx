import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { EditorRegua } from "@/components/plantao/editor-regua";
import { SincronizarPlantao } from "@/components/plantao/sincronizar";
import { configPlantao } from "@/lib/plantao";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Régua do Copiloto" };

export default async function Regua() {
  const usuario = await exigirUsuario("/m/plantao/regua");
  const c = await configPlantao(usuario.id);
  return (
    <div>
      <CabecalhoMotorista titulo="Régua do Copiloto" voltar="/m/plantao/semaforo" />
      <SincronizarPlantao perfil={c.perfil} criterios={c.criterios} preferencias={c.preferencias} />
      <EditorRegua inicial={c.criterios} />
    </div>
  );
}
