import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { BarraTopoInterna } from "./app/barra-interna";
import { BotaoVoltar } from "./voltar";
import type { ComponentProps, ReactNode } from "react";

export type Tom = "neutro" | "ok" | "alerta" | "perigo" | "marca" | "info";

const TONS: Record<Tom, string> = {
  neutro: "bg-cartao-2 text-suave border-borda",
  ok: "bg-ok-suave text-ok border-transparent",
  alerta: "bg-alerta-suave text-alerta border-transparent",
  perigo: "bg-perigo-suave text-perigo border-transparent",
  marca: "bg-marca-suave text-marca border-transparent",
  info: "bg-info-suave text-info border-transparent",
};

export function Cartao({ children, className = "", ...props }: ComponentProps<"div">) {
  return (
    <div {...props} className={`rounded-[1.1rem] border border-borda bg-cartao p-4 shadow-cartao sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

export function CabecalhoPagina({
  titulo,
  subtitulo,
  voltar,
  acao,
  tituloCurto,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  voltar?: { href: string; rotulo: string };
  acao?: ReactNode;
  /** Título da barra do topo no celular, quando `titulo` não é texto simples. */
  tituloCurto?: string;
}) {
  const textoBarra = tituloCurto ?? (typeof titulo === "string" ? titulo : voltar?.rotulo);
  return (
    <header className="mb-5">
      {voltar && (
        <>
          {/* No celular, a tela interna usa a mesma barra do topo do modo motorista: voltar + título. */}
          <BarraTopoInterna voltar={voltar.href} titulo={textoBarra ?? ""} />
          <BotaoVoltar destino={voltar.href} className="mb-2 hidden items-center gap-1 text-sm text-suave hover:text-texto lg:inline-flex">
            <ChevronLeft size={16} aria-hidden /> {voltar.rotulo}
          </BotaoVoltar>
        </>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className={`text-[1.35rem] leading-tight font-bold tracking-tight sm:text-[1.7rem] ${voltar && typeof titulo === "string" ? "hidden lg:block" : ""}`}>{titulo}</h1>
          {subtitulo && <p className="mt-1 text-sm text-suave">{subtitulo}</p>}
        </div>
        {acao && <div className="flex shrink-0 flex-wrap gap-2">{acao}</div>}
      </div>
    </header>
  );
}

/** Mantido para páginas simples; prefira CabecalhoPagina. */
export function Titulo({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return <CabecalhoPagina titulo={children} acao={acao} />;
}

export function Suave({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-suave ${className}`}>{children}</p>;
}

const VARIANTES = {
  primario: "border-transparent bg-marca text-marca-texto hover:bg-marca-forte shadow-marca",
  claro: "border-transparent bg-white text-[#0b2a6b] hover:bg-white/90 shadow-flutuante",
  vidro: "border-white/25 bg-white/10 text-white hover:bg-white/20 backdrop-blur",
  secundario: "border-borda-forte bg-cartao text-texto hover:bg-cartao-2",
  perigo: "border-transparent bg-perigo text-white hover:opacity-90",
  fantasma: "border-transparent bg-transparent text-texto hover:bg-cartao-2",
} as const;
const TAMANHOS = { md: "h-10 px-4 text-sm", lg: "h-12 px-5 text-[0.95rem]", sm: "h-8 px-3 text-[0.8rem]" } as const;

type Variante = keyof typeof VARIANTES;
type Tamanho = keyof typeof TAMANHOS;

function classeBotao(variante: Variante, tamanho: Tamanho, extra: string) {
  return `inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition-colors disabled:pointer-events-none disabled:opacity-55 ${VARIANTES[variante]} ${TAMANHOS[tamanho]} ${extra}`;
}

export function Botao({
  variante = "primario",
  tamanho = "md",
  icone: Icone,
  className = "",
  children,
  ...props
}: ComponentProps<"button"> & { variante?: Variante; tamanho?: Tamanho; icone?: LucideIcon }) {
  return (
    <button {...props} className={classeBotao(variante, tamanho, className)}>
      {Icone && <Icone size={18} aria-hidden />}
      {children}
    </button>
  );
}

export function BotaoLink({
  variante = "primario",
  tamanho = "md",
  icone: Icone,
  className = "",
  children,
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string; variante?: Variante; tamanho?: Tamanho; icone?: LucideIcon }) {
  return (
    <Link {...props} href={href as Route} className={classeBotao(variante, tamanho, className)}>
      {Icone && <Icone size={18} aria-hidden />}
      {children}
    </Link>
  );
}

export function Campo({ rotulo, dica, erro, children }: { rotulo: string; dica?: ReactNode; erro?: string | undefined; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{rotulo}</span>
      {children}
      {dica && !erro && <span className="text-xs text-suave">{dica}</span>}
      {erro && <span className="text-xs font-medium text-perigo">{erro}</span>}
    </label>
  );
}

export const classeEntrada =
  "h-11 w-full rounded-xl border border-borda bg-cartao px-3 text-base outline-none transition-colors placeholder:text-suave/70 focus:border-marca focus:ring-3 focus:ring-marca/15 sm:text-[0.95rem]";
export const classeAreaTexto =
  "w-full rounded-xl border border-borda bg-cartao px-3 py-2.5 text-base outline-none focus:border-marca focus:ring-3 focus:ring-marca/15 sm:text-[0.95rem]";

export function Selo({ tom = "neutro", children }: { tom?: Tom; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TONS[tom]}`}>
      {children}
    </span>
  );
}

export function Vazio({ icone: Icone, titulo, children, acao }: { icone?: LucideIcon; titulo?: string; children?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-borda-forte px-5 py-8 text-center">
      {Icone && (
        <span className="grid size-10 place-items-center rounded-full bg-marca-suave text-marca">
          <Icone size={19} aria-hidden />
        </span>
      )}
      {titulo && <p className="font-semibold">{titulo}</p>}
      {children && <div className="max-w-sm text-sm text-suave">{children}</div>}
      {acao}
    </div>
  );
}

export function Aviso({ tom = "alerta", titulo, children }: { tom?: Tom; titulo?: string; children: ReactNode }) {
  return (
    <div role="status" className={`rounded-xl border px-3.5 py-3 text-[0.85rem] ${TONS[tom]}`}>
      {titulo && <p className="mb-0.5 font-semibold">{titulo}</p>}
      <div className="text-texto/90">{children}</div>
    </div>
  );
}

export function Indicador({ icone: Icone, rotulo, valor, tom = "marca", detalhe }: { icone: LucideIcon; rotulo: string; valor: ReactNode; tom?: Tom; detalhe?: ReactNode }) {
  return (
    <Cartao className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-start sm:gap-3">
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg sm:size-9 ${TONS[tom]}`}>
        <Icone size={17} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-suave">{rotulo}</p>
        {/* Valores longos quebram a linha em vez de vazar do cartão. */}
        <p className="text-base leading-tight font-bold tracking-tight tabular-nums [overflow-wrap:anywhere] sm:text-lg">{valor}</p>
        {detalhe && <p className="truncate text-[0.7rem] text-suave">{detalhe}</p>}
      </div>
    </Cartao>
  );
}

