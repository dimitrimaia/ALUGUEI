"use client";

import { BarChart3, Calculator, Car, Gauge, Link2, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useRef, useState } from "react";
import { Marca } from "@/components/ui";

type Slide = { titulo: string; texto: string; arte: ReactNode };

const Moldura = ({ children }: { children: ReactNode }) => <div className="mx-auto w-full max-w-[17rem] rounded-[1.6rem] bg-white/10 p-3 ring-1 ring-white/20">{children}</div>;

const SLIDES: Slide[] = [
  {
    titulo: "Tudo do seu trabalho num app só",
    texto: "Corridas, lucro, aluguel do carro, caronas e clientes particulares. Sem pular de app em app.",
    arte: (
      <div className="mx-auto grid w-full max-w-[17rem] grid-cols-3 gap-2.5">
        {[Gauge, Calculator, BarChart3, Car, Users, Link2].map((I, i) => (
          <span key={i} className="grid aspect-square place-items-center rounded-2xl bg-white/12 ring-1 ring-white/20"><I size={28} /></span>
        ))}
      </div>
    ),
  },
  {
    titulo: "Saiba na hora se a corrida paga",
    texto: "A oferta toca e o Copiloto responde: verde, amarelo ou vermelho, com R$/km, R$/hora e lucro.",
    arte: (
      <Moldura>
        <div className="rounded-2xl bg-[#16a34a] p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase"><span className="size-2.5 rounded-full bg-white" /> Vale a pena</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
            {[["por km", "R$ 2,90"], ["por hora", "R$ 73"], ["lucro", "R$ 21"]].map(([a, b]) => (
              <div key={a} className="rounded-lg bg-black/15 py-1.5"><p className="text-[0.55rem] opacity-80">{a}</p><p className="text-sm font-extrabold">{b}</p></div>
            ))}
          </div>
        </div>
      </Moldura>
    ),
  },
  {
    titulo: "Seu lucro de verdade, todo dia",
    texto: "Inicie o plantão, acompanhe a meta e veja o que sobra depois de combustível e aluguel.",
    arte: (
      <Moldura>
        <p className="text-xs text-white/75">Lucro hoje</p>
        <p className="text-3xl font-extrabold">R$ 187,40</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full w-[68%] rounded-full bg-white" /></div>
        <p className="mt-1.5 text-[0.7rem] text-white/75">68% da meta · faltam ~2h no ritmo</p>
      </Moldura>
    ),
  },
  {
    titulo: "Alugue um carro ou anuncie o seu",
    texto: "Contrato pelo celular, Pix toda semana e vistoria com fotos. Com a mesma conta, você é motorista e locador.",
    arte: (
      <Moldura>
        <div className="flex items-center gap-3 rounded-xl bg-white p-3 text-[#0b1630]">
          <span className="grid size-10 place-items-center rounded-xl bg-[#e8efff] text-[#1f56e8]"><Wallet size={20} /></span>
          <div><p className="text-[0.7rem] text-[#5b6880]">Pix do aluguel</p><p className="font-extrabold text-[#0f8a4b]">Pago · R$ 600,00</p></div>
        </div>
      </Moldura>
    ),
  },
];

/** Boas-vindas do app: apresentação em telas que a pessoa passa para o lado, e depois criar conta ou entrar. */
export function CarrosselBoasVindas() {
  const trilho = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);
  const ir = (i: number) => trilho.current?.scrollTo({ left: i * trilho.current.clientWidth, behavior: "smooth" });
  const ultimo = atual === SLIDES.length - 1;

  return (
    <main className="fundo-marca flex h-dvh flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(1rem+env(safe-area-inset-bottom))] text-white">
      <div className="flex h-14 items-center justify-between px-5">
        <Marca inverso />
        {!ultimo && <button type="button" onClick={() => ir(SLIDES.length - 1)} className="text-sm font-semibold text-white/80">Pular</button>}
      </div>

      <div
        ref={trilho}
        onScroll={(e) => setAtual(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SLIDES.map((s) => (
          <section key={s.titulo} className="flex w-full shrink-0 snap-center flex-col justify-center gap-8 px-7">
            {s.arte}
            <div className="text-center">
              <h1 className="text-[1.65rem] leading-tight font-extrabold tracking-tight text-balance">{s.titulo}</h1>
              <p className="mx-auto mt-3 max-w-xs text-white/80">{s.texto}</p>
            </div>
          </section>
        ))}
      </div>

      <div className="flex justify-center gap-2 py-5" role="tablist" aria-label="Telas de apresentação">
        {SLIDES.map((s, i) => (
          <button key={s.titulo} type="button" role="tab" aria-selected={i === atual} aria-label={`Tela ${i + 1}`} onClick={() => ir(i)} className={`h-2 rounded-full transition-all ${i === atual ? "w-6 bg-white" : "w-2 bg-white/40"}`} />
        ))}
      </div>

      <div className="flex flex-col gap-2.5 px-5">
        <Link href="/entrar?modo=codigo&voltar=%2Fcomecar" className="grid h-13 place-items-center rounded-2xl bg-white text-[1rem] font-bold text-[#0b2a6b] shadow-flutuante">Criar conta grátis</Link>
        <Link href="/entrar" className="grid h-13 place-items-center rounded-2xl bg-white/10 text-[1rem] font-semibold ring-1 ring-white/25">Já tenho conta</Link>
      </div>
    </main>
  );
}
