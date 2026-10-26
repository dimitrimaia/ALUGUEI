"use client";

import { Building2, Car, ChevronRight, Globe, LoaderCircle, LogOut, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, type ReactNode, type RefObject, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useConta } from "@/components/conta/contexto";
import { Gaveta } from "@/components/gaveta";
import { telaNoOutroModo } from "@/lib/modo-equivalente";
import { Avatar, Marca } from "@/components/ui";

export type Modo = "motorista" | "locador";

export interface ItemMenu {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  contador?: number;
  /** Prefixos que também marcam o item como atual. */
  tambem?: readonly string[];
}

export interface PerfilMenu {
  nome: string;
  foto: string | null;
  detalhe: string;
}

export interface DadosMenu {
  modo: Modo;
  locadora: string | null;
  inicio: string;
  conta: string;
  perfil: PerfilMenu;
  secoes: readonly { titulo: string; itens: readonly ItemMenu[] }[];
}

function atual(caminho: string, item: ItemMenu) {
  return [item.href, ...(item.tambem ?? [])].some((h) => caminho === h || caminho.startsWith(`${h}/`));
}

/** Troca entre os dois modos da conta: alugar carros (motorista) e anunciar os seus (locador). */
export function TrocaModo({ modo, locadora, escuro = false, aoTrocar }: { modo: Modo; locadora: string | null; escuro?: boolean; aoTrocar?: (m: Modo) => void }) {
  const opcoes = [
    { id: "motorista", rotulo: "Motorista", detalhe: "Alugar carro", href: "/m", icone: Car },
    { id: "locador", rotulo: "Locador", detalhe: locadora ? "Meus carros" : "Ativar", href: locadora ? "/painel" : "/painel/comecar", icone: Building2 },
  ] as const;
  return (
    <div className={`grid grid-cols-2 gap-1 rounded-xl p-1 ${escuro ? "bg-white/[0.08] ring-1 ring-white/12" : "bg-cartao-2 ring-1 ring-borda"}`} role="tablist" aria-label="Modo do app">
      {opcoes.map(({ id, rotulo, detalhe, href, icone: Icone }) => {
        const ativo = modo === id;
        return (
          <Link
            key={id}
            href={href as Route}
            role="tab"
            aria-selected={ativo}
            onClick={(e) => {
              if (ativo) return e.preventDefault();
              if (aoTrocar) {
                e.preventDefault();
                aoTrocar(id);
              }
            }}
            className={`flex items-center justify-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${ativo ? (escuro ? "bg-white text-[#0b2a6b]" : "bg-cartao text-texto shadow-cartao") : escuro ? "text-white/80" : "text-suave"}`}
          >
            <Icone size={16} className={ativo ? "text-[#1f56e8]" : ""} />
            <span className="leading-tight">
              <span className="block text-[0.8rem] font-semibold">{rotulo}</span>
              <span className={`block text-[0.65rem] ${ativo ? "text-[#5b6880]" : escuro ? "text-white/50" : "text-suave"}`}>{detalhe}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/** A troca de modo da tela Conta: vai para a Conta do outro modo. */
export function TrocaModoDaConta() {
  const { modo, locadora } = useConta();
  const { trocarModo } = useContext(Contexto);
  return <TrocaModo modo={modo} locadora={locadora} aoTrocar={trocarModo} />;
}

interface ValorMenu {
  abrir: () => void;
  registrar: (d: DadosMenu) => void;
  aberto: boolean;
  /** Troca de modo indo para a tela equivalente do outro lado; com o menu aberto, ele continua aberto. */
  trocarModo: (m: Modo) => void;
}

const Contexto = createContext<ValorMenu>({ abrir: () => {}, registrar: () => {}, aberto: false, trocarModo: () => {} });

export const useAcoesMenu = () => useContext(Contexto);

/**
 * O menu ☰ mora no layout raiz, acima dos dois modos. Assim, ao trocar de
 * modo, ele continua aberto e só o conteúdo muda por trás.
 */
export function ProvedorMenu({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [dados, setDados] = useState<DadosMenu | null>(null);
  const [trocando, setTrocando] = useState<Modo | null>(null);
  // Vinheta da troca de modo: aparece, segura até o outro modo carregar e some.
  const [vinheta, setVinheta] = useState<{ modo: Modo; inicio: number; pronto: boolean; saindo: boolean } | null>(null);
  const manter = useRef(false);

  const registrar = useCallback((d: DadosMenu) => {
    setDados(d);
    setTrocando((t) => (t === d.modo ? null : t));
    setVinheta((v) => (v && v.modo === d.modo && !v.pronto ? { ...v, pronto: true } : v));
  }, []);

  // A vinheta fica pelo menos 700 ms (para a animação aparecer inteira, mesmo com a
  // outra tela pronta na hora), sai em 340 ms e nunca fica presa: no máximo 2,5 s.
  const MINIMO_VINHETA = 700;
  useEffect(() => {
    if (!vinheta) return;
    const passou = Date.now() - vinheta.inicio;
    const t = vinheta.saindo
      ? window.setTimeout(() => setVinheta(null), 380)
      : window.setTimeout(() => setVinheta((v) => (v ? { ...v, saindo: true } : v)), vinheta.pronto ? Math.max(0, MINIMO_VINHETA - passou) : Math.max(0, 2500 - passou));
    return () => window.clearTimeout(t);
  }, [vinheta]);

  const trocarModo = useCallback(
    (m: Modo) => {
      if (dados?.modo === m) return;
      if (m === "locador" && !dados?.locadora) return router.push("/painel/comecar");
      if (aberto) {
        manter.current = true;
        setTrocando(m);
      }
      setVinheta({ modo: m, inicio: Date.now(), pronto: false, saindo: false });
      router.push(telaNoOutroModo(location.pathname, m) as Route);
    },
    [aberto, dados?.modo, dados?.locadora, router],
  );

  return (
    <Contexto.Provider value={{ abrir: () => setAberto(true), registrar, aberto, trocarModo }}>
      {children}
      {dados && <MenuApp aberto={aberto} aoFechar={() => setAberto(false)} dados={dados} trocando={trocando} aoTrocar={trocarModo} manterAberto={manter} />}
      {vinheta && <VinhetaModo modo={vinheta.modo} saindo={vinheta.saindo} />}
    </Contexto.Provider>
  );
}

/** Cada modo informa ao menu as suas opções; devolve a função de abrir. */
export function useMenu(dados: DadosMenu) {
  const { abrir, registrar, aberto } = useContext(Contexto);
  const chave = JSON.stringify(dados, (k, v) => (k === "icone" ? undefined : v));
  const ultimo = useRef(dados);
  ultimo.current = dados;
  useEffect(() => registrar(ultimo.current), [chave, registrar]);
  return { abrir, aberto };
}

/**
 * Menu lateral das áreas logadas, no estilo do menu do site: abre pela direita,
 * com o perfil e a troca de modo no topo e as opções em faixas. É compacto para
 * caber inteiro na tela do celular, sem rolar.
 */
function MenuApp({
  aberto,
  aoFechar,
  dados,
  trocando,
  aoTrocar,
  manterAberto,
}: {
  aberto: boolean;
  aoFechar: () => void;
  dados: DadosMenu;
  trocando: Modo | null;
  aoTrocar: (m: Modo) => void;
  manterAberto: RefObject<boolean>;
}) {
  const caminho = usePathname();
  const { inicio, conta, perfil, secoes } = dados;
  return (
    <Gaveta aberta={aberto} aoFechar={aoFechar} lado="direita" escura rotulo="Menu" manterAberta={manterAberto}>
      <div className="flex flex-1 flex-col px-4 pt-4 pb-4 [@media(max-height:700px)]:pt-3">
        <Link href={inicio as Route} className="w-fit px-1 py-1.5" aria-label="Início do app"><Marca inverso /></Link>

        <Link href={conta as Route} className="mt-3 flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-[#0b2a6b]">
          <Avatar nome={perfil.nome} foto={perfil.foto} tamanho="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{perfil.nome}</span>
            <span className="block truncate text-[0.7rem] text-[#5b6880]">Perfil e configurações</span>
          </span>
          <ChevronRight size={16} className="shrink-0 opacity-50" />
        </Link>

        <div className="mt-2.5"><TrocaModo modo={trocando ?? dados.modo} locadora={dados.locadora} escuro aoTrocar={aoTrocar} /></div>

        <div className={`relative transition-opacity duration-200 ${trocando ? "pointer-events-none opacity-40" : ""}`}>
          {trocando && <LoaderCircle size={22} className="absolute top-10 left-1/2 -ml-3 animate-spin text-white" />}
          {secoes.map(({ titulo, itens }) => (
            <div key={titulo} className="mt-4 [@media(max-height:700px)]:mt-2.5">
              <p className="mb-1 px-2 text-[0.65rem] font-semibold tracking-[0.12em] text-white/45 uppercase">{titulo}</p>
              <nav className="flex flex-col" aria-label={titulo}>
                {itens.map((item) => {
                  const Icone = item.icone;
                  const ativo = atual(caminho, item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href as Route}
                      aria-current={ativo ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-[0.92rem] font-semibold [@media(max-height:700px)]:py-1.5 ${ativo ? "bg-white/12 text-white" : "text-white/85 hover:bg-white/[0.07]"}`}
                    >
                      <Icone size={18} className="text-[#7dd3fc]" />
                      <span className="flex-1">{item.rotulo}</span>
                      {!!item.contador && <span className="grid min-w-5 place-items-center rounded-full bg-[#ffb020] px-1.5 text-[0.7rem] font-bold text-[#3a2500]">{item.contador}</span>}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-5 [@media(max-height:700px)]:pt-3">
          <Link href="/" className="flex items-center justify-center gap-2 rounded-xl bg-white/[0.08] px-3 py-2.5 text-sm font-semibold text-white ring-1 ring-white/12">
            <Globe size={16} className="text-[#7dd3fc]" /> Ver o site
          </Link>
          <form action="/sair" method="post">
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.08] px-3 py-2.5 text-sm font-semibold text-white ring-1 ring-white/12"><LogOut size={16} className="text-[#7dd3fc]" /> Sair</button>
          </form>
        </div>
        <p className="mt-3 text-center text-[0.65rem] text-white/40 [@media(max-height:700px)]:hidden">© {new Date().getFullYear()} Aluguei · Locação para motoristas de app</p>
      </div>
    </Gaveta>
  );
}

/** Troca de modo: fundo claro que aparece e o ícone do modo em "pop" (~400 ms). */
function VinhetaModo({ modo, saindo }: { modo: Modo; saindo: boolean }) {
  const Icone = modo === "locador" ? Building2 : Car;
  return (
    <div aria-live="polite" className={`vinheta-modo fixed inset-0 z-[60] grid place-items-center bg-cartao ${saindo ? "vinheta-sai" : ""}`}>
      <div className="flex flex-col items-center gap-3">
        <span className="vinheta-icone grid size-20 place-items-center rounded-[1.6rem] bg-marca text-white shadow-marca"><Icone size={38} /></span>
        <p className="vinheta-texto text-base font-bold">{modo === "locador" ? "Modo locador" : "Modo motorista"}</p>
      </div>
    </div>
  );
}
