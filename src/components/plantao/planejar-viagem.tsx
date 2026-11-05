"use client";

import { Crosshair, Flag, LoaderCircle, MapPin, Route } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Aviso, Botao, Cartao } from "@/components/ui";
import type { Centavos } from "@/dominio/dinheiro/centavos";
import type { Praca } from "@/dominio/ganhos/rota";
import { buscarEnderecos, planejarViagem } from "@/lib/acoes-viagem";
import { acaoSegura } from "@/lib/versao";
import { EntradaReais } from "./entradas";

export type Lugar = { nome: string; lat: number; lon: number };

/** Campo de endereço com sugestões (OpenStreetMap) e, na origem, "usar minha localização". */
export function CampoLugar({ rotulo, icone: Icone, valor, aoEscolher, perto, comLocalizacao = false }: { rotulo: string; icone: typeof MapPin; valor: Lugar | null; aoEscolher: (l: Lugar | null) => void; perto: Lugar | null; comLocalizacao?: boolean }) {
  const [texto, setTexto] = useState(valor?.nome ?? "");
  const [sugestoes, setSugestoes] = useState<Lugar[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const ultimo = useRef("");
  useEffect(() => setTexto(valor?.nome ?? ""), [valor]);
  useEffect(() => {
    const q = texto.trim();
    if (q.length < 3 || q === valor?.nome) return setSugestoes([]);
    // Espera a pessoa parar de digitar (e o serviço de mapas pede para não exagerar).
    const t = setTimeout(async () => {
      ultimo.current = q;
      setBuscando(true);
      const r = await buscarEnderecos(q, perto).catch(() => []);
      if (ultimo.current === q) (setSugestoes(r), setBuscando(false));
    }, 450);
    return () => clearTimeout(t);
  }, [texto, valor, perto]);
  function localizar() {
    if (!navigator.geolocation) return;
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      (p) => (aoEscolher({ nome: "Minha localização", lat: p.coords.latitude, lon: p.coords.longitude }), setLocalizando(false)),
      () => setLocalizando(false),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }
  return (
    <div className="relative flex flex-col gap-1.5">
      <span className="text-sm font-medium">{rotulo}</span>
      <div className="flex gap-2">
        <span className="relative flex-1">
          <Icone size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-suave" />
          <input
            value={texto}
            onChange={(e) => (setTexto(e.target.value), valor && aoEscolher(null))}
            placeholder="Cidade, bairro ou endereço"
            aria-label={rotulo}
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-borda bg-cartao pr-3 pl-9 text-sm outline-none focus:border-marca"
          />
          {buscando && <LoaderCircle size={16} className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-suave" />}
        </span>
        {comLocalizacao && (
          <button type="button" onClick={localizar} aria-label="Usar minha localização" className="grid size-11 shrink-0 place-items-center rounded-xl border border-borda bg-cartao text-marca">
            {localizando ? <LoaderCircle size={18} className="animate-spin" /> : <Crosshair size={18} />}
          </button>
        )}
      </div>
      {sugestoes.length > 0 && (
        <ul className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-xl border border-borda bg-cartao shadow-flutuante">
          {sugestoes.map((s) => (
            <li key={`${s.lat},${s.lon}`}>
              <button type="button" className="w-full px-3 py-2.5 text-left text-sm hover:bg-cartao-2" onClick={() => (aoEscolher(s), setSugestoes([]))}>{s.nome}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const horas = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}` : `${min} min`);

/**
 * Planejar a viagem: de onde, para onde. Acha a rota (km e tempo) e as praças de
 * pedágio no caminho; o preço de cada praça vem do mapa quando ele tem, senão a
 * pessoa digita. Devolve tudo para a calculadora de viagem fazer as contas.
 */
export function PlanejarViagem({ aoCalcular }: { aoCalcular: (r: { km: number; minutos: number; pedagioIda: Centavos; pracas: number; semPreco: number }) => void }) {
  const [origem, setOrigem] = useState<Lugar | null>(null);
  const [destino, setDestino] = useState<Lugar | null>(null);
  const [rota, setRota] = useState<{ km: number; minutos: number } | null>(null);
  const [pracas, setPracas] = useState<Praca[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [calculando, iniciar] = useTransition();

  function avisar(lista: Praca[], r = rota) {
    if (!r) return;
    aoCalcular({ km: r.km, minutos: r.minutos, pedagioIda: lista.reduce((s, p) => s + (p.preco ?? 0), 0), pracas: lista.length, semPreco: lista.filter((p) => p.preco === null).length });
  }
  function calcular() {
    if (!origem || !destino) return;
    setErro(null);
    iniciar(async () => {
      const r = await acaoSegura(() => planejarViagem(origem, destino));
      if ("erro" in r) return setErro(r.erro);
      const nova = { km: r.km, minutos: r.minutos };
      setRota(nova);
      setPracas(r.pracas);
      avisar(r.pracas, nova);
    });
  }
  function mudarPreco(i: number, preco: Centavos | null) {
    const lista = pracas.map((p, j) => (j === i ? { ...p, preco } : p));
    setPracas(lista);
    avisar(lista);
  }

  return (
    <Cartao className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 font-bold"><Route size={18} className="text-marca" /> De onde para onde</h2>
      <CampoLugar rotulo="Saindo de" icone={MapPin} valor={origem} aoEscolher={setOrigem} perto={null} comLocalizacao />
      <CampoLugar rotulo="Indo para" icone={Flag} valor={destino} aoEscolher={setDestino} perto={origem} />
      <Botao icone={Route} disabled={!origem || !destino || calculando} onClick={calcular}>{calculando ? "Procurando a rota…" : "Calcular rota e pedágios"}</Botao>
      {erro && <Aviso tom="perigo">{erro}</Aviso>}
      {rota && (
        <>
          <p className="text-sm">
            <strong>{rota.km.toLocaleString("pt-BR")} km</strong> · cerca de <strong>{horas(rota.minutos)}</strong> só a ida, sem trânsito.
          </p>
          {pracas.length ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">{pracas.length} praça{pracas.length > 1 ? "s" : ""} de pedágio no caminho (ida)</span>
              {pracas.map((p, i) => (
                <div key={`${p.lat},${p.lon}`} className="grid grid-cols-[1fr_8rem] items-center gap-2">
                  <span className="truncate text-sm">{p.nome}</span>
                  <EntradaReais rotulo={`Preço em ${p.nome}`} valor={p.preco} placeholder="Preço" aoMudar={(v) => mudarPreco(i, v)} />
                </div>
              ))}
              {pracas.some((p) => p.preco === null) && <p className="text-xs text-suave">O mapa não traz o preço de todas as praças: confira no site da concessionária e digite o valor para carro.</p>}
            </div>
          ) : (
            <p className="text-xs text-suave">Nenhuma praça de pedágio encontrada no caminho pelo mapa. Se souber de alguma, some no campo Pedágios abaixo.</p>
          )}
        </>
      )}
    </Cartao>
  );
}
