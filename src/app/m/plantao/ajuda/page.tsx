import { LifeBuoy } from "lucide-react";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { Ajuda } from "@/components/plantao/ajuda";
import { BotaoLink } from "@/components/ui";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Ajuda do Plantão e do Copiloto" };

export default async function PaginaAjuda() {
  await exigirUsuario("/m/plantao/ajuda");
  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo="Ajuda" voltar="/m/plantao" />
      <Ajuda />
      <BotaoLink href="/m/suporte" variante="secundario" icone={LifeBuoy}>Falar com o suporte</BotaoLink>
    </div>
  );
}
