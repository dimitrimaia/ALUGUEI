"use client";

import { Bell, Calculator, Camera, ClipboardCheck, FileText, Gauge, LifeBuoy, Link2, MessageCircle, Search, Navigation, Users, Wallet } from "lucide-react";
import { useConta } from "@/components/conta/contexto";
import { useMenu } from "@/components/menu-app";

/** Informa ao menu ☰ (que mora no layout raiz) as opções do modo motorista. */
export function RegistrarMenuMotorista() {
  const { perfil, naoLidas, locadora, notificacoes } = useConta();
  useMenu({
    modo: "motorista",
    locadora,
    inicio: "/m",
    conta: "/m/conta",
    perfil,
    secoes: [
      {
        titulo: "Trabalho",
        itens: [
          { href: "/m/plantao", rotulo: "Plantão", icone: Gauge, tambem: ["/m/plantao/ganho", "/m/plantao/despesa", "/m/plantao/custos", "/m/plantao/extrato", "/m/plantao/relatorios"] },
          { href: "/m/plantao/semaforo", rotulo: "Copiloto", icone: Navigation },
          { href: "/m/plantao/calculadora", rotulo: "Calculadora", icone: Calculator },
          { href: "/m/caronas", rotulo: "Caronas", icone: Users },
          { href: "/m/clientes", rotulo: "Meus clientes", icone: Link2 },
        ],
      },
      {
        titulo: "Meu aluguel",
        itens: [
          { href: "/m/checkin", rotulo: "Check-in semanal", icone: Camera },
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
      {
        titulo: "Ajuda",
        itens: [
          { href: "/m/avisos", rotulo: "Avisos", icone: Bell, contador: notificacoes },
          { href: "/m/suporte", rotulo: "Falar com o suporte", icone: LifeBuoy },
        ],
      },
    ],
  });
  return null;
}
