import type { LucideIcon } from "lucide-react";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import type { Route } from "next";
import type { ReactNode } from "react";
import { BotaoLink } from "@/components/ui";
import { MockupSemaforo } from "./mockups";

type Item = { icone: LucideIcon; titulo: string; texto: string };

export interface ConteudoPerfil {
  tema: "azul" | "claro";
  selo: string;
  titulo: ReactNode;
  texto: string;
  ctas: [{ rotulo: string; href: string }, { rotulo: string; href: string }];
  marcas: [string, string, string];
  mockup: ReactNode;
  destaques: [Item, Item, Item, Item];
  passos: { titulo: string; itens: [Item, Item, Item, Item] };
  /** Seção "Tudo em um": as ferramentas de trabalho do motorista. */
  tudoEmUm: { titulo: string; texto: string; gatilhos: [string, string, string]; itens: [Item, Item, Item, Item, Item, Item]; cta: { rotulo: string; href: string } };
  beneficios: { titulo: string; texto: string; itens: [string, string, string, string] };
  recursos: { titulo: string; itens: (Item & { breve?: boolean })[] };
  seguranca: { titulo: string; texto: string; itens: [Item, Item, Item, Item] };
  preco: { titulo: string; texto: string; rotulo: string; valor: string; sufixo?: string; detalhe: string; itens: [string, string, string, string]; cta: { rotulo: string; href: string } };
  duvidas: { p: string; r: string }[];
  final: { titulo: string; texto: string; ctas: [{ rotulo: string; href: string }, { rotulo: string; href: string }] };
}

function Titulo({ selo, titulo, claro = false }: { selo: string; titulo: string; claro?: boolean }) {
  return (
    <>
      <p className={`text-xs font-bold tracking-[0.16em] uppercase ${claro ? "text-[#7dd3fc]" : "text-marca"}`}>{selo}</p>
      <h2 className="mt-2 max-w-2xl text-[1.7rem] leading-tight font-extrabold tracking-tight text-balance sm:text-4xl">{titulo}</h2>
    </>
  );
}

/**
 * Molde único das páginas iniciais de locador e motorista: as duas têm as
 * mesmas seções, na mesma ordem e com a mesma quantidade de itens.
 */
