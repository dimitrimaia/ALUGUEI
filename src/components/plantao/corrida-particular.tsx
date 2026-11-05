"use client";

import { Flag, MapPin, Plus, Route, Share2, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { avisar } from "@/components/toast";
import { Aviso, Botao, Cartao, DadoRotulado } from "@/components/ui";
import { type Centavos, formatarBRL } from "@/dominio/dinheiro/centavos";
import { type Criterios, type PerfilCusto, taxas } from "@/dominio/ganhos/custos";
import type { Praca } from "@/dominio/ganhos/rota";
import { precoCorridaParticular } from "@/dominio/ganhos/viagem";
import { planejarCorrida } from "@/lib/acoes-viagem";
import { acaoSegura } from "@/lib/versao";
import { EntradaReais } from "./entradas";
import { CampoLugar, type Lugar } from "./planejar-viagem";

const MAXIMO_PARADAS = 4;
const horas = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h${String(Math.round(min % 60)).padStart(2, "0")}` : `${Math.round(min)} min`);

/**
 * Corrida particular: alguém pediu para levar. De onde sai, paradas e destino; o
 * app acha a rota e os pedágios e diz quanto cobrar pela régua do motorista (o
 * menor valor que fica verde). Com mais passageiros, eles dividem o mesmo valor.
 */
export function CorridaParticular({ perfil, criterios }: { perfil: PerfilCusto; criterios: Criterios }) {
  const [origem, setOrigem] = useState<Lugar | null>(null);
  const [paradas, setParadas] = useState<(Lugar | null)[]>([]);
  const [destino, setDestino] = useState<Lugar | null>(null);
  const [volta, setVolta] = useState(false);
  const [passageiros, setPassageiros] = useState(1);
  const [rota, setRota] = useState<{ km: number; minutos: number } | null>(null);
  const [pracas, setPracas] = useState<Praca[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [calculando, iniciar] = useTransition();
  const t = useMemo(() => taxas(perfil), [perfil]);
  const pronto = Boolean(origem && destino && paradas.every(Boolean));
  const pedagios = pracas.reduce((s, p) => s + (p.preco ?? 0), 0) * (volta ? 2 : 1);
  const r = rota ? precoCorridaParticular({ km: rota.km, minutos: rota.minutos, pedagios, volta }, t, criterios) : null;

  const limpar = () => (setRota(null), setPracas([]));
  function calcular() {
    if (!pronto) return;
    setErro(null);
    iniciar(async () => {
      const res = await acaoSegura(() => planejarCorrida([origem, ...paradas, destino]));
      if ("erro" in res) return setErro(res.erro);
      setRota({ km: res.km, minutos: res.minutos });
      setPracas(res.pracas);
    });
  }
  async function compartilhar() {
    if (!r || !origem || !destino) return;
    const cada = passageiros > 1 ? ` (${formatarBRL(r.porPessoa(passageiros))} por pessoa, ${passageiros} pessoas)` : "";
    const texto = `Corrida de ${origem.nome.split(" · ")[0]} até ${destino.nome.split(" · ")[0]}${paradas.length ? ` com ${paradas.length} parada${paradas.length > 1 ? "s" : ""}` : ""}: ${formatarBRL(r.valor)}${cada}.`;
    try {
      if (navigator.share) await navigator.share({ text: texto });
      else (await navigator.clipboard.writeText(texto), avisar("Mensagem copiada"));
    } catch {}
  }

  return (
    <>
      <Cartao className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-bold"><Route size={18} className="text-marca" /> Corrida particular</h2>
        <p className="-mt-2 text-xs text-suave">Alguém pediu para levar? Monte o caminho e veja quanto cobrar pela sua régua.</p>
        <CampoLugar rotulo="Saindo de" icone={MapPin} valor={origem} aoEscolher={(l) => (setOrigem(l), limpar())} perto={null} comLocalizacao />
        {paradas.map((p, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="flex-1"><CampoLugar rotulo={`Parada ${i + 1}`} icone={MapPin} valor={p} aoEscolher={(l) => (setParadas((lista) => lista.map((x, j) => (j === i ? l : x))), limpar())} perto={origem} /></div>
            <button type="button" aria-label={`Tirar a parada ${i + 1}`} onClick={() => (setParadas((lista) => lista.filter((_, j) => j !== i)), limpar())} className="mb-0.5 grid size-11 place-items-center rounded-xl border border-borda bg-cartao text-suave"><X size={18} /></button>
          </div>
        ))}
        {paradas.length < MAXIMO_PARADAS && (
          <button type="button" onClick={() => (setParadas((l) => [...l, null]), limpar())} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-marca"><Plus size={16} /> Adicionar parada</button>
        )}
        <CampoLugar rotulo="Destino final" icone={Flag} valor={destino} aoEscolher={(l) => (setDestino(l), limpar())} perto={origem} />
        <label className="flex items-center justify-between gap-3 rounded-xl bg-cartao-2 px-3 py-2.5 text-sm font-medium">
          <span>Contar a volta vazia até a saída<span className="block text-xs font-normal text-suave">Se depois você volta sem passageiro</span></span>
          <input type="checkbox" checked={volta} onChange={(e) => setVolta(e.target.checked)} className="size-5 accent-[var(--marca)]" />
        </label>
        <Botao icone={Route} disabled={!pronto || calculando} onClick={calcular}>{calculando ? "Calculando a rota…" : "Calcular quanto cobrar"}</Botao>
        {erro && <Aviso tom="perigo">{erro}</Aviso>}
      </Cartao>

      {r && rota && (
        <Cartao className="flex flex-col gap-3">
          <div className="rounded-2xl bg-marca p-4 text-white">
            <p className="text-sm text-white/80">Cobre {passageiros > 1 ? "no total" : ""}</p>
            <p className="text-3xl font-extrabold tabular-nums">{formatarBRL(r.valor)}</p>
            {passageiros > 1 && <p className="mt-1 text-sm font-semibold">{formatarBRL(r.porPessoa(passageiros))} por pessoa</p>}
            <p className="mt-1 text-xs text-white/75">{rota.km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km · {horas(rota.minutos)}{volta ? " (só a ida; a volta já está no preço)" : ""}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Passageiros</span>
            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map((n) => (
                <button key={n} type="button" aria-pressed={passageiros === n} onClick={() => setPassageiros(n)} className={`h-10 rounded-xl text-sm font-bold ${passageiros === n ? "bg-marca text-white" : "bg-cartao-2 text-suave"}`}>{n}</button>
              ))}
            </div>
            <span className="text-xs text-suave">O valor é o mesmo; com mais gente, eles dividem.</span>
          </div>
          {pracas.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Pedágios no caminho{volta ? " (contam ida e volta)" : ""}</span>
              {pracas.map((p, i) => (
                <div key={`${p.lat},${p.lon}`} className="grid grid-cols-[1fr_8rem] items-center gap-2">
                  <span className="truncate text-sm">{p.nome}</span>
                  <EntradaReais rotulo={`Preço em ${p.nome}`} valor={p.preco} placeholder="Preço" aoMudar={(v: Centavos | null) => setPracas((l) => l.map((x, j) => (j === i ? { ...x, preco: v } : x)))} />
                </div>
              ))}
            </div>
          )}
          <dl className="divide-y divide-borda">
            <DadoRotulado rotulo="Custo da corrida">{formatarBRL(r.custo)}</DadoRotulado>
            <DadoRotulado rotulo="Seu lucro">{<span className="font-semibold text-ok">{formatarBRL(r.lucro)}</span>}</DadoRotulado>
            {pedagios > 0 && <DadoRotulado rotulo="Pedágios (repassados)">{formatarBRL(pedagios)}</DadoRotulado>}
          </dl>
          <p className="text-xs text-suave">É o menor valor que fica verde na sua régua ({formatarBRL(criterios.minimoPorKm)}/km e {formatarBRL(criterios.minimoPorHora)}/h). Mude a régua no Copiloto, se quiser cobrar diferente.</p>
          <Botao variante="secundario" icone={Share2} onClick={compartilhar}>Mandar o valor para o cliente</Botao>
        </Cartao>
      )}
    </>
  );
}
