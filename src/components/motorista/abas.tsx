"use client";

import { Car, Gauge, Home, MessageCircle } from "lucide-react";
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
        { href: "/m/plantao", rotulo: "Plantão", icone: Gauge, ativo: (c) => /^\/m\/(plantao|caronas|clientes)(\/|$)/.test(c) },
        { href: "/m/carros", rotulo: "Carros", icone: Car, ativo: (c) => /^\/m\/(carros?|buscar|contrato|vistoria|extrato|pagar)(\/|$)/.test(c) },
        { href: "/m/conversas", rotulo: "Conversas", icone: MessageCircle, ativo: (c) => c.startsWith("/m/conversas"), contador: naoLidas },
      ]}
    />
  );
}
