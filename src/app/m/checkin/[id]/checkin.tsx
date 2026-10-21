"use client";

import { Camera, Check, Loader2, RotateCcw, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Aviso, Botao, Campo, classeEntrada } from "@/components/ui";
import { ITENS_CHECKIN, type IdItemCheckin, conferirKm } from "@/dominio/checkin/checkin";
import { combustivelPorExtenso } from "@/dominio/vistoria/roteiro";
import { comprimirImagem } from "@/lib/comprimir-imagem";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import { concluirCheckin, prepararArquivo, registrarArquivo } from "./acoes";

type Estado = { estado: "enviando" | "pronto" | "erro"; previa?: string; evidenciaId?: string; erro?: string };
type Posicao = { latitude: number; longitude: number; precisao: number };

const LIMITE_VIDEO = 50 * 1024 * 1024;

function carimbo(p: Posicao | null) {
  const agora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
  return p ? `Check-in · ${agora} · ${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}` : `Check-in · ${agora}`;
}

/** Check-in guiado: uma etapa por foto, o vídeo, o km e o combustível. Tudo direto da câmera. */
export function Checkin({ obrigacaoId, ultimoKm }: { obrigacaoId: string; ultimoKm: number }) {
  const router = useRouter();
  const [itens, setItens] = useState<Partial<Record<IdItemCheckin, Estado>>>({});
  const [km, setKm] = useState("");
  const [combustivel, setCombustivel] = useState(4);
  const [erro, setErro] = useState<string | null>(null);
  const [concluindo, iniciar] = useTransition();
  const posicao = useRef<Posicao | null>(null);
  const [semLocal, setSemLocal] = useState(false);

  useEffect(() => {
    const id = navigator.geolocation?.watchPosition(
      (p) => { posicao.current = { latitude: p.coords.latitude, longitude: p.coords.longitude, precisao: p.coords.accuracy }; setSemLocal(false); },
      () => setSemLocal(true),
      { enableHighAccuracy: true, maximumAge: 30_000 },
    );
    return () => { if (id !== undefined) navigator.geolocation.clearWatch(id); };
  }, []);

  async function enviar(item: IdItemCheckin, arquivo: File | undefined) {
    if (!arquivo) return;
    const video = item === "video";
    if (video && arquivo.size > LIMITE_VIDEO) return setItens((a) => ({ ...a, [item]: { estado: "erro", erro: "Vídeo muito grande. Grave um mais curto (até 30 segundos)." } }));
    setItens((a) => ({ ...a, [item]: { estado: "enviando", previa: video ? undefined : URL.createObjectURL(arquivo) } }));
    try {
      const pronto = video ? arquivo : await comprimirImagem(arquivo, { carimbo: carimbo(posicao.current) });
      const { caminho, token } = await prepararArquivo(obrigacaoId, item);
      const { error } = await supabaseNavegador().storage.from("evidencias").uploadToSignedUrl(caminho, token, pronto, { contentType: video ? arquivo.type || "video/mp4" : "image/jpeg" });
      if (error) throw error;
      const p = posicao.current;
      const r = await registrarArquivo(obrigacaoId, { caminho, item, latitude: p?.latitude, longitude: p?.longitude, precisao: p?.precisao, capturadoEm: new Date(arquivo.lastModified || Date.now()).toISOString() });
      setItens((a) => ({ ...a, [item]: r.ok ? { ...a[item], estado: "pronto", evidenciaId: r.evidenciaId } : { ...a[item], estado: "erro", erro: r.erro } }));
    } catch {
      setItens((a) => ({ ...a, [item]: { ...a[item], estado: "erro", erro: "Falhou o envio. Toque para tentar de novo." } }));
    }
  }

  const prontos = ITENS_CHECKIN.filter((i) => itens[i.id]?.estado === "pronto").length;
  const enviando = Object.values(itens).some((i) => i?.estado === "enviando");

  function concluir() {
    setErro(null);
    const valor = Number(km.replace(/\D/g, ""));
    const conferido = conferirKm(valor, ultimoKm);
    if (!conferido.ok) return setErro(conferido.erro);
    if (conferido.alerta && !confirm(conferido.alerta)) return;
    iniciar(async () => {
      const r = await concluirCheckin(obrigacaoId, {
        km: valor,
        combustivelOitavos: combustivel,
        evidencias: Object.fromEntries(Object.entries(itens).filter(([, v]) => v?.evidenciaId).map(([k, v]) => [k, v!.evidenciaId!])),
      });
      if (!r.ok) return setErro(r.erro);
      router.replace("/m?checkin=ok");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-1.5 flex justify-between text-xs font-semibold text-suave"><span>{prontos} de {ITENS_CHECKIN.length} enviados</span><span>Leva uns 3 minutos</span></div>
        <div className="h-1.5 rounded-full bg-borda"><div className="h-1.5 rounded-full bg-marca transition-all" style={{ width: `${(prontos / ITENS_CHECKIN.length) * 100}%` }} /></div>
      </div>
      {semLocal && <Aviso tom="alerta">Libere a localização: ela fica registrada junto das fotos, como prova para você e para o locador.</Aviso>}

      {ITENS_CHECKIN.map((item, i) => {
        const e = itens[item.id];
        const video = item.tipo === "video";
        return (
          <label key={item.id} className={`flex cursor-pointer items-center gap-3 rounded-[1.1rem] border bg-cartao p-3.5 shadow-cartao ${e?.estado === "pronto" ? "border-ok/40" : e?.estado === "erro" ? "border-perigo/40" : "border-borda"}`}>
            <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-cartao-2 text-suave">
              {e?.previa ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.previa} alt="" className="size-full object-cover" />
              ) : video ? <Video size={24} /> : <Camera size={24} />}
              {e?.estado === "enviando" && <span className="absolute inset-0 grid place-items-center bg-black/40 text-white"><Loader2 size={22} className="animate-spin" /></span>}
              {e?.estado === "pronto" && <span className="absolute right-1 bottom-1 grid size-5 place-items-center rounded-full bg-ok text-white"><Check size={12} strokeWidth={3} /></span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-suave">Etapa {i + 1}</span>
              <span className="block text-sm font-semibold">{item.rotulo}</span>
              <span className={`block text-xs ${e?.estado === "erro" ? "font-medium text-perigo" : "text-suave"}`}>{e?.estado === "erro" ? e.erro : e?.estado === "pronto" ? "Enviado. Toque para refazer." : item.dica}</span>
            </span>
            {e?.estado === "pronto" ? <RotateCcw size={17} className="shrink-0 text-suave" /> : null}
            <input type="file" accept={video ? "video/*" : "image/*"} capture="environment" className="sr-only" disabled={e?.estado === "enviando"} onChange={(ev) => { enviar(item.id, ev.target.files?.[0]); ev.target.value = ""; }} />
          </label>
        );
      })}

      <div className="rounded-[1.1rem] border border-borda bg-cartao p-4 shadow-cartao">
        <div className="grid gap-4">
          <Campo rotulo="Km do painel" dica={`Último registro: ${ultimoKm.toLocaleString("pt-BR")} km`}>
            <input inputMode="numeric" className={classeEntrada} value={km} onChange={(e) => setKm(e.target.value)} placeholder="Ex.: 42.150" />
          </Campo>
          <Campo rotulo={`Combustível: ${combustivelPorExtenso(combustivel)}`}>
            <input type="range" min={0} max={8} step={1} value={combustivel} onChange={(e) => setCombustivel(Number(e.target.value))} className="w-full accent-[var(--marca)]" />
          </Campo>
        </div>
      </div>

      {erro && <Aviso tom="perigo">{erro}</Aviso>}
      <Botao tamanho="lg" disabled={concluindo || enviando || prontos < ITENS_CHECKIN.length} onClick={concluir}>
        {concluindo ? "Enviando check-in…" : prontos < ITENS_CHECKIN.length ? `Faltam ${ITENS_CHECKIN.length - prontos} etapas` : "Enviar check-in"}
      </Botao>
      <p className="text-center text-xs text-suave">Fotos e vídeo ficam guardados com data, hora e local. Valem como prova para você e para o locador.</p>
    </div>
  );
}
