"use client";

import { Camera, Check, ImagePlus, Loader2, RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Aviso, Botao, Cartao, classeAreaTexto, classeEntrada } from "@/components/ui";
import { FOTOS_VISTORIA, ITENS_CHECKLIST, type EstadoItem, type IdItem, combustivelPorExtenso } from "@/dominio/vistoria/roteiro";
import { comprimirImagem } from "@/lib/comprimir-imagem";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import { concluirVistoria, prepararFoto, registrarFoto } from "./acoes";

type Foto = { evidenciaId?: string; url?: string | null; estado: "enviando" | "pronta" | "erro"; erro?: string };
type Posicao = { latitude: number; longitude: number; precisao: number };

const ESTADOS: { id: EstadoItem; rotulo: string }[] = [
  { id: "ok", rotulo: "OK" },
  { id: "avaria", rotulo: "Avaria" },
  { id: "ausente", rotulo: "Falta" },
];

function carimbo(posicao: Posicao | null) {
  const agora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
  return posicao ? `${agora} · ${posicao.latitude.toFixed(5)}, ${posicao.longitude.toFixed(5)}` : agora;
}

export function VistoriaEntrega({
  contratoId,
  odometroAtual,
  fotosIniciais,
  extrasIniciais,
  tipo = "entrega",
}: {
  tipo?: "entrega" | "devolucao";
  contratoId: string;
  odometroAtual: number;
  fotosIniciais: Record<string, { evidenciaId: string; url: string | null }>;
  extrasIniciais: { evidenciaId: string; url: string | null }[];
}) {
  const [fotos, setFotos] = useState<Record<string, Foto>>(() =>
    Object.fromEntries(Object.entries(fotosIniciais).map(([k, v]) => [k, { ...v, estado: "pronta" as const }])),
  );
  const [extras, setExtras] = useState<Foto[]>(() => extrasIniciais.map((e) => ({ ...e, estado: "pronta" as const })));
  const [odometro, setOdometro] = useState(String(odometroAtual));
  const [combustivel, setCombustivel] = useState(8);
  const [itens, setItens] = useState<Record<string, { estado?: EstadoItem; observacao: string }>>({});
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [concluindo, iniciar] = useTransition();
  const posicao = useRef<Posicao | null>(null);
  const [semLocalizacao, setSemLocalizacao] = useState(false);

  useEffect(() => {
    const id = navigator.geolocation?.watchPosition(
      (p) => { posicao.current = { latitude: p.coords.latitude, longitude: p.coords.longitude, precisao: p.coords.accuracy }; setSemLocalizacao(false); },
      () => setSemLocalizacao(true),
      { enableHighAccuracy: true, maximumAge: 30_000 },
    );
    return () => { if (id !== undefined) navigator.geolocation.clearWatch(id); };
  }, []);

  async function enviar(foto: string, arquivo: File): Promise<Foto> {
    try {
      const pronta = await comprimirImagem(arquivo, { carimbo: carimbo(posicao.current) });
      const { caminho, token } = await prepararFoto(contratoId, foto as never, tipo);
      const { error } = await supabaseNavegador().storage.from("evidencias").uploadToSignedUrl(caminho, token, pronta, { contentType: "image/jpeg" });
      if (error) throw new Error(error.message);
      const p = posicao.current;
      const r = await registrarFoto(contratoId, {
        caminho,
        foto: foto as never,
        latitude: p?.latitude,
        longitude: p?.longitude,
        precisao: p?.precisao,
        capturadoEm: new Date(arquivo.lastModified || Date.now()).toISOString(),
      }, tipo);
      if (!r.ok) return { estado: "erro", erro: r.erro };
      return { estado: "pronta", evidenciaId: r.evidenciaId, url: r.url };
    } catch {
      return { estado: "erro", erro: "Falhou o envio. Toque para tentar de novo." };
    }
  }

  async function aoEscolher(foto: string, arquivo: File | undefined) {
    if (!arquivo) return;
    setFotos((a) => ({ ...a, [foto]: { estado: "enviando", url: URL.createObjectURL(arquivo) } }));
    const r = await enviar(foto, arquivo);
    setFotos((a) => ({ ...a, [foto]: { ...r, url: r.url ?? a[foto]?.url } }));
  }

  async function aoEscolherExtra(arquivo: File | undefined) {
    if (!arquivo) return;
    const indice = extras.length;
    setExtras((a) => [...a, { estado: "enviando", url: URL.createObjectURL(arquivo) }]);
    const r = await enviar("extra", arquivo);
    setExtras((a) => a.map((x, i) => (i === indice ? { ...r, url: r.url ?? x.url } : x)));
  }

  const prontas = FOTOS_VISTORIA.filter((f) => fotos[f.id]?.estado === "pronta").length;
  const marcados = ITENS_CHECKLIST.filter((i) => itens[i.id]?.estado).length;
  const enviando = Object.values(fotos).some((f) => f.estado === "enviando") || extras.some((f) => f.estado === "enviando");
  const faltam = FOTOS_VISTORIA.length - prontas + (ITENS_CHECKLIST.length - marcados);

  function concluir() {
    setErro(null);
    const km = Number(odometro.replace(/\D/g, ""));
    if (!km) return setErro("Informe o km do painel.");
    const semDescricao = ITENS_CHECKLIST.find((i) => itens[i.id]?.estado && itens[i.id]?.estado !== "ok" && !itens[i.id]?.observacao.trim());
    if (semDescricao) return setErro(`Descreva o problema em “${semDescricao.rotulo}”.`);
    iniciar(async () => {
      const r = await concluirVistoria(contratoId, {
        odometro: km,
        combustivelOitavos: combustivel,
        fotos: Object.fromEntries(Object.entries(fotos).filter(([, f]) => f.evidenciaId).map(([k, f]) => [k, f.evidenciaId!])),
        fotosExtras: extras.filter((f) => f.evidenciaId).map((f) => f.evidenciaId!),
        itens: ITENS_CHECKLIST.filter((i) => itens[i.id]?.estado).map((i) => ({
          item: i.id,
          estado: itens[i.id]!.estado!,
          observacao: itens[i.id]!.observacao || undefined,
        })),
        observacoes: observacoes || undefined,
      }, tipo);
      if (r?.erro) setErro(r.erro);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {semLocalizacao && (
        <Aviso tom="alerta" titulo="Localização desligada">Ative a localização do celular: ela entra no carimbo das fotos como prova.</Aviso>
      )}

      <Cartao>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Fotos obrigatórias</p>
            <p className="text-sm text-suave">Use a câmera. Cada foto recebe data, hora e local.</p>
          </div>
          <span className="text-sm font-semibold text-marca">{prontas}/{FOTOS_VISTORIA.length}</span>
        </div>
        <div className="mb-4 h-1.5 rounded-full bg-borda">
          <div className="h-1.5 rounded-full bg-marca transition-all" style={{ width: `${(prontas / FOTOS_VISTORIA.length) * 100}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FOTOS_VISTORIA.map((f) => (
            <SlotFoto key={f.id} rotulo={f.rotulo} dica={f.dica} foto={fotos[f.id]} onArquivo={(a) => aoEscolher(f.id, a)} />
          ))}
          {extras.map((f, i) => (
            <SlotFoto key={`extra${i}`} rotulo={`Detalhe ${i + 1}`} foto={f} onArquivo={() => {}} />
          ))}
          <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-borda-forte text-center text-sm font-medium text-suave hover:bg-cartao-2">
            <ImagePlus size={22} aria-hidden />
            Foto de detalhe
            <span className="text-xs font-normal">riscos, amassados…</span>
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { aoEscolherExtra(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        </div>
      </Cartao>

      <Cartao className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Km no painel</span>
          <input inputMode="numeric" value={odometro} onChange={(e) => setOdometro(e.target.value)} className={`${classeEntrada} text-lg font-semibold`} />
          <span className="text-xs text-suave">Último registrado: {odometroAtual.toLocaleString("pt-BR")} km</span>
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="font-semibold">Combustível: {combustivelPorExtenso(combustivel)}</span>
          <input type="range" min={0} max={8} step={1} value={combustivel} onChange={(e) => setCombustivel(Number(e.target.value))} className="h-11 accent-[var(--marca)]" aria-label="Nível de combustível" />
          <div className="flex justify-between text-xs text-suave"><span>Reserva</span><span>1/2</span><span>Cheio</span></div>
        </div>
      </Cartao>

      <Cartao>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold">Checklist</p>
          <span className="text-sm font-semibold text-marca">{marcados}/{ITENS_CHECKLIST.length}</span>
        </div>
        <ul className="divide-y divide-borda">
          {ITENS_CHECKLIST.map((i) => {
            const atual = itens[i.id];
            return (
              <li key={i.id} className="py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium">{i.rotulo}</span>
                  <div className="grid w-full grid-cols-3 gap-1 rounded-xl bg-cartao-2 p-1 sm:w-auto" role="radiogroup" aria-label={i.rotulo}>
                    {ESTADOS.map((e) => {
                      const sel = atual?.estado === e.id;
                      const cor = e.id === "ok" ? "bg-ok text-white" : e.id === "avaria" ? "bg-alerta text-white" : "bg-perigo text-white";
                      return (
                        <button
                          key={e.id}
                          type="button"
                          role="radio"
                          aria-checked={sel}
                          onClick={() => setItens((a) => ({ ...a, [i.id]: { estado: e.id, observacao: a[i.id]?.observacao ?? "" } }))}
                          className={`min-w-16 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${sel ? cor : "text-suave hover:text-texto"}`}
                        >
                          {e.rotulo}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {atual?.estado && atual.estado !== "ok" && (
                  <textarea
                    rows={2}
                    placeholder={atual.estado === "avaria" ? "Descreva a avaria (onde, tamanho…)" : "O que está faltando?"}
                    value={atual.observacao}
                    onChange={(e) => setItens((a) => ({ ...a, [i.id as IdItem]: { estado: atual.estado, observacao: e.target.value } }))}
                    className={`${classeAreaTexto} mt-2`}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </Cartao>

      <Cartao>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Observações gerais</span>
          <textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className={classeAreaTexto} placeholder="Opcional" />
        </label>
      </Cartao>

      {erro && <Aviso tom="perigo">{erro}</Aviso>}

      <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 lg:bottom-4">
        <Botao tamanho="lg" className="w-full shadow-flutuante" onClick={concluir} disabled={concluindo || enviando || faltam > 0} icone={concluindo ? Loader2 : Check}>
          {concluindo ? "Salvando…" : enviando ? "Enviando fotos…" : faltam > 0 ? `Faltam ${faltam} item(ns)` : "Concluir vistoria"}
        </Botao>
      </div>
    </div>
  );
}

function SlotFoto({ rotulo, dica, foto, onArquivo }: { rotulo: string; dica?: string; foto?: Foto; onArquivo: (a: File | undefined) => void }) {
  return (
    <label className={`group relative flex aspect-[4/3] cursor-pointer flex-col overflow-hidden rounded-xl border text-left ${foto?.estado === "erro" ? "border-perigo" : "border-borda"} bg-cartao-2`}>
      {foto?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto.url} alt={rotulo} className="absolute inset-0 size-full object-cover" />
      ) : (
        <span className="m-auto grid size-11 place-items-center rounded-full bg-marca-suave text-marca"><Camera size={22} aria-hidden /></span>
      )}
      <span className="relative mt-auto flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-2.5 pt-6 pb-2 text-white">
        {foto?.estado === "pronta" && <Check size={16} className="shrink-0 rounded-full bg-ok p-0.5" aria-label="Enviada" />}
        {foto?.estado === "enviando" && <Loader2 size={16} className="shrink-0 animate-spin" aria-label="Enviando" />}
        {foto?.estado === "erro" && <RotateCcw size={16} className="shrink-0" aria-label="Tentar de novo" />}
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{rotulo}</span>
          {!foto?.url && dica && <span className="block truncate text-[0.7rem] opacity-80">{dica}</span>}
          {foto?.estado === "erro" && <span className="flex items-center gap-1 text-[0.7rem]"><TriangleAlert size={12} aria-hidden /> {foto.erro}</span>}
        </span>
      </span>
      {!foto?.url && <span className="sr-only">{dica}</span>}
      <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { onArquivo(e.target.files?.[0]); e.target.value = ""; }} />
    </label>
  );
}