/** Linha de lista clicável com ícone, título, detalhe e selo. */
export function ItemLista({
  href,
  icone: Icone,
  inicio,
  titulo,
  detalhe,
  lateral,
}: {
  href: string;
  icone?: LucideIcon;
  /** Elemento à esquerda no lugar do ícone (ex.: avatar). */
  inicio?: ReactNode;
  titulo: ReactNode;
  detalhe?: ReactNode;
  lateral?: ReactNode;
}) {
  return (
    <Link href={href as Route} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-cartao-2">
      {inicio}
      {Icone && !inicio && (
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-cartao-2 text-suave">
          <Icone size={18} aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{titulo}</p>
        {detalhe && <p className="truncate text-xs text-suave">{detalhe}</p>}
      </div>
      {lateral}
    </Link>
  );
}

export function Lista({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-borda overflow-hidden rounded-[1.1rem] border border-borda bg-cartao shadow-cartao">{children}</div>;
}

export function DadoRotulado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      {/* Os dois lados podem quebrar a linha: rótulos longos (ex.: descrição de avaria) não vazam do cartão. */}
      <dt className="min-w-0 text-suave [overflow-wrap:anywhere]">{rotulo}</dt>
      <dd className="min-w-0 text-right font-medium break-words">{children}</dd>
    </div>
  );
}

/** Símbolo da marca: um "A" que é uma estrada, com a faixa central tracejada. Usa a cor do texto. */
export function Simbolo({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3.5 21 10.6 3.5h2.8L20.5 21" />
      <path d="M12 9.6v1.9M12 14.4v1.9M12 19.2V21" strokeWidth="2.1" />
    </svg>
  );
}

/** Logo: símbolo e nome na mesma cor (azul da marca, ou branco sobre fundo escuro). */
export function Marca({ className = "", inverso = false }: { className?: string; inverso?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-[1.15rem] font-extrabold tracking-[0.1em] ${inverso ? "text-white" : "text-marca"} ${className}`} aria-label="Aluguei">
      <Simbolo />
      <span aria-hidden>ALUGUEI</span>
    </span>
  );
}

/** Placa no estilo Mercosul (faixa azul com BRASIL), para reconhecer o carro de relance. */
export function Placa({ placa, tamanho = "md" }: { placa: string; tamanho?: "sm" | "md" | "lg" }) {
  const texto = /^[A-Z]{3}\d{4}$/.test(placa) ? `${placa.slice(0, 3)}-${placa.slice(3)}` : placa;
  const t = { sm: "w-[5.2rem] text-[0.8rem]", md: "w-[6.4rem] text-[0.98rem]", lg: "w-[8.5rem] text-[1.3rem]" }[tamanho];
  return (
    <span className={`inline-flex shrink-0 flex-col overflow-hidden rounded-md border-[1.5px] border-[#1b2a44] bg-white text-center font-mono leading-none font-bold tracking-wider text-[#111827] shadow-sm ${t}`} aria-label={`Placa ${texto}`}>
      <span className="bg-[#1f4bb8] py-[2px] text-[0.42em] font-sans font-bold tracking-[0.2em] text-white">BRASIL</span>
      <span className="py-[0.28em]">{texto}</span>
    </span>
  );
}

const TAMANHOS_AVATAR = { sm: "size-9 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg", xl: "size-20 text-2xl" } as const;

/** Foto de perfil, ou as iniciais quando não há foto. */
export function Avatar({ nome, foto, tamanho = "md", className = "" }: { nome: string; foto?: string | null; tamanho?: keyof typeof TAMANHOS_AVATAR; className?: string }) {
  const p = nome.trim().split(/\s+/);
  const letras = ((p[0]?.[0] ?? "") + (p.length > 1 ? (p.at(-1)?.[0] ?? "") : "")).toUpperCase();
  if (foto) {
    // As iniciais ficam por baixo: aparecem na hora, e a foto cobre quando terminar de carregar.
    return (
      <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-marca-suave font-bold text-marca ${TAMANHOS_AVATAR[tamanho]} ${className}`}>
        <span aria-hidden>{letras}</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={foto} alt="" decoding="async" fetchPriority="high" className="absolute inset-0 size-full object-cover" />
      </span>
    );
  }
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-marca-suave font-bold text-marca ${TAMANHOS_AVATAR[tamanho]} ${className}`} aria-hidden>
      {letras}
    </span>
  );
}
