"use client";

import { avisar } from "@/components/toast";
import { acaoSegura } from "@/lib/versao";
import { AppWindow, Bookmark, Clock, MapPin, MapPinOff, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import { Aviso, Botao, Cartao } from "@/components/ui";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { APPS_REGUA, type AppRegua, type Criterios, type FaixaHorario, NOME_APP_REGUA, normalizarCriterios, REGUA_APP_VAZIA, type ReguaApp } from "@/dominio/ganhos/custos";
import { salvarPerfisRegua, salvarReguaCompleta } from "@/lib/acoes-plantao";
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

export function EditorRegua({ inicial, perfisIniciais }: { inicial: Criterios; perfisIniciais: { nome: string; criterios: unknown }[] }) {
  const router = useRouter();
  const [c, setC] = useState(inicial);
  const [estado, setEstado] = useState<{ erro?: string; ok?: boolean }>({});
  const [salvando, iniciar] = useTransition();
  const mudar = (x: Partial<Criterios>) => (setEstado({}), setC((a) => ({ ...a, ...x })));
  const mudarFaixa = (i: number, x: Partial<FaixaHorario>) => mudar({ porHorario: c.porHorario.map((f, j) => (j === i ? { ...f, ...x } : f)) });

  return (
    <div className="flex flex-col gap-4">
      <Perfis atual={c} iniciais={perfisIniciais} aoUsar={(x) => mudar(x)} />
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
        <Interruptor titulo="Contar a volta para casa" texto="O lucro do cartão já desconta o custo de voltar vazio do destino até a sua base, e o cartão mostra “volta X km · R$ Y”. Defina a base em Ajustes do Copiloto; sem ela, usa onde você está (precisa da localização)." ligado={c.contarVolta} aoMudar={(v) => mudar({ contarVolta: v })} />
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

      <ReguaPorApp c={c} aoMudar={(porApp) => mudar({ porApp })} />

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
            const r = await acaoSegura(() => salvarReguaCompleta(c));
            setEstado(r);
            if ("ok" in r && r.ok) {
              avisar("Régua salva");
              router.refresh();
            } else if (r.erro) avisar(r.erro, "erro");
          })
        }
      >
        {salvando ? "Salvando…" : "Salvar régua"}
      </Botao>
    </div>
  );
}

/** Réguas salvas: troque de régua de uma vez (aqui ou pelo menu da bolha). */
function Perfis({ atual, iniciais, aoUsar }: { atual: Criterios; iniciais: { nome: string; criterios: unknown }[]; aoUsar: (c: Criterios) => void }) {
  const [perfis, setPerfis] = useState(iniciais);
  const [nome, setNome] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();
  const gravar = (lista: typeof perfis, msg: string) =>
    iniciar(async () => {
      const r = await acaoSegura(() => salvarPerfisRegua(lista));
      if ("ok" in r && r.ok) {
        setPerfis(lista);
        setAviso(msg);
        avisar(msg);
      } else setAviso(r.erro ?? "Não foi possível salvar.");
    });
  return (
    <Cartao className="flex flex-col gap-3">
      <div>
        <h2 className="flex items-center gap-2 font-bold"><Bookmark size={18} className="text-marca" /> Perfis de régua</h2>
        <p className="text-xs text-suave">Ex.: Dia, Noite, Aeroporto. Toque para usar; na bolha, segure e escolha “Perfil”.</p>
      </div>
      {!!perfis.length && (
        <div className="flex flex-wrap gap-2">
          {perfis.map((p) => (
            <span key={p.nome} className="inline-flex h-10 items-center gap-1 rounded-full border border-borda bg-cartao pr-1 pl-1">
              <button type="button" onClick={() => (aoUsar(normalizarCriterios(p.criterios)), setAviso(`Usando “${p.nome}”. Toque em Salvar régua para valer.`))} className="h-8 rounded-full px-3 text-sm font-semibold hover:bg-cartao-2">{p.nome}</button>
              <button type="button" aria-label={`Apagar ${p.nome}`} disabled={salvando} onClick={() => gravar(perfis.filter((x) => x.nome !== p.nome), `“${p.nome}” apagado.`)} className="grid size-8 place-items-center rounded-full text-suave hover:bg-cartao-2"><X size={14} /></button>
            </span>
          ))}
        </div>
      )}
      {perfis.length < 6 && (
        <div className="flex gap-2">
          <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={30} placeholder="Nome da régua atual (ex.: Noite)" className="h-11 min-w-0 flex-1 rounded-xl border border-borda bg-cartao px-3 text-sm outline-none focus:border-marca" />
          <Botao type="button" variante="secundario" icone={Plus} disabled={salvando || !nome.trim()} onClick={() => { const n = nome.trim(); gravar([...perfis.filter((x) => x.nome !== n), { nome: n, criterios: atual }], `Régua salva como “${n}”.`); setNome(""); }}>Salvar</Botao>
        </div>
      )}
      {aviso && <p className="text-sm text-suave">{aviso}</p>}
    </Cartao>
  );
}

