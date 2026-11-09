"use client";

import { Bell, Building2, Car, Check, Menu, MessageCircle, Plus, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useConta } from "@/components/conta/contexto";
import { GavetaAvisos } from "@/components/gaveta-avisos";
import { useAcoesMenu } from "@/components/menu-app";
import { Avatar, Marca } from "@/components/ui";
import { BotaoVoltar } from "@/components/voltar";

/**
 * Cabeçalho e rodapé das áreas logadas. Os dois modos usam exatamente estes
 * componentes: só as abas mudam (o locador tem Frota, + e Financeiro).
 */

const ALTURA_TOPO = "h-[calc(3.5rem+env(safe-area-inset-top))]";

/** Botão ☰, com um ponto quando há algo novo no menu. */
function BotaoMenu() {
  const { abrir, aberto } = useAcoesMenu();
  const { avisos } = useConta();
  return (
    <button onClick={abrir} aria-label="Abrir menu" aria-expanded={aberto} className="relative grid size-10 place-items-center rounded-full hover:bg-cartao-2">
      <Menu size={22} />
      {avisos > 0 && <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-[#ffb020] ring-2 ring-cartao" />}
    </button>
  );
}

function BotaoConversas() {
  const { naoLidas, modo } = useConta();
  return (
    <Link href={modo === "locador" ? "/painel/conversas" : "/m/conversas"} aria-label="Conversas" className="relative grid size-10 place-items-center rounded-full hover:bg-cartao-2">
      <MessageCircle size={21} />
      {naoLidas > 0 && <span className="absolute top-1 right-0.5 grid min-w-4 place-items-center rounded-full bg-[#ffb020] px-1 text-[0.6rem] font-bold text-[#3a2500] ring-2 ring-cartao">{naoLidas}</span>}
    </Link>
  );
}

/** Sino dos avisos, com o número de não lidos (nos dois modos). */
function BotaoAvisos() {
  const { notificacoes } = useConta();
  return <GavetaAvisos novos={notificacoes} />;
}

/**
 * Barra fixa do topo: o logo (que leva ao início do modo) ou, nas telas
 * internas, voltar e o título. Sempre com o ☰ à direita. Inclui o espaço que
 * ela ocupa, para o conteúdo começar logo abaixo.
 */
export function BarraTopo({ voltar, titulo, className = "" }: { voltar?: string; titulo?: string; className?: string }) {
  const { modo } = useConta();
  return (
    <>
      <header className={`fixed inset-x-0 top-0 z-30 border-b border-borda bg-cartao/90 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden ${className}`}>
        <div className="mx-auto flex h-14 max-w-[42rem] items-center gap-1 px-2">
          {voltar ? (
            <>
              <BotaoVoltar destino={voltar} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-cartao-2" />
              <h1 className="min-w-0 flex-1 truncate text-base font-bold">{titulo}</h1>
            </>
          ) : (
            <Link href={modo === "locador" ? "/painel" : "/m"} className="flex-1 pl-2" aria-label="Início do app"><Marca /></Link>
          )}
          {/* O rodapé tem o botão do meio (+ ou Copiloto), então Conversas fica aqui nos dois modos. */}
          <BotaoAvisos />
          <BotaoConversas />
          <BotaoMenu />
        </div>
      </header>
      <div className={`${ALTURA_TOPO} lg:hidden ${className}`} aria-hidden />
      {/* Computador: a lateral e a barra de cima já têm logo, avisos e menu; aqui fica só voltar + título. */}
      {voltar && (
        <div className={`hidden items-center gap-2 pt-8 pb-2 lg:flex ${className}`}>
          <BotaoVoltar destino={voltar} className="grid size-10 shrink-0 place-items-center rounded-full border border-borda bg-cartao hover:bg-cartao-2" />
          <h1 className="min-w-0 flex-1 truncate text-2xl font-bold tracking-tight">{titulo}</h1>
        </div>
      )}
    </>
  );
}

export interface Aba {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  ativo: (caminho: string) => boolean;
  contador?: number;
}

/** Rodapé fixo com 5 posições. No meio pode ir o botão + do locador. */
export function BarraInferior({ abas, central }: { abas: readonly Aba[]; central?: ReactNode }) {
  const caminho = usePathname();
  const itens: ReactNode[] = abas.map((a) => <ItemAba key={a.href} aba={a} atual={a.ativo(caminho)} />);
  if (central) itens.splice(2, 0, <div key="central" className="flex justify-center">{central}</div>);
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-cartao/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-[42rem] grid-cols-5">
        {itens}
        <AbaConta />
      </div>
    </nav>
  );
}

const classeAba = (atual: boolean) => `relative flex flex-col items-center gap-1 pt-2 pb-1.5 text-[0.66rem] font-semibold select-none ${atual ? "text-marca" : "text-suave"}`;
const classeIcone = (atual: boolean) => `grid h-7 w-12 place-items-center rounded-full transition-colors ${atual ? "bg-marca-suave" : ""}`;

function ItemAba({ aba, atual }: { aba: Aba; atual: boolean }) {
  const Icone = aba.icone;
  return (
    <Link href={aba.href as Route} prefetch aria-current={atual ? "page" : undefined} className={classeAba(atual)}>
      <span className={classeIcone(atual)}><Icone size={20} /></span>
      {aba.rotulo}
      {!!aba.contador && <span className="absolute top-1.5 left-1/2 ml-2.5 grid min-w-4 place-items-center rounded-full bg-[#ffb020] px-1 text-[0.6rem] font-bold text-[#3a2500] ring-2 ring-cartao">{aba.contador}</span>}
    </Link>
  );
}

/** Botão do meio, destacado: + no locador, Copiloto no motorista. Mesmo desenho nos dois modos. */
export function BotaoCentral({ aoTocar, icone: Icone = Plus, rotulo = "Novo", ativo = false }: { aoTocar: () => void; icone?: LucideIcon; rotulo?: string; ativo?: boolean }) {
  return (
    <button onClick={aoTocar} aria-label={rotulo} className="flex flex-col items-center gap-1 pb-1.5 text-[0.66rem] font-semibold text-marca select-none">
      <span className={`-mt-5 grid size-13 place-items-center rounded-2xl bg-gradient-to-br from-[#3b74ff] to-[#1641b8] text-white shadow-marca ring-4 transition-transform active:scale-95 ${ativo ? "ring-marca-suave" : "ring-cartao"}`}>
        <Icone size={24} aria-hidden />
      </span>
      {rotulo}
    </button>
  );
}

/**
 * Aba Conta com a foto. Toque: abre a conta. Dois toques: troca de modo.
 * Tocar e segurar: mostra os dois modos para escolher (como no Instagram).
 */
function AbaConta() {
  const router = useRouter();
  const caminho = usePathname();
  const { perfil, modo, locadora } = useConta();
  const { trocarModo } = useAcoesMenu();
  const [escolher, setEscolher] = useState(false);
  const ultimoToque = useRef(0);
  const timerToque = useRef<ReturnType<typeof setTimeout>>(undefined);
  const timerSegurar = useRef<ReturnType<typeof setTimeout>>(undefined);
  const segurou = useRef(false);
  const conta = modo === "locador" ? "/painel/conta" : "/m/conta";
  const atual = caminho.startsWith(conta);

  useEffect(() => () => { clearTimeout(timerToque.current); clearTimeout(timerSegurar.current); }, []);

  function aoPressionar() {
    segurou.current = false;
    timerSegurar.current = setTimeout(() => {
      segurou.current = true;
      navigator.vibrate?.(15);
      setEscolher(true);
    }, 450);
  }

  function aoSoltar() {
    clearTimeout(timerSegurar.current);
    if (segurou.current) return;
    const agora = Date.now();
    if (agora - ultimoToque.current < 300) {
      clearTimeout(timerToque.current);
      ultimoToque.current = 0;
      navigator.vibrate?.(10);
      if (locadora) trocarModo(modo === "locador" ? "motorista" : "locador");
      else setEscolher(true);
      return;
    }
    ultimoToque.current = agora;
    // Espera um instante para saber se vem o segundo toque.
    timerToque.current = setTimeout(() => router.push(conta as Route), 260);
  }

  return (
    <>
      <button
        type="button"
        onPointerDown={aoPressionar}
        onPointerUp={aoSoltar}
        onPointerLeave={() => clearTimeout(timerSegurar.current)}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => e.detail === 0 && router.push(conta as Route)} // teclado
        onMouseEnter={() => router.prefetch(conta as Route)}
        aria-label="Conta (toque duas vezes para trocar de modo, segure para escolher)"
        aria-current={atual ? "page" : undefined}
        className={`${classeAba(atual)} [-webkit-touch-callout:none]`}
      >
        <span className={classeIcone(atual)}>
          <Avatar nome={perfil.nome} foto={perfil.foto} className={`!size-6 ${atual ? "ring-2 ring-marca" : ""}`} />
        </span>
        Conta
      </button>
      {escolher &&
        createPortal(
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Trocar de modo">
            <button className="absolute inset-0 bg-[#071a3d]/35" onClick={() => setEscolher(false)} aria-label="Fechar" />
            <div className="animar-entrada absolute right-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-borda bg-cartao p-2 shadow-flutuante">
              <p className="px-2.5 pt-1.5 pb-2 text-xs font-semibold text-suave">Trocar de modo</p>
              {([
                { id: "motorista", titulo: "Motorista", detalhe: "Alugar carros", icone: Car },
                { id: "locador", titulo: locadora ?? "Locador", detalhe: locadora ? "Meus carros para alugar" : "Ativar e anunciar meu carro", icone: Building2 },
              ] as const).map(({ id, titulo, detalhe, icone: Icone }) => (
                <button
                  key={id}
                  onClick={() => {
                    setEscolher(false);
                    trocarModo(id);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left ${modo === id ? "bg-marca-suave/60" : "hover:bg-cartao-2"}`}
                >
                  <span className="relative">
                    <Avatar nome={perfil.nome} foto={perfil.foto} />
                    <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-marca text-white ring-2 ring-cartao"><Icone size={11} /></span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{titulo}</span>
                    <span className="block truncate text-xs text-suave">{detalhe}</span>
                  </span>
                  {modo === id && <Check size={18} className="shrink-0 text-marca" />}
                </button>
              ))}
              <p className="px-2.5 pt-2 pb-1 text-[0.68rem] text-suave">Dica: toque duas vezes na sua foto para trocar.</p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
