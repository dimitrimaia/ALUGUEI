"use client";

import { Car, ClipboardCheck, FileText, Menu, MessageCircle, Search, Wallet } from "lucide-react";
import { useState } from "react";
import { useConta } from "@/components/conta/contexto";
import { MenuApp } from "@/components/menu-app";

/** Botão ☰ do app do motorista, com o menu lateral. */
export function MenuMotorista({ claro = false }: { claro?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const { perfil, naoLidas } = useConta();
  return (
    <>
      <button
        onClick={() => setAberto(true)}
        aria-label="Abrir menu"
        aria-expanded={aberto}
        className={`relative grid size-10 place-items-center rounded-full ${claro ? "bg-white/10 text-white ring-1 ring-white/15" : "hover:bg-cartao-2"}`}
      >
        <Menu size={20} />
        {naoLidas > 0 && <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-[#ffb020] ring-2 ring-cartao" />}
      </button>
      <MenuApp
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        inicio="/m"
        conta="/m/conta"
        perfil={perfil}
        secoes={[
          {
            titulo: "Meu aluguel",
            itens: [
              { href: "/m/carros", rotulo: "Meus carros", icone: Car, tambem: ["/m/carro"] },
              { href: "/m/extrato", rotulo: "Pagamentos", icone: Wallet, tambem: ["/m/pagar"] },
              { href: "/m/meu-contrato", rotulo: "Contrato", icone: FileText, tambem: ["/m/contrato"] },
              { href: "/m/minha-vistoria", rotulo: "Vistoria do carro", icone: ClipboardCheck, tambem: ["/m/vistoria"] },
            ],
          },
          {
            titulo: "Encontrar carro",
            itens: [
              { href: "/m/buscar", rotulo: "Buscar carros", icone: Search },
              { href: "/m/conversas", rotulo: "Conversas", icone: MessageCircle, contador: naoLidas },
            ],
          },
        ]}
      />
    </>
  );
}
