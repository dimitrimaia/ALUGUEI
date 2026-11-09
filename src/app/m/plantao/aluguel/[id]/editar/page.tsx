import { notFound } from "next/navigation";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { EditorAluguel } from "@/components/plantao/aluguel";
import { aluguelExterno } from "@/lib/aluguel-externo";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Condições do aluguel" };

export default async function EditarAluguel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await exigirUsuario(`/m/plantao/aluguel/${id}/editar`);
  const a = await aluguelExterno(usuario.id, id);
  if (!a) notFound();
  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo="Condições e datas" voltar={`/m/plantao/aluguel/${id}`} />
      <EditorAluguel id={id} inicial={a} />
    </div>
  );
}
