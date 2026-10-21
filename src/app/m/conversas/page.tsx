import { MessageCircle, Search } from "lucide-react";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { ListaConversas } from "@/components/motorista/lista-conversas";
import { BotaoLink, Vazio } from "@/components/ui";
import { conversasDoMotorista } from "@/lib/conversas";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Conversas" };

export default async function ConversasMotorista() {
  const usuario = await exigirUsuario("/m/conversas");
  const lista = await conversasDoMotorista(usuario.id);

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo="Conversas" />
      {!lista.length ? (
        <Vazio icone={MessageCircle} titulo="Nenhuma conversa ainda" acao={<BotaoLink href="/m/buscar" icone={Search}>Buscar carros</BotaoLink>}>
          Encontre um carro na sua cidade e fale com o locador por aqui.
        </Vazio>
      ) : (
        <>
          <ListaConversas conversas={lista} />
          <BotaoLink href="/m/buscar" variante="secundario" icone={Search}>Buscar mais carros</BotaoLink>
        </>
      )}
    </div>
  );
}
