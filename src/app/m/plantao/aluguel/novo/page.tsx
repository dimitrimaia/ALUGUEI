import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { EditorAluguel } from "@/components/plantao/aluguel";
import { alugueisExternos } from "@/lib/aluguel-externo";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Cadastrar carro alugado" };

export default async function NovoAluguel() {
  const usuario = await exigirUsuario("/m/plantao/aluguel/novo");
  const emUso = (await alugueisExternos(usuario.id)).find((a) => !a.devolucao);
  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo="Cadastrar carro alugado" voltar="/m/plantao/aluguel" />
      <p className="text-sm text-suave">Alugou de uma locadora que não usa o Aluguei? Copie as condições do contrato e o app avisa vistoria, pagamento, prazo, km do mês e troca de óleo, e já desconta o aluguel do seu lucro.</p>
      {emUso && <p className="rounded-xl bg-alerta-suave p-3 text-sm">Ao cadastrar, o <strong>{emUso.modelo || "carro"}</strong> da {emUso.locadora} fica como devolvido hoje. Dá para mudar a data depois.</p>}
      <EditorAluguel inicial={null} />
    </div>
  );
}
