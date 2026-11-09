"use client";

import { BriefcaseBusiness, Calculator, Car, Gauge, History, Home, Receipt, Settings2, TrendingUp } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarraInferior, BotaoCentral } from "@/components/app/barras";
import { type Acao, BarraLateral, FolhaAcoes, TopoDesktop } from "@/components/app/casca-desktop";
import { useConta } from "@/components/conta/contexto";
import { INICIO_MOTORISTA, secoesMotorista } from "./menu";

/** O que o botão do meio (Copiloto) oferece: igual no celular e no computador. */
const ACOES_COPILOTO: readonly Acao[] = [
  { href: "/m/plantao/semaforo", rotulo: "Abrir o Copiloto", detalhe: "Ligar a bolha e ver se a corrida compensa", icone: Gauge },
  { href: "/m/plantao/ganho", rotulo: "Lançar ganho", detalhe: "Corrida, entrega ou gorjeta", icone: TrendingUp },
  { href: "/m/plantao/despesa", rotulo: "Lançar gasto", detalhe: "Combustível, lavagem, manutenção", icone: Receipt },
  { href: "/m/plantao/calculadora?aba=particular", rotulo: "Calcular uma corrida", detalhe: "Particular, viagem ou entrega", icone: Calculator },
  { href: "/m/plantao/historico", rotulo: "Minhas corridas", detalhe: "Corrigir o que fez e o que não fez", icone: History },
  { href: "/m/plantao/configuracoes", rotulo: "Ajustes do Copiloto", detalhe: "Régua, cartão, base e câmera", icone: Settings2 },
];

/** Navegação do modo motorista: lateral e barra de cima no computador, rodapé com o Copiloto no meio no celular. */
export function NavegacaoMotorista() {
  const caminho = usePathname();
  const { naoLidas, perfil } = useConta();
  const [aberta, setAberta] = useState(false);
  const cheia = caminho.startsWith("/m/cadastro") || /^\/m\/(conversas|suporte)\/./.test(caminho) || caminho.startsWith("/m/checkin");
  return (
    <>
      <BarraLateral
        inicio="/m"
        conta="/m/conta"
        detalhe={perfil.detalhe || "Motorista"}
        secoes={[{ titulo: "", itens: [INICIO_MOTORISTA] }, ...secoesMotorista(naoLidas)]}
      />
      <TopoDesktop conta="/m/conta" acao={{ rotulo: "Copiloto", icone: Gauge, acoes: ACOES_COPILOTO }} />
      {!cheia && (
        <BarraInferior
          abas={[
            { href: "/m", rotulo: "Início", icone: Home, ativo: (c) => c === "/m" },
            { href: "/m/plantao", rotulo: "Plantão", icone: BriefcaseBusiness, ativo: (c) => /^\/m\/(plantao|caronas|clientes)(\/|$)/.test(c) && !c.startsWith("/m/plantao/semaforo") },
            { href: "/m/carros", rotulo: "Carros", icone: Car, ativo: (c) => /^\/m\/(carros?|buscar|contrato|meu-contrato|vistoria|minha-vistoria|extrato|pagar)(\/|$)/.test(c) },
          ]}
          central={<BotaoCentral aoTocar={() => setAberta(true)} icone={Gauge} rotulo="Copiloto" ativo={caminho.startsWith("/m/plantao/semaforo")} />}
        />
      )}
      <FolhaAcoes aberta={aberta} aoFechar={() => setAberta(false)} titulo="Copiloto" acoes={ACOES_COPILOTO} />
    </>
  );
}
