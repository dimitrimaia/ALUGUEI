import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
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
    <div {...props} className={`rounded-[1.25rem] border border-borda bg-cartao p-4 shadow-cartao sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function CabecalhoPagina({
  titulo,
  subtitulo,
  voltar,
  acao,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  voltar?: { href: string; rotulo: string };
  acao?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {voltar && (
        <Link href={voltar.href as Route} className="mb-2 inline-flex items-center gap-1 text-sm text-suave hover:text-texto">
          <ChevronLeft size={16} aria-hidden /> {voltar.rotulo}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[1.6rem] leading-tight font-extrabold tracking-tight sm:text-3xl">{titulo}</h1>
          {subtitulo && <p className="mt-1 text-suave">{subtitulo}</p>}
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
const TAMANHOS = { md: "h-11 px-4 text-[0.95rem]", lg: "h-13 px-6 text-base", sm: "h-9 px-3 text-sm" } as const;

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
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante; tamanho?: Tamanho; icone?: LucideIcon }) {
  return (
    <Link {...props} className={classeBotao(variante, tamanho, className)}>
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
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-borda-forte px-6 py-12 text-center">
      {Icone && (
        <span className="grid size-12 place-items-center rounded-full bg-marca-suave text-marca">
          <Icone size={22} aria-hidden />
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
    <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${TONS[tom]}`}>
      {titulo && <p className="mb-0.5 font-semibold">{titulo}</p>}
      <div className="text-texto/90">{children}</div>
    </div>
  );
}

export function Indicador({ icone: Icone, rotulo, valor, tom = "marca", detalhe }: { icone: LucideIcon; rotulo: string; valor: ReactNode; tom?: Tom; detalhe?: ReactNode }) {
  return (
    <Cartao className="flex items-start gap-3 transition-shadow hover:shadow-flutuante">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${TONS[tom]}`}>
        <Icone size={20} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-suave">{rotulo}</p>
        <p className="text-2xl font-bold tracking-tight">{valor}</p>
        {detalhe && <p className="text-xs text-suave">{detalhe}</p>}
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
    <Link href={href as Route} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-cartao-2 sm:px-5">
      {inicio}
      {Icone && !inicio && (
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cartao-2 text-suave">
          <Icone size={20} aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{titulo}</p>
        {detalhe && <p className="truncate text-sm text-suave">{detalhe}</p>}
      </div>
      {lateral}
    </Link>
  );
}

export function Lista({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-borda overflow-hidden rounded-2xl border border-borda bg-cartao shadow-cartao">{children}</div>;
}

export function DadoRotulado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-sm text-suave">{rotulo}</dt>
      <dd className="font-medium sm:text-right">{children}</dd>
    </div>
  );
}

/** Símbolo da marca: um "A" que é uma estrada, com a faixa central tracejada. */
export function Simbolo({ className = "size-9" }: { className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#3b74ff] to-[#1641b8] text-white shadow-marca ${className}`}>
      <svg viewBox="0 0 24 24" className="size-[62%]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4.5 20 11 4.5h2L19.5 20" />
        <path d="M12 10.5v1.6M12 14.6v1.6M12 18.7V20" strokeWidth="2" />
      </svg>
    </span>
  );
}

export function Marca({ className = "", inverso = false }: { className?: string; inverso?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 text-[1.15rem] font-extrabold tracking-tight ${inverso ? "text-white" : "text-texto"} ${className}`}>
      <Simbolo />
      Aluguei
    </span>
  );
}

export function Avatar({ nome, tamanho = "md" }: { nome: string; tamanho?: "md" | "lg" }) {
  const p = nome.trim().split(/\s+/);
  const letras = ((p[0]?.[0] ?? "") + (p.length > 1 ? (p.at(-1)?.[0] ?? "") : "")).toUpperCase();
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-marca-suave font-bold text-marca ${tamanho === "lg" ? "size-14 text-lg" : "size-10 text-sm"}`} aria-hidden>
      {letras}
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
