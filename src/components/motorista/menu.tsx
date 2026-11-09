"use client";

import { BriefcaseBusiness, Calculator, Camera, ClipboardCheck, FileText, Gauge, History, Home, KeyRound, LifeBuoy, Link2, MessageCircle, Search, Settings2, Users, Wallet } from "lucide-react";
import { useConta } from "@/components/conta/contexto";
import { type ItemMenu, useMenu } from "@/components/menu-app";

/** Opções do modo motorista: as mesmas no menu ☰ (celular) e na barra lateral (computador). */
export function secoesMotorista(naoLidas: number): { titulo: string; itens: ItemMenu[] }[] {
  return [
    {
      titulo: "Trabalho",
      itens: [
        { href: "/m/plantao", rotulo: "Plantão", icone: BriefcaseBusiness, tambem: ["/m/plantao/ganho", "/m/plantao/despesa", "/m/plantao/custos", "/m/plantao/extrato", "/m/plantao/relatorios", "/m/plantao/financas", "/m/plantao/fechar"] },
        { href: "/m/plantao/semaforo", rotulo: "Copiloto", icone: Gauge },
        { href: "/m/plantao/historico", rotulo: "Minhas corridas", icone: History, tambem: ["/m/plantao/horarios"] },
        { href: "/m/plantao/calculadora?aba=particular", rotulo: "Calculadora e corridas", icone: Calculator, tambem: ["/m/plantao/calculadora"] },
        { href: "/m/plantao/configuracoes", rotulo: "Ajustes do Copiloto", icone: Settings2, tambem: ["/m/plantao/regua", "/m/plantao/copiloto", "/m/plantao/gravacoes", "/m/plantao/assistente", "/m/plantao/ajuda"] },
        { href: "/m/caronas", rotulo: "Caronas", icone: Users },
        { href: "/m/clientes", rotulo: "Meus clientes", icone: Link2 },
      ],
    },
    {
      titulo: "Meu aluguel",
      itens: [
        { href: "/m/plantao/aluguel", rotulo: "Carro alugado", icone: KeyRound },
        { href: "/m/checkin", rotulo: "Check-in semanal", icone: Camera },
        { href: "/m/extrato", rotulo: "Pagamentos", icone: Wallet, tambem: ["/m/pagar"] },
        { href: "/m/meu-contrato", rotulo: "Contrato", icone: FileText, tambem: ["/m/contrato"] },
        { href: "/m/minha-vistoria", rotulo: "Vistoria do carro", icone: ClipboardCheck, tambem: ["/m/vistoria"] },
      ],
    },
    {
      titulo: "Encontrar carro",
      itens: [
        { href: "/m/buscar", rotulo: "Buscar carros", icone: Search, tambem: ["/m/carros", "/m/carro"] },
        { href: "/m/conversas", rotulo: "Conversas", icone: MessageCircle, contador: naoLidas },
      ],
    },
  ];
}

export const INICIO_MOTORISTA: ItemMenu = { href: "/m", rotulo: "Início", icone: Home };

/** Informa ao menu ☰ (que mora no layout raiz) as opções do modo motorista. */
export function RegistrarMenuMotorista() {
  const { perfil, naoLidas, locadora } = useConta();
  useMenu({
    modo: "motorista",
    locadora,
    inicio: "/m",
    conta: "/m/conta",
    perfil,
    secoes: [
      ...secoesMotorista(naoLidas),
      { titulo: "Ajuda", itens: [{ href: "/m/suporte", rotulo: "Falar com o suporte", icone: LifeBuoy }] },
    ],
  });
  return null;
}
