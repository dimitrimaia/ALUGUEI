import { ListaAvisos } from "@/components/avisos";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Avisos" };

export default async function AvisosMotorista() {
  const usuario = await exigirUsuario("/m/avisos");
  return (
    <>
      <CabecalhoMotorista titulo="Avisos" />
      <ListaAvisos usuarioId={usuario.id} />
    </>
  );
}
