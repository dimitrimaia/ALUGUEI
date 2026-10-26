"use client";

import { BarChart3, Bell, Calculator, Camera, Car, ClipboardCheck, FileText, Gauge, LifeBuoy, Link2, MessageCircle, Search, Users, Wallet } from "lucide-react";
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
          { href: "/m/plantao", rotulo: "Plantão", icone: Gauge, tambem: ["/m/plantao/ganho", "/m/plantao/despesa", "/m/plantao/custos"] },
          { href: "/m/plantao/calculadora", rotulo: "Calculadora", icone: Calculator },
          { href: "/m/plantao/semaforo", rotulo: "Semáforo de corridas", icone: Gauge },
          { href: "/m/plantao/relatorios", rotulo: "Relatórios", icone: BarChart3 },
          { href: "/m/caronas", rotulo: "Caronas", icone: Users },
          { href: "/m/clientes", rotulo: "Meus clientes", icone: Link2 },
        ],
      },
      {
        titulo: "Meu aluguel",
        itens: [
          { href: "/m/carros", rotulo: "Meus carros", icone: Car, tambem: ["/m/carro"] },
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
