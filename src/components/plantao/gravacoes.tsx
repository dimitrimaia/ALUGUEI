"use client";

import { Circle, Film, LoaderCircle, Play, Share2, Trash2 } from "lucide-react";
import type { Route } from "next";
import { useCallback, useEffect, useState } from "react";
import { Aviso, BotaoLink, Cartao, Vazio } from "@/components/ui";
import { type EstadoCamera, type GravacaoNativa, plantaoNativo } from "@/lib/nativo";

const tamanho = (b: number) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} GB` : `${Math.max(1, Math.round(b / 1024 ** 2))} MB`);
const duracao = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const dia = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "America/Sao_Paulo" });

/** Gerenciador dos vídeos da câmera de segurança: assistir, compartilhar e apagar. */
export function ListaGravacoes() {
  const [lista, setLista] = useState<GravacaoNativa[] | null>(null);
  const [camera, setCamera] = useState<EstadoCamera | null>(null);
  const [semSuporte, setSemSuporte] = useState(false);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const p = plantaoNativo();
    if (!p?.gravacoes) return setSemSuporte(true);
    try {
      const r = await p.gravacoes();
      setLista(r.gravacoes);
      setCamera(r.camera);
    } catch {
      setErro("Não consegui ler as gravações.");
      setLista([]);
    }
  }, []);
  useEffect(() => void carregar(), [carregar]);

  async function apagar(id: string) {
    setConfirmar(null);
    const r = await plantaoNativo()?.apagarGravacao?.({ id }).catch(() => null);
    if (!r?.ok) return setErro("Não deu para apagar este vídeo.");
    setLista((l) => l?.filter((g) => g.id !== id) ?? null);
  }

  if (semSuporte)
    return <Vazio icone={Film} titulo="Disponível no app">As gravações da câmera de segurança ficam no celular. Abra o Aluguei no app para Android (atualizado) para ver os vídeos.</Vazio>;
  if (!lista) return <div className="grid place-items-center py-16 text-suave"><LoaderCircle className="animate-spin" /></div>;

  const total = lista.reduce((s, g) => s + g.bytes, 0);
  const grupos = lista.reduce<{ dia: string; itens: GravacaoNativa[] }[]>((acc, g) => {
    const d = dia(g.criadoEm);
    (acc.at(-1)?.dia === d ? acc.at(-1)!.itens : (acc.push({ dia: d, itens: [] }), acc.at(-1)!.itens)).push(g);
    return acc;
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <Cartao className="flex items-center justify-between !p-3">
        <span className="text-sm"><strong>{lista.length}</strong> vídeo{lista.length === 1 ? "" : "s"} · {tamanho(total)}</span>
        {camera?.gravando && <span className="flex items-center gap-1.5 text-xs font-semibold text-perigo"><Circle size={10} className="animate-pulse fill-current" /> Gravando</span>}
      </Cartao>
      {erro && <Aviso tom="perigo">{erro}</Aviso>}
      {!lista.length ? (
        <Vazio icone={Film} titulo="Nenhuma gravação" acao={<BotaoLink href={"/m/plantao/copiloto" as Route} variante="secundario">Ajustes da câmera</BotaoLink>}>
          Ligue a câmera de segurança no Copiloto. Os vídeos ficam só no seu celular, e os mais antigos são apagados quando passa do limite que você escolheu.
        </Vazio>
      ) : (
        grupos.map((g) => (
          <section key={g.dia} className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold text-suave first-letter:uppercase">{g.dia}</h2>
            {g.itens.map((v) => (
              <Cartao key={v.id} className="flex items-center gap-3 !p-2.5">
                <button type="button" disabled={v.emGravacao} onClick={() => plantaoNativo()?.abrirGravacao?.({ id: v.id })} aria-label="Assistir" className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-cartao-2">
                  {v.miniatura ? <img src={v.miniatura} alt="" className="size-full object-cover" /> : <Film size={22} className="absolute inset-0 m-auto text-suave" />}
                  {!v.emGravacao && <Play size={22} className="absolute inset-0 m-auto fill-white text-white drop-shadow" />}
                  {v.duracaoSeg != null && <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1 text-[0.65rem] font-semibold text-white">{duracao(v.duracaoSeg)}</span>}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{quando(v.criadoEm)}</p>
                  <p className="text-xs text-suave">{v.emGravacao ? "Gravando agora" : tamanho(v.bytes)}</p>
                </div>
                {!v.emGravacao && (
                  confirmar === v.id ? (
                    <div className="flex gap-1">
                      <button type="button" onClick={() => apagar(v.id)} className="rounded-lg bg-perigo px-2.5 py-1.5 text-xs font-semibold text-white">Apagar</button>
                      <button type="button" onClick={() => setConfirmar(null)} className="rounded-lg border border-borda px-2.5 py-1.5 text-xs font-semibold">Não</button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button type="button" aria-label="Compartilhar" onClick={() => plantaoNativo()?.compartilharGravacao?.({ id: v.id })} className="grid size-9 place-items-center rounded-lg text-marca hover:bg-cartao-2"><Share2 size={18} /></button>
                      <button type="button" aria-label="Apagar" onClick={() => setConfirmar(v.id)} className="grid size-9 place-items-center rounded-lg text-perigo hover:bg-cartao-2"><Trash2 size={18} /></button>
                    </div>
                  )
                )}
              </Cartao>
            ))}
          </section>
        ))
      )}
      <p className="text-center text-xs text-suave">Os vídeos ficam só neste celular, na pasta Filmes/Aluguei/Corridas. O Aluguei não envia nada para a internet.</p>
    </div>
  );
}
