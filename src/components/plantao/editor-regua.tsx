"use client";

import { Clock, MapPin, MapPinOff, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import { Aviso, Botao, Cartao } from "@/components/ui";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { type Criterios, type FaixaHorario } from "@/dominio/ganhos/custos";
import { salvarReguaCompleta } from "@/lib/acoes-plantao";
import { EntradaNumero, EntradaReais } from "./entradas";

/** Barra que mostra a faixa: vermelho até o mínimo, âmbar até o bom, verde depois. */
function BarraFaixa({ minimo, bom, maximo }: { minimo: number; bom: number; maximo: number }) {
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / maximo) * 100))}%`;
  const fimAmbar = bom > 0 ? bom : minimo;
  const inicioAmbar = bom > 0 ? minimo : minimo * 0.85;
  return (
    <div className="relative mt-1 h-2.5 overflow-hidden rounded-full bg-[#16a34a]" aria-hidden>
      <div className="absolute inset-y-0 left-0 bg-[#d97706]" style={{ width: pct(fimAmbar) }} />
      <div className="absolute inset-y-0 left-0 bg-[#dc2626]" style={{ width: pct(inicioAmbar) }} />
    </div>
  );
}

function Faixa({ titulo, minimo, bom, aoMudar, maximo, formatar }: { titulo: string; minimo: number; bom: number; aoMudar: (m: number, b: number) => void; maximo: number; formatar: (v: number) => string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-cartao-2 p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-bold">{titulo}</p>
        <p className="text-xs text-suave tabular-nums">
          <span className="text-perigo">&lt; {formatar(minimo)}</span> · <span className="text-ok">{bom > 0 ? `≥ ${formatar(bom)}` : `≥ ${formatar(minimo)}`}</span>
        </p>
      </div>
      <BarraFaixa minimo={minimo} bom={bom} maximo={maximo} />
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-perigo">Ruim abaixo de<EntradaReais rotulo={`${titulo}: ruim abaixo de`} valor={minimo} aoMudar={(v) => aoMudar(v ?? 0, bom)} /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-ok">Boa a partir de<EntradaReais rotulo={`${titulo}: boa a partir de`} valor={bom || null} placeholder="= mínimo" aoMudar={(v) => aoMudar(minimo, v ?? 0)} /></label>
      </div>
    </div>
  );
}

function Interruptor({ titulo, texto, ligado, aoMudar }: { titulo: string; texto: string; ligado: boolean; aoMudar: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2">
      <span><span className="block text-sm font-semibold">{titulo}</span><span className="block text-xs text-suave">{texto}</span></span>
      <input type="checkbox" checked={ligado} onChange={(e) => aoMudar(e.target.checked)} className="peer sr-only" />
      <span className="relative h-7 w-12 shrink-0 rounded-full bg-borda-forte transition-colors peer-checked:bg-marca after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
    </label>
  );
}

function Lista({ titulo, icone, texto, lista, aoMudar, tom, exemplo }: { titulo: string; icone: ReactNode; texto: string; lista: string[]; aoMudar: (l: string[]) => void; tom: "perigo" | "ok"; exemplo: string }) {
  const [novo, setNovo] = useState("");
  const adicionar = () => {
    const t = novo.trim().replace(/\s+/g, " ");
    if (t.length >= 3 && !lista.some((x) => x.toLowerCase() === t.toLowerCase())) aoMudar([...lista, t]);
    setNovo("");
  };
  return (
    <Cartao className="flex flex-col gap-3">
      <div>
        <h2 className="flex items-center gap-2 font-bold">{icone} {titulo}</h2>
        <p className="text-xs text-suave">{texto}</p>
      </div>
      <div className="flex gap-2">
        <input value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), adicionar())} placeholder={exemplo} maxLength={60} className="h-11 min-w-0 flex-1 rounded-xl border border-borda bg-cartao px-3 text-sm outline-none focus:border-marca" />
        <Botao type="button" variante="secundario" icone={Plus} onClick={adicionar} aria-label={`Adicionar a ${titulo}`} />
      </div>
      {!!lista.length && (
        <div className="flex flex-wrap gap-2">
          {lista.map((l) => (
            <span key={l} className={`inline-flex h-9 items-center gap-1 rounded-full pr-1 pl-3 text-sm font-semibold ${tom === "perigo" ? "bg-perigo-suave text-perigo" : "bg-ok-suave text-ok"}`}>
              {l}
              <button type="button" aria-label={`Tirar ${l}`} onClick={() => aoMudar(lista.filter((x) => x !== l))} className="grid size-7 place-items-center rounded-full hover:bg-black/5"><X size={14} /></button>
            </span>
          ))}
        </div>
      )}
    </Cartao>
  );
}

const reais = (c: number) => formatarBRL(c).replace(",00", "");

export function EditorRegua({ inicial }: { inicial: Criterios }) {
  const router = useRouter();
  const [c, setC] = useState(inicial);
  const [estado, setEstado] = useState<{ erro?: string; ok?: boolean }>({});
  const [salvando, iniciar] = useTransition();
  const mudar = (x: Partial<Criterios>) => (setEstado({}), setC((a) => ({ ...a, ...x })));
  const mudarFaixa = (i: number, x: Partial<FaixaHorario>) => mudar({ porHorario: c.porHorario.map((f, j) => (j === i ? { ...f, ...x } : f)) });

  return (
    <div className="flex flex-col gap-4">
      <Cartao className="flex flex-col gap-3">
        <div>
          <h2 className="font-bold">Ganho</h2>
          <p className="text-xs text-suave">Vermelho abaixo do mínimo, verde a partir do “boa”, âmbar no meio. Deixe “boa” vazio para usar só o mínimo.</p>
        </div>
        <Faixa titulo="Por km" minimo={c.minimoPorKm} bom={c.bomPorKm} maximo={Math.max(400, c.bomPorKm * 1.4, c.minimoPorKm * 1.6)} formatar={formatarBRL} aoMudar={(m, b) => mudar({ minimoPorKm: m, bomPorKm: b })} />
        <Faixa titulo="Por hora" minimo={c.minimoPorHora} bom={c.bomPorHora} maximo={Math.max(8000, c.bomPorHora * 1.4, c.minimoPorHora * 1.6)} formatar={reais} aoMudar={(m, b) => mudar({ minimoPorHora: m, bomPorHora: b })} />
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1 text-xs font-semibold">Valor mínimo<EntradaReais rotulo="Valor mínimo da corrida" valor={c.valorMinimo || null} placeholder="Sem" aoMudar={(v) => mudar({ valorMinimo: v ?? 0 })} /></label>
          <label className="flex flex-col gap-1 text-xs font-semibold">Lucro mínimo<EntradaReais rotulo="Lucro mínimo" valor={c.lucroMinimo || null} placeholder="Sem" aoMudar={(v) => mudar({ lucroMinimo: v ?? 0 })} /></label>
          <label className="flex flex-col gap-1 text-xs font-semibold">Margem mín.<EntradaNumero rotulo="Margem de lucro mínima" inteiro valor={c.lucroMinimoBps ? c.lucroMinimoBps / 100 : null} sufixo="%" placeholder="Sem" aoMudar={(v) => mudar({ lucroMinimoBps: Math.min(90, v ?? 0) * 100 })} /></label>
        </div>
      </Cartao>

      <Cartao className="flex flex-col gap-3">
        <div>
          <h2 className="font-bold">Embarque e viagem</h2>
          <p className="text-xs text-suave">Deixe vazio para não ter limite. Passou um pouco: âmbar. Passou da metade a mais: vermelho.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs font-semibold">Passageiro a até<EntradaNumero rotulo="Distância máxima até o passageiro" valor={c.buscaMaximaKm || null} sufixo="km" placeholder="Sem" aoMudar={(v) => mudar({ buscaMaximaKm: v ?? 0 })} /></label>
          <label className="flex flex-col gap-1 text-xs font-semibold">Embarque em até<EntradaNumero rotulo="Tempo máximo até o passageiro" inteiro valor={c.buscaMaximaMin || null} sufixo="min" placeholder="Sem" aoMudar={(v) => mudar({ buscaMaximaMin: v ?? 0 })} /></label>
          <label className="flex flex-col gap-1 text-xs font-semibold">Viagem de até<EntradaNumero rotulo="Distância máxima da viagem" valor={c.viagemMaximaKm || null} sufixo="km" placeholder="Sem" aoMudar={(v) => mudar({ viagemMaximaKm: v ?? 0 })} /></label>
          <label className="flex flex-col gap-1 text-xs font-semibold">Viagem em até<EntradaNumero rotulo="Tempo máximo da viagem" inteiro valor={c.viagemMaximaMin || null} sufixo="min" placeholder="Sem" aoMudar={(v) => mudar({ viagemMaximaMin: v ?? 0 })} /></label>
        </div>
        <Interruptor titulo="Contar a volta para casa" texto="Desconta o custo de voltar vazio do destino até a sua base (defina a base no Copiloto)." ligado={c.contarVolta} aoMudar={(v) => mudar({ contarVolta: v })} />
      </Cartao>

      <Cartao className="flex flex-col gap-1">
        <h2 className="font-bold">Passageiro</h2>
        <label className="flex items-center justify-between gap-3 py-2">
          <span><span className="block text-sm font-semibold">Nota mínima</span><span className="block text-xs text-suave">Abaixo: âmbar. Vazio: não olha a nota.</span></span>
          <EntradaNumero rotulo="Nota mínima do passageiro" valor={c.notaMinima || null} sufixo="★" placeholder="Sem" className="w-28" aoMudar={(v) => mudar({ notaMinima: Math.min(5, v ?? 0) })} />
        </label>
        <Interruptor titulo="Avisar passageiro novo" texto="Menos de 5 corridas no app." ligado={c.alertaPassageiroNovo} aoMudar={(v) => mudar({ alertaPassageiroNovo: v })} />
        <Interruptor titulo="Avisar corrida com parada" texto="Quando a oferta tem mais de um destino." ligado={c.alertaParadas} aoMudar={(v) => mudar({ alertaParadas: v })} />
      </Cartao>

      <Cartao className="flex flex-col gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold"><Clock size={18} /> Régua por horário</h2>
          <p className="text-xs text-suave">Mínimos diferentes em certas horas (ex.: madrugada mais caro). Fora das faixas vale a régua de cima.</p>
        </div>
        {c.porHorario.map((f, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl bg-cartao-2 p-3">
            <div className="flex items-center gap-2">
              <input aria-label="Nome da faixa" value={f.nome} onChange={(e) => mudarFaixa(i, { nome: e.target.value })} className="h-9 min-w-0 flex-1 rounded-lg border border-borda bg-cartao px-2.5 text-sm font-semibold outline-none focus:border-marca" />
              <input aria-label="Começa" type="time" value={f.de} onChange={(e) => mudarFaixa(i, { de: e.target.value })} className="h-9 rounded-lg border border-borda bg-cartao px-2 text-sm" />
              <span className="text-xs text-suave">às</span>
              <input aria-label="Termina" type="time" value={f.ate} onChange={(e) => mudarFaixa(i, { ate: e.target.value })} className="h-9 rounded-lg border border-borda bg-cartao px-2 text-sm" />
              <button type="button" aria-label={`Remover ${f.nome}`} onClick={() => mudar({ porHorario: c.porHorario.filter((_, j) => j !== i) })} className="grid size-9 place-items-center rounded-full text-suave hover:bg-cartao"><Trash2 size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs font-semibold">Mínimo por km<EntradaReais rotulo={`${f.nome}: mínimo por km`} valor={f.minimoPorKm} aoMudar={(v) => mudarFaixa(i, { minimoPorKm: v ?? 0 })} /></label>
              <label className="flex flex-col gap-1 text-xs font-semibold">Mínimo por hora<EntradaReais rotulo={`${f.nome}: mínimo por hora`} valor={f.minimoPorHora} aoMudar={(v) => mudarFaixa(i, { minimoPorHora: v ?? 0 })} /></label>
            </div>
          </div>
        ))}
        {c.porHorario.length < 6 && (
          <button
            type="button"
            onClick={() => mudar({ porHorario: [...c.porHorario, { nome: c.porHorario.length ? "Pico" : "Madrugada", de: c.porHorario.length ? "17:00" : "22:00", ate: c.porHorario.length ? "20:00" : "05:00", minimoPorKm: Math.round(c.minimoPorKm * 1.2), minimoPorHora: Math.round(c.minimoPorHora * 1.2), bomPorKm: 0, bomPorHora: 0 }] })}
            className="inline-flex h-9 items-center gap-1 self-start rounded-full border border-dashed border-borda-forte px-3 text-xs font-semibold text-suave hover:text-texto"
          >
            <Plus size={14} /> Faixa de horário
          </button>
        )}
      </Cartao>

      <Lista titulo="Lugares a evitar" icone={<MapPinOff size={18} className="text-perigo" />} texto="Rua, bairro ou palavra. Se o embarque ou o destino tiver isso, a oferta fica vermelha. O botão “Evitar este lugar” da bolha também adiciona aqui." lista={c.evitar} aoMudar={(evitar) => mudar({ evitar })} tom="perigo" exemplo="Ex.: Morro do Papagaio" />
      <Lista titulo="Destinos desejados" icone={<MapPin size={18} className="text-ok" />} texto="Lugares para onde você gosta de ir (perto de casa, aeroporto). A oferta ganha um selo verde." lista={c.destinosDesejados} aoMudar={(destinosDesejados) => mudar({ destinosDesejados })} tom="ok" exemplo="Ex.: Contagem" />

      {estado.erro && <Aviso tom="perigo">{estado.erro}</Aviso>}
      {estado.ok && <Aviso tom="ok">Régua salva. A bolha recebe na próxima vez que você abrir o Aluguei.</Aviso>}
      <Botao
        tamanho="lg"
        icone={Save}
        disabled={salvando}
        className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] w-full"
        onClick={() =>
          iniciar(async () => {
            const r = await salvarReguaCompleta(c);
            setEstado(r);
            if (r.ok) router.refresh();
          })
        }
      >
        {salvando ? "Salvando…" : "Salvar régua"}
      </Botao>
    </div>
  );
}
