import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { EditorAluguel } from "@/components/plantao/aluguel";
import { aluguelExterno } from "@/lib/aluguel-externo";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Condições do aluguel" };

export default async function EditarAluguel() {
  const usuario = await exigirUsuario("/m/plantao/aluguel/editar");
  const a = await aluguelExterno(usuario.id);
  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo={a ? "Condições do aluguel" : "Carro alugado fora do app"} voltar={a ? "/m/plantao/aluguel" : "/m/plantao"} />
      {!a && <p className="text-sm text-suave">Alugou de uma locadora que não usa o Aluguei? Copie as condições do contrato e o app avisa vistoria, pagamento, prazo, km do mês e troca de óleo, e já desconta o aluguel do seu lucro.</p>}
      <EditorAluguel inicial={a} aoSalvar="/m/plantao/aluguel" />
    </div>
  );
}
