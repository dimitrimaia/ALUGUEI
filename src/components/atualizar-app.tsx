"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { avisar } from "@/components/toast";
import { plantaoNativo } from "@/lib/nativo";

type Versao = { versao: number; nome: string; url: string };

/**
 * "Atualização do Copiloto disponível": só no APK direto (fora da Play Store).
 * Compara a versão instalada com o versao.json que o GitHub Actions publica no
 * Supabase Storage. Um toque baixa e abre o instalador; quem confirma é a pessoa.
 */
export function AtualizarApp() {
  const [nova, setNova] = useState<Versao | null>(null);
  const [baixando, setBaixando] = useState(false);
  useEffect(() => {
    const p = plantaoNativo();
    if (!p?.atualizarApp) return;
    let vivo = true;
    (async () => {
      const estado = await p.estado().catch(() => null);
      if (!estado?.atualizavel || !estado.versaoApp) return;
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const r = await fetch(`${base}/storage/v1/object/public/app/versao.json`, { cache: "no-store" }).catch(() => null);
      const v = r?.ok ? ((await r.json().catch(() => null)) as Versao | null) : null;
      let dispensada = 0;
      try {
        dispensada = Number(sessionStorage.getItem("aluguei:atualizacao-dispensada") ?? 0);
      } catch {}
      if (vivo && v && v.versao > estado.versaoApp && v.versao !== dispensada && v.url.startsWith("https://")) setNova(v);
    })();
    return () => {
      vivo = false;
    };
  }, []);
  if (!nova) return null;
  async function atualizar() {
    const p = plantaoNativo();
    if (!p?.atualizarApp || !nova) return;
    setBaixando(true);
    const r = await p.atualizarApp({ url: nova.url }).catch(() => null);
    setBaixando(false);
    if (!r) return avisar("Não deu para baixar agora.", "erro");
    if (!r.permissao) return avisar("Permita “Instalar apps” para o Aluguei e toque de novo em Atualizar.");
    avisar("Baixando… quando terminar, toque em Instalar.");
  }
  function dispensar() {
    try {
      sessionStorage.setItem("aluguei:atualizacao-dispensada", String(nova?.versao));
    } catch {}
    setNova(null);
  }
  return (
    <div className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-[28rem] items-center gap-3 rounded-2xl bg-[#0b2a6b] p-3 text-white shadow-flutuante">
      <Download size={20} className="shrink-0" />
      <span className="min-w-0 flex-1 text-sm"><strong className="block">Atualização do Copiloto</strong><span className="text-xs text-white/75">Versão {nova.nome} com melhorias na bolha e no cartão.</span></span>
      <button type="button" disabled={baixando} onClick={atualizar} className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-[#0b2a6b] disabled:opacity-60">{baixando ? "…" : "Atualizar"}</button>
      <button type="button" onClick={dispensar} aria-label="Agora não" className="text-white/70"><X size={18} /></button>
    </div>
  );
}
