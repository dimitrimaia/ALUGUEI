"use client";

import { BriefcaseBusiness, Calculator, Car, Gauge, History, Home, LoaderCircle, Power, Receipt, Settings2, Square, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { avisar } from "@/components/toast";
import { ACEITE_COPILOTO, plantaoNativo } from "@/lib/nativo";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarraInferior, BotaoCentral } from "@/components/app/barras";
import { type Acao, BarraLateral, FolhaAcoes, TopoDesktop } from "@/components/app/casca-desktop";
import { useConta } from "@/components/conta/contexto";
import { INICIO_MOTORISTA, secoesMotorista } from "./menu";

/** O que o botão do meio (Copiloto) oferece: igual no celular e no computador. */
const ACOES_COPILOTO: readonly Acao[] = [
  { href: "/m/plantao/semaforo", rotulo: "Tela do Copiloto", detalhe: "Permissões, testar oferta e como funciona", icone: Gauge },
  { href: "/m/plantao/ganho", rotulo: "Lançar ganho", detalhe: "Corrida, entrega ou gorjeta", icone: TrendingUp },
  { href: "/m/plantao/despesa", rotulo: "Lançar gasto", detalhe: "Combustível, lavagem, manutenção", icone: Receipt },
  { href: "/m/plantao/calculadora?aba=particular", rotulo: "Calcular uma corrida", detalhe: "Particular, viagem ou entrega", icone: Calculator },
  { href: "/m/plantao/historico", rotulo: "Minhas corridas", detalhe: "Corrigir o que fez e o que não fez", icone: History },
  { href: "/m/plantao/configuracoes", rotulo: "Ajustes do Copiloto", detalhe: "Régua, cartão, base e câmera", icone: Settings2 },
];

/**
 * Atalho para ligar ou desligar o Copiloto sem passar pela tela de ativação.
 * Só no app Android. Se falta o aceite ou uma permissão obrigatória, leva para a ativação.
 */
function LigarCopiloto({ aoUsar }: { aoUsar?: () => void }) {
  const router = useRouter();
  const [ligado, setLigado] = useState<boolean | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const ler = useCallback(async () => {
    const p = plantaoNativo();
    if (!p) return setLigado(null);
    try {
      setLigado((await p.estado()).ligado);
    } catch {
      setLigado(null);
    }
  }, []);
  useEffect(() => void ler(), [ler]);
  if (ligado === null) return null;

  async function alternar() {
    const p = plantaoNativo();
    if (!p) return;
    setOcupado(true);
    try {
      const est = await p.estado();
      let aceito = false;
      try { aceito = localStorage.getItem(ACEITE_COPILOTO) === "1"; } catch {}
      if (est.ligado) {
        await p.desligar();
        avisar("Copiloto desligado");
      } else if (!aceito || !est.sobreposicao || !est.notificacoes) {
        aoUsar?.();
        router.push("/m/plantao/semaforo");
      } else {
        await p.ligar();
        avisar("Copiloto ligado: abra o app de corrida");
      }
    } catch {
      aoUsar?.();
      router.push("/m/plantao/semaforo");
    }
    await ler();
    setOcupado(false);
  }

  return (
    <button type="button" onClick={alternar} disabled={ocupado} className={`mb-2 flex w-full items-center gap-4 rounded-2xl p-3.5 text-left text-white shadow-marca ${ligado ? "bg-[#0b2a6b]" : "bg-gradient-to-br from-[#3b74ff] to-[#1641b8]"}`}>
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/15">{ocupado ? <LoaderCircle size={21} className="animate-spin" /> : ligado ? <Square size={19} /> : <Power size={21} />}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{ligado ? "Desligar o Copiloto" : "Ligar o Copiloto"}</span>
        <span className="block text-sm text-white/75">{ligado ? "A bolha está ativa por cima dos apps" : "A bolha aparece por cima dos apps de corrida"}</span>
      </span>
      {ligado && <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[0.7rem] font-semibold"><span className="size-1.5 rounded-full bg-[#4ade80]" /> Ligado</span>}
    </button>
  );
}

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
      <TopoDesktop conta="/m/conta" acao={{ rotulo: "Copiloto", icone: Gauge, acoes: ACOES_COPILOTO, extra: <LigarCopiloto /> }} />
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
      <FolhaAcoes aberta={aberta} aoFechar={() => setAberta(false)} titulo="Copiloto" acoes={ACOES_COPILOTO} extra={<LigarCopiloto aoUsar={() => setAberta(false)} />} />
    </>
  );
}