/** Régua própria por aplicativo (opcional): campo vazio = usa a régua geral. */
function ReguaPorApp({ c, aoMudar }: { c: Criterios; aoMudar: (p: Criterios["porApp"]) => void }) {
  const [aberto, setAberto] = useState<AppRegua | null>(null);
  const mudarApp = (app: AppRegua, x: Partial<ReguaApp>) => {
    const novo = { ...(c.porApp[app] ?? REGUA_APP_VAZIA), ...x };
    const resto = { ...c.porApp };
    if (Object.values(novo).every((v) => v === null)) delete resto[app];
    else resto[app] = novo;
    aoMudar(resto);
  };
  const campo = (app: AppRegua, chave: Exclude<keyof ReguaApp, "buscaMaximaKm">, rotulo: string, geral: number) => (
    <label className="flex flex-col gap-1 text-xs font-semibold">
      {rotulo}
      <EntradaReais rotulo={`${NOME_APP_REGUA[app]}: ${rotulo}`} valor={c.porApp[app]?.[chave] ?? null} placeholder={geral ? `Geral: ${formatarBRL(geral)}` : "Geral: sem"} aoMudar={(v) => mudarApp(app, { [chave]: v })} />
    </label>
  );
  return (
    <Cartao className="flex flex-col gap-3">
      <div>
        <h2 className="flex items-center gap-2 font-bold"><AppWindow size={18} /> Régua por aplicativo</h2>
        <p className="text-xs text-suave">Opcional. Ex.: aceitar menos por km no inDrive e mais na Uber. Deixe em branco para usar a régua geral.</p>
      </div>
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-cartao-2 p-1">
        {APPS_REGUA.map((app) => (
          <button key={app} type="button" onClick={() => setAberto(aberto === app ? null : app)} aria-pressed={aberto === app} className={`relative h-9 rounded-lg text-xs font-semibold ${aberto === app ? "bg-cartao shadow-cartao" : "text-suave"}`}>
            {NOME_APP_REGUA[app]}
            {c.porApp[app] && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-marca" aria-label="tem régua própria" />}
          </button>
        ))}
      </div>
      {aberto && (
        <div key={aberto} className="flex flex-col gap-2 rounded-xl bg-cartao-2 p-3">
          <div className="grid grid-cols-2 gap-2">
            {campo(aberto, "minimoPorKm", "Mínimo por km", c.minimoPorKm)}
            {campo(aberto, "minimoPorHora", "Mínimo por hora", c.minimoPorHora)}
            {campo(aberto, "bomPorKm", "Boa por km a partir de", c.bomPorKm)}
            {campo(aberto, "bomPorHora", "Boa por hora a partir de", c.bomPorHora)}
            {campo(aberto, "valorMinimo", "Valor mínimo", c.valorMinimo)}
            <label className="flex flex-col gap-1 text-xs font-semibold">
              Busca máxima (km)
              <EntradaNumero rotulo={`${NOME_APP_REGUA[aberto]}: busca máxima`} valor={c.porApp[aberto]?.buscaMaximaKm ?? null} placeholder={c.buscaMaximaKm ? `Geral: ${c.buscaMaximaKm}` : "Geral: sem"} aoMudar={(v) => mudarApp(aberto, { buscaMaximaKm: v })} />
            </label>
          </div>
          {c.porApp[aberto] && (
            <button type="button" onClick={() => { const resto = { ...c.porApp }; delete resto[aberto]; aoMudar(resto); }} className="self-start text-xs font-semibold text-perigo">Usar a régua geral no {NOME_APP_REGUA[aberto]}</button>
          )}
        </div>
      )}
    </Cartao>
  );
}
