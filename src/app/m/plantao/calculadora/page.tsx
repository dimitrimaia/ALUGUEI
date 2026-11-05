import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { Calculadora } from "@/components/plantao/calculadora";
import { configPlantao } from "@/lib/plantao";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Calculadora do motorista" };

export default async function PaginaCalculadora({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const usuario = await exigirUsuario("/m/plantao/calculadora");
  const [c, { aba }] = await Promise.all([configPlantao(usuario.id), searchParams]);
  return (
    <div>
      <CabecalhoMotorista titulo="Calculadora" voltar="/m/plantao" />
      <Calculadora perfil={c.perfil} criterios={c.criterios} abaInicial={aba === "viagem" || aba === "combustivel" || aba === "entrega" || aba === "particular" ? aba : "corrida"} />
    </div>
  );
}
