"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { avisar } from "@/components/toast";
import { Botao, Cartao } from "@/components/ui";
import type { PreferenciasCopiloto } from "@/dominio/ganhos/copiloto";
import { COMBUSTIVEIS, type Combustivel, type Criterios, type PerfilCusto, UNIDADE_COMBUSTIVEL } from "@/dominio/ganhos/custos";
import { salvarCustos, salvarPreferenciasCopiloto, salvarReguaCompleta } from "@/lib/acoes-plantao";
import { acaoSegura } from "@/lib/versao";
import { AtivarSemaforo } from "./ativar-semaforo";
import { EntradaNumero, EntradaReais, Rotulo } from "./entradas";

const NOME_COMBUSTIVEL: Record<Combustivel, string> = { gasolina: "Gasolina", etanol: "Etanol", gnv: "GNV", diesel: "Diesel", eletrico: "Elétrico" };

/** Botões de escolha; o atual vem marcado e o padrão tem o selo "padrão". */
function Opcoes<T extends string | number | boolean>({ valor, padrao, opcoes, aoMudar }: { valor: T; padrao: T; opcoes: { v: T; rotulo: string; detalhe?: string }[]; aoMudar: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {opcoes.map((o) => (
        <button key={String(o.v)} type="button" aria-pressed={valor === o.v} onClick={() => aoMudar(o.v)} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${valor === o.v ? "border-marca bg-marca-suave" : "border-borda bg-cartao"}`}>
          <span className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${valor === o.v ? "border-marca bg-marca text-white" : "border-borda-forte"}`}>{valor === o.v && <Check size={12} strokeWidth={3} />}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm font-semibold">{o.rotulo}{o.v === padrao && <span className="rounded-full bg-cartao-2 px-1.5 text-[0.65rem] font-bold text-suave">padrão</span>}</span>
            {o.detalhe && <span className="block text-xs text-suave">{o.detalhe}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

const SIM_NAO = (sim: string, nao: string) => [{ v: true, rotulo: "Sim", detalhe: sim }, { v: false, rotulo: "Não", detalhe: nao }];

/**
 * Assistente do Copiloto: explica e configura tudo em passos curtos. Cada opção
 * já vem com o que está valendo (o padrão, na primeira vez) e o selo "padrão".
 * Só grava no fim ("Concluir"); dá para voltar e pular.
 */
export function AssistenteCopiloto({ perfil: perfilInicial, criterios: criteriosIniciais, preferencias: prefsIniciais, meta }: { perfil: PerfilCusto; criterios: Criterios; preferencias: PreferenciasCopiloto; meta: number }) {
  const router = useRouter();
  const [passo, setPasso] = useState(0);
  const [perfil, setPerfil] = useState(perfilInicial);
  const [criterios, setCriterios] = useState(criteriosIniciais);
  const [prefs, setPrefs] = useState(prefsIniciais);
  const [salvando, iniciar] = useTransition();
  const p = (x: Partial<PreferenciasCopiloto>) => setPrefs((a) => ({ ...a, ...x }));
  const c = (x: Partial<Criterios>) => setCriterios((a) => ({ ...a, ...x }));

  const passos: { titulo: string; texto: string; corpo: React.ReactNode }[] = [
    {
      titulo: "Bem-vindo ao Copiloto",
      texto: "Ele lê as ofertas do inDrive, da Uber e da 99 e mostra, em um segundo, se a corrida vale a pena: R$ por km, R$ por hora e o lucro de verdade, já tirando combustível, desgaste e aluguel. Ele só lê a tela; quem aceita é sempre você.",
      corpo: (
        <ul className="flex flex-col gap-2 text-sm">
          <li>🟢 <strong>Verde</strong>: passa da sua régua. Pode aceitar.</li>
          <li>🟡 <strong>Amarelo</strong>: no limite. Vale olhar o destino.</li>
          <li>🔴 <strong>Vermelho</strong>: não compensa. O lápis sugere quanto pedir.</li>
        </ul>
      ),
    },
    {
      titulo: "Permissões",
      texto: "O Android pede três autorizações: mostrar a bolha por cima dos apps, ler a tela do app de corrida e mandar notificações. Toque em cada uma e volte para cá.",
      corpo: <AtivarSemaforo />,
    },
    {
      titulo: "Seu carro",
      texto: "Para calcular o lucro real. Dá para detalhar depois em Custos do carro.",
      corpo: (
        <div className="flex flex-col gap-3">
          <Rotulo texto="Combustível">
            <div className="grid grid-cols-3 gap-1">
              {COMBUSTIVEIS.map((k) => (
                <button key={k} type="button" aria-pressed={perfil.combustivel === k} onClick={() => setPerfil((a) => ({ ...a, combustivel: k }))} className={`h-10 rounded-xl text-xs font-semibold ${perfil.combustivel === k ? "bg-marca text-white" : "bg-cartao-2 text-suave"}`}>{NOME_COMBUSTIVEL[k]}</button>
              ))}
            </div>
          </Rotulo>
          <div className="grid grid-cols-2 gap-2">
            <Rotulo texto="Consumo"><EntradaNumero rotulo="Consumo" valor={perfil.consumo} sufixo={UNIDADE_COMBUSTIVEL[perfil.combustivel].consumo} aoMudar={(v) => v && setPerfil((a) => ({ ...a, consumo: v }))} /></Rotulo>
            <Rotulo texto={`Preço por ${UNIDADE_COMBUSTIVEL[perfil.combustivel].unidade}`}><EntradaReais rotulo="Preço do combustível" valor={perfil.precoCombustivel} aoMudar={(v) => v && setPerfil((a) => ({ ...a, precoCombustivel: v }))} /></Rotulo>
          </div>
        </div>
      ),
    },
    {
      titulo: "O que é corrida boa",
      texto: "Sua régua: abaixo disso o cartão fica vermelho. Dá para criar perfis (Dia, Noite, Aeroporto) depois, na Régua.",
      corpo: (
        <div className="grid grid-cols-2 gap-2">
          <Rotulo texto="Mínimo por km" dica="Padrão: R$ 2,00"><EntradaReais rotulo="Mínimo por km" valor={criterios.minimoPorKm} aoMudar={(v) => c({ minimoPorKm: v ?? 0 })} /></Rotulo>
          <Rotulo texto="Mínimo por hora" dica="Padrão: R$ 40"><EntradaReais rotulo="Mínimo por hora" valor={criterios.minimoPorHora} aoMudar={(v) => c({ minimoPorHora: v ?? 0 })} /></Rotulo>
        </div>
      ),
    },
    {
      titulo: "Volta para casa",
      texto: "Corrida que te leva para longe custa a volta. O Copiloto pode descontar o combustível da volta do lucro (dá para ligar e desligar no próprio cartão).",
      corpo: <Opcoes valor={criterios.contarVolta} padrao={false} opcoes={SIM_NAO("Desconta a volta do lucro e avisa quando a corrida não paga a volta.", "Conta só a ida; a volta aparece só como informação.")} aoMudar={(v) => c({ contarVolta: v })} />,
    },
    {
      titulo: "Jeito do cartão",
      texto: "Como a oferta aparece por cima do app de corrida.",
      corpo: (
        <Opcoes
          valor={prefs.estiloCartao}
          padrao="completo"
          opcoes={[
            { v: "completo", rotulo: "Cartão", detalhe: "Resumo no topo, com Detalhes para abrir." },
            { v: "bordas", rotulo: "Peças na borda", detalhe: "Mais discreto: só o essencial na lateral da tela." },
          ]}
          aoMudar={(v) => p({ estiloCartao: v })}
        />
      ),
    },
    {
      titulo: "Bolha e letra",
      texto: "A bolha fica por cima dos apps. Mais transparente atrapalha menos o mapa.",
      corpo: (
        <div className="flex flex-col gap-4">
          <Rotulo texto={`Transparência da bolha: ${100 - prefs.opacidadeBolha}%`} dica="Padrão: sem transparência">
            <input type="range" min={30} max={100} step={10} value={prefs.opacidadeBolha} onChange={(e) => p({ opacidadeBolha: Number(e.target.value) })} className="w-full accent-[var(--marca)]" aria-label="Opacidade da bolha" />
          </Rotulo>
          <Rotulo texto="Tamanho da letra no cartão">
            <Opcoes valor={prefs.tamanhoFonte} padrao="m" opcoes={[{ v: "p", rotulo: "Pequena" }, { v: "m", rotulo: "Média" }, { v: "g", rotulo: "Grande" }]} aoMudar={(v) => p({ tamanhoFonte: v })} />
          </Rotulo>
        </div>
      ),
    },
    {
      titulo: "Narrador",
      texto: "O Copiloto pode falar o resultado: “Verde. Dois reais e dez por quilômetro.” Assim você não tira o olho da rua.",
      corpo: <Opcoes valor={prefs.voz} padrao={false} opcoes={SIM_NAO("Fala o sinal e o R$ por km de cada oferta.", "Só mostra na tela.")} aoMudar={(v) => p({ voz: v })} />,
    },
    {
      titulo: "Avisos",
      texto: "Escolha o que mais ajuda no seu dia.",
      corpo: (
        <div className="flex flex-col gap-4">
          <Rotulo texto="Vibrar"><Opcoes valor={prefs.vibrar} padrao opcoes={SIM_NAO("Um toque no verde, dois no vermelho.", "Sem vibração.")} aoMudar={(v) => p({ vibrar: v })} /></Rotulo>
          <Rotulo texto="Bip na corrida boa"><Opcoes valor={prefs.bip} padrao={false} opcoes={SIM_NAO("Um bip curto quando a oferta é verde.", "Silencioso.")} aoMudar={(v) => p({ bip: v })} /></Rotulo>
          <Rotulo texto="Perguntar se aceitou"><Opcoes valor={prefs.perguntarAceite} padrao opcoes={SIM_NAO("Quando a oferta some sem você responder. Deixa o histórico certo.", "Não pergunta.")} aoMudar={(v) => p({ perguntarAceite: v })} /></Rotulo>
          <Rotulo texto="Modo economia"><Opcoes valor={prefs.economia} padrao opcoes={SIM_NAO("O leitor dorme com o app de corrida offline: menos bateria.", "Sempre lendo.")} aoMudar={(v) => p({ economia: v })} /></Rotulo>
        </div>
      ),
    },
    {
      titulo: "Tudo pronto",
      texto: "Toque em Concluir para salvar. Dá para mudar qualquer coisa depois em Configurações do Copiloto, ou rodar este assistente de novo.",
      corpo: (
        <ul className="flex flex-col gap-1.5 text-sm">
          <li>Régua: {(criterios.minimoPorKm / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/km e {(criterios.minimoPorHora / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/h</li>
          <li>Volta para casa: {criterios.contarVolta ? "conta no lucro" : "não conta"}</li>
          <li>Cartão: {prefs.estiloCartao === "bordas" ? "peças na borda" : "cartão"} · letra {({ p: "pequena", m: "média", g: "grande" } as const)[prefs.tamanhoFonte]}</li>
          <li>Narrador: {prefs.voz ? "ligado" : "desligado"} · vibrar: {prefs.vibrar ? "sim" : "não"}</li>
        </ul>
      ),
    },
  ];
  const atual = passos[passo]!;
  const ultimo = passo === passos.length - 1;

  function concluir() {
    iniciar(async () => {
      const r = await acaoSegura(async () => {
        const a = await salvarCustos({ perfil, meta });
        if (a.erro) return a;
        const b = await salvarReguaCompleta(criterios);
        if (b.erro) return b;
        return salvarPreferenciasCopiloto(prefs);
      });
      if ("erro" in r && r.erro) return avisar(r.erro, "erro");
      avisar("Copiloto configurado");
      router.push("/m/plantao/semaforo");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1" aria-label={`Passo ${passo + 1} de ${passos.length}`}>
        {passos.map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= passo ? "bg-marca" : "bg-borda"}`} />)}
      </div>
      <Cartao key={passo} className="flex animate-[aparecer_220ms_ease-out] flex-col gap-3">
        <p className="text-xs font-semibold text-suave">Passo {passo + 1} de {passos.length}</p>
        <h2 className="text-lg font-bold tracking-tight">{atual.titulo}</h2>
        <p className="text-sm text-suave">{atual.texto}</p>
        {atual.corpo}
      </Cartao>
      <div className="grid grid-cols-2 gap-2">
        <Botao variante="secundario" icone={ArrowLeft} disabled={passo === 0 || salvando} onClick={() => setPasso((n) => n - 1)}>Voltar</Botao>
        {ultimo ? (
          <Botao icone={Check} disabled={salvando} onClick={concluir}>{salvando ? "Salvando…" : "Concluir"}</Botao>
        ) : (
          <Botao onClick={() => setPasso((n) => n + 1)}>Próximo <ArrowRight size={18} /></Botao>
        )}
      </div>
    </div>
  );
}
