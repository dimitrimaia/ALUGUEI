"use client";

import { Car, Home, MessageCircle, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { BarraInferior } from "@/components/app/barras";
import { useConta } from "@/components/conta/contexto";

/** Rodapé do modo motorista. A quinta posição é a Conta (com a troca de modo). */
export function AbasMotorista() {
  const caminho = usePathname();
  const { naoLidas } = useConta();
  if (caminho.startsWith("/m/cadastro") || /^\/m\/(conversas|suporte)\/./.test(caminho) || caminho.startsWith("/m/checkin")) return null;
  return (
    <BarraInferior
      abas={[
        { href: "/m", rotulo: "Início", icone: Home, ativo: (c) => c === "/m" },
        { href: "/m/buscar", rotulo: "Buscar", icone: Search, ativo: (c) => c.startsWith("/m/buscar") },
        { href: "/m/carros", rotulo: "Meus carros", icone: Car, ativo: (c) => /^\/m\/(carros?|contrato|vistoria|extrato|pagar)(\/|$)/.test(c) },
        { href: "/m/conversas", rotulo: "Conversas", icone: MessageCircle, ativo: (c) => c.startsWith("/m/conversas"), contador: naoLidas },
      ]}
    />
  );
}
