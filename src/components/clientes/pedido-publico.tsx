"use client";

import { Calculator, MessageCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { agendarCorridaParticular, estimarCorridaParticular } from "@/lib/acoes-clientes";

const entrada = "h-12 w-full rounded-xl border border-[#d6dce8] bg-white px-3.5 text-base text-[#0b1630] outline-none focus:border-[#1f56e8] focus:ring-3 focus:ring-[#1f56e8]/15";

/** Formulário da página pública do motorista: preço na hora e pedido pelo WhatsApp. */
export function PedidoPublico({ slug, categorias }: { slug: string; categorias: string[] }) {
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [quando, setQuando] = useState("");
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [categoria, setCategoria] = useState(categorias[0] ?? "");
  const [precos, setPrecos] = useState<{ nome: string; valor: number }[] | null>(null);
  const [rota, setRota] = useState<{ km: number; minutos: number; estimada: boolean } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const calcular = () =>
    iniciar(async () => {
      setErro(null);
      const r = await estimarCorridaParticular(slug, origem, destino);
      if ("erro" in r && r.erro) return setErro(r.erro);
      if ("precos" in r && r.precos && r.rota) {
        setPrecos(r.precos);
        setRota(r.rota);
      }
    });

  const agendar = () =>
    iniciar(async () => {
      setErro(null);
      const r = await agendarCorridaParticular(slug, { nome, whatsapp, origem, destino, quando, categoria });
      if (r.erro) return setErro(r.erro);
      if (r.link) window.location.href = r.link;
    });

  return (
    <div className="flex flex-col gap-3">
      <input value={origem} onChange={(e) => (setOrigem(e.target.value), setPrecos(null))} placeholder="De onde? (rua e número, ou o lugar)" aria-label="Origem" className={entrada} />
      <input value={destino} onChange={(e) => (setDestino(e.target.value), setPrecos(null))} placeholder="Para onde?" aria-label="Destino" className={entrada} />
      {!precos && (
        <button type="button" onClick={calcular} disabled={pendente || origem.length < 3 || destino.length < 3} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1f56e8] font-semibold text-white disabled:opacity-50">
          <Calculator size={18} /> {pendente ? "Calculando…" : "Ver preço"}
        </button>
      )}
      {precos && rota && (
        <>
          <div className="grid gap-2" role="radiogroup" aria-label="Categoria">
            {precos.map((p) => (
              <button key={p.nome} type="button" role="radio" aria-checked={categoria === p.nome} onClick={() => setCategoria(p.nome)} className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left ${categoria === p.nome ? "border-[#1f56e8] bg-[#e8efff]" : "border-[#d6dce8] bg-white"}`}>
                <span className="font-semibold text-[#0b1630]">{p.nome}</span>
                <span className="text-lg font-extrabold text-[#0b1630] tabular-nums">{formatarBRL(p.valor)}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-[#5b6880]">{rota.km.toLocaleString("pt-BR")} km · cerca de {rota.minutos} min{rota.estimada ? " (estimado)" : ""}. Valor estimado; o motorista confirma pelo WhatsApp.</p>
          <input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} aria-label="Dia e hora" className={entrada} />
          <div className="grid grid-cols-2 gap-2">
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" aria-label="Seu nome" className={entrada} />
            <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} inputMode="tel" placeholder="Seu WhatsApp" aria-label="Seu WhatsApp" className={entrada} />
          </div>
          <button type="button" onClick={agendar} disabled={pendente || !quando || nome.length < 2 || whatsapp.length < 10} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#16a34a] font-semibold text-white disabled:opacity-50">
            <MessageCircle size={18} /> {pendente ? "Enviando…" : "Agendar pelo WhatsApp"}
          </button>
        </>
      )}
      {erro && <p className="rounded-xl bg-[#fde8e8] px-3 py-2 text-sm text-[#b42318]">{erro}</p>}
    </div>
  );
}