export function PaginaPerfil({ c }: { c: ConteudoPerfil }) {
  const azul = c.tema === "azul";
  return (
    <div className="bg-cartao">
      {/* Topo */}
      <section className={azul ? "fundo-marca relative overflow-hidden" : "relative overflow-hidden bg-gradient-to-b from-[#eaf1ff] via-[#f5f8ff] to-white"}>
        {azul && <div className="grade-sutil absolute inset-0 [mask-image:radial-gradient(80%_70%_at_70%_30%,black,transparent)]" aria-hidden />}
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pt-28 pb-24 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pt-36 lg:pb-32">
          <div className="animar-entrada">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold sm:text-sm ${azul ? "bg-white/12 ring-1 ring-white/20 backdrop-blur" : "bg-marca-suave text-marca"}`}>
              <span className={`size-2 rounded-full ${azul ? "bg-[#7dd3fc]" : "bg-marca"}`} /> {c.selo}
            </span>
            <h1 className="mt-5 text-[2.1rem] leading-[1.08] font-extrabold tracking-tight text-balance sm:text-[3.2rem]">{c.titulo}</h1>
            <p className={`mt-4 max-w-xl leading-relaxed sm:text-lg ${azul ? "text-white/80" : "text-suave"}`}>{c.texto}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <BotaoLink href={c.ctas[0].href as Route} tamanho="lg" variante={azul ? "claro" : "primario"}>{c.ctas[0].rotulo} <ArrowRight size={18} /></BotaoLink>
              <BotaoLink href={c.ctas[1].href as Route} tamanho="lg" variante={azul ? "vidro" : "secundario"}>{c.ctas[1].rotulo}</BotaoLink>
            </div>
            <ul className={`mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm ${azul ? "text-white/80" : "text-suave"}`}>
              {c.marcas.map((t) => (
                <li key={t} className="flex items-center gap-2"><Check size={16} className={azul ? "text-[#7dd3fc]" : "text-marca"} /> {t}</li>
              ))}
            </ul>
          </div>
          {c.mockup}
        </div>
      </section>

      {/* Destaques */}
      <section className="relative z-10 mx-auto -mt-12 max-w-6xl px-5 sm:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {c.destaques.map(({ icone: Icone, titulo, texto }) => (
            <div key={titulo} className="flex items-start gap-3.5 rounded-2xl border border-borda bg-cartao p-4 shadow-flutuante">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-marca-suave text-marca"><Icone size={20} /></span>
              <div>
                <p className="text-[0.95rem] font-extrabold tracking-tight">{titulo}</p>
                <p className="mt-0.5 text-sm leading-snug text-suave">{texto}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:px-8">
        <Titulo selo="Como funciona" titulo={c.passos.titulo} />
        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {c.passos.itens.map(({ icone: Icone, titulo, texto }, i) => (
            <li key={titulo} className="relative rounded-[1.1rem] border border-borda bg-fundo p-5">
              <span className="absolute top-4 right-5 text-4xl font-extrabold text-marca/10">{i + 1}</span>
              <span className="grid size-11 place-items-center rounded-xl bg-marca text-white shadow-marca"><Icone size={20} /></span>
              <p className="mt-4 font-bold">{titulo}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-suave">{texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Tudo em um */}
      <section id="tudo-em-um" className="fundo-navy scroll-mt-20 overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <Titulo selo="Tudo em um" titulo={c.tudoEmUm.titulo} claro />
            <p className="mt-4 max-w-xl text-white/75">{c.tudoEmUm.texto}</p>
            <ul className="mt-6 flex flex-col gap-2.5">
              {c.tudoEmUm.gatilhos.map((t) => (
                <li key={t} className="flex items-center gap-3 text-[0.95rem] font-semibold"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#22c55e] text-[#052e16]"><Check size={14} strokeWidth={3} /></span>{t}</li>
              ))}
            </ul>
            <BotaoLink href={c.tudoEmUm.cta.href as Route} tamanho="lg" variante="claro" className="mt-8">{c.tudoEmUm.cta.rotulo} <ArrowRight size={18} /></BotaoLink>
          </div>
          <MockupSemaforo />
        </div>
        <div className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {c.tudoEmUm.itens.map(({ icone: Icone, titulo, texto }) => (
              <div key={titulo} className="flex items-start gap-3.5 rounded-2xl bg-white/[0.05] p-5 ring-1 ring-white/10">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-[#7dd3fc]"><Icone size={20} /></span>
                <div>
                  <p className="font-bold">{titulo}</p>
                  <p className="mt-1 text-sm text-white/65">{texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* O que muda */}
      <section className="bg-fundo">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center">
          <div>
            <Titulo selo="O que muda" titulo={c.beneficios.titulo} />
            <p className="mt-4 max-w-lg text-suave">{c.beneficios.texto}</p>
          </div>
          <ul className="grid gap-3">
            {c.beneficios.itens.map((t) => (
              <li key={t} className="flex items-start gap-3 rounded-2xl border border-borda bg-cartao p-4 shadow-cartao">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-marca text-white"><Check size={16} /></span>
                <span className="text-[0.95rem]">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:px-8">
        <Titulo selo="Recursos" titulo={c.recursos.titulo} />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {c.recursos.itens.map(({ icone: Icone, titulo, texto, breve }) => (
            <div key={titulo} className="flex flex-col rounded-[1.1rem] border border-borda bg-cartao p-5 shadow-cartao transition-all hover:-translate-y-0.5 hover:shadow-flutuante">
              <div className="flex items-start justify-between gap-2">
                <span className="grid size-10 place-items-center rounded-xl bg-marca-suave text-marca"><Icone size={20} /></span>
                {breve && <span className="rounded-full bg-alerta-suave px-2 py-0.5 text-[0.7rem] font-bold text-alerta">Em breve</span>}
              </div>
              <p className="mt-4 font-bold">{titulo}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-suave">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Segurança */}
      <section className={azul ? "fundo-navy" : "border-y border-borda bg-[#f3f7ff]"}>
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <Titulo selo="Segurança" titulo={c.seguranca.titulo} claro={azul} />
            <p className={`mt-4 ${azul ? "text-white/70" : "text-suave"}`}>{c.seguranca.texto}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {c.seguranca.itens.map(({ icone: Icone, titulo, texto }) => (
              <div key={titulo} className={`rounded-2xl p-5 ${azul ? "bg-white/[0.05] ring-1 ring-white/10" : "border border-borda bg-cartao shadow-cartao"}`}>
                <Icone size={20} className={azul ? "text-[#7dd3fc]" : "text-marca"} />
                <p className="mt-3 font-bold">{titulo}</p>
                <p className={`mt-1 text-sm ${azul ? "text-white/65" : "text-suave"}`}>{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preço */}
      <section id="preco" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <Titulo selo="Preço" titulo={c.preco.titulo} />
            <p className="mt-4 text-suave">{c.preco.texto}</p>
          </div>
          <div className="rounded-[1.5rem] border-2 border-marca bg-cartao p-6 shadow-flutuante sm:p-8">
            <p className="text-sm font-semibold text-suave">{c.preco.rotulo}</p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight sm:text-5xl">{c.preco.valor}{c.preco.sufixo && <span className="text-base font-semibold text-suave">{c.preco.sufixo}</span>}</p>
            <p className="mt-2 text-sm text-suave">{c.preco.detalhe}</p>
            <ul className="mt-6 flex flex-col gap-2.5 text-sm">
              {c.preco.itens.map((t) => <li key={t} className="flex gap-3"><Check size={18} className="mt-0.5 shrink-0 text-marca" /> {t}</li>)}
            </ul>
            <BotaoLink href={c.preco.cta.href as Route} tamanho="lg" className="mt-7 w-full">{c.preco.cta.rotulo}</BotaoLink>
          </div>
        </div>
      </section>

      {/* Dúvidas */}
      <section id="duvidas" className="bg-fundo">
        <div className="mx-auto max-w-3xl scroll-mt-20 px-5 py-20 sm:px-8">
          <Titulo selo="Dúvidas" titulo="Perguntas frequentes" />
          <div className="mt-8 flex flex-col gap-2.5">
            {c.duvidas.map(({ p, r }) => (
              <details key={p} className="group rounded-2xl border border-borda bg-cartao px-5 py-4 shadow-cartao">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[0.95rem] font-bold">
                  {p}
                  <ChevronDown size={18} className="shrink-0 text-suave transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-suave">{r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Chamada final */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className={`relative overflow-hidden rounded-[1.75rem] px-6 py-12 text-center sm:px-12 ${azul ? "fundo-marca" : "border border-borda bg-[#f3f7ff]"}`}>
          <h2 className="text-[1.7rem] font-extrabold tracking-tight text-balance sm:text-4xl">{c.final.titulo}</h2>
          <p className={`mx-auto mt-3 max-w-xl ${azul ? "text-white/80" : "text-suave"}`}>{c.final.texto}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <BotaoLink href={c.final.ctas[0].href as Route} tamanho="lg" variante={azul ? "claro" : "primario"}>{c.final.ctas[0].rotulo} <ArrowRight size={18} /></BotaoLink>
            <BotaoLink href={c.final.ctas[1].href as Route} tamanho="lg" variante={azul ? "vidro" : "secundario"}>{c.final.ctas[1].rotulo}</BotaoLink>
          </div>
        </div>
      </section>
    </div>
  );
}
