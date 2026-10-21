"use client";

import { BellRing, Check } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Aviso, Botao } from "@/components/ui";
import { avisoDeTeste, removerInscricaoPush, salvarInscricaoPush } from "@/lib/acoes-avisos";

function chaveVapid(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const bruto = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0)));
}

type Estado = "carregando" | "sem_suporte" | "ios_instalar" | "negado" | "desligado" | "ligado";

/** Liga as notificações no celular (pede a permissão e registra o aparelho). */
export function AtivarPush() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [pendente, iniciar] = useTransition();
  const [testado, setTestado] = useState(false);

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const instalado = matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setEstado(ios && !instalado ? "ios_instalar" : "sem_suporte");
      if (Notification.permission === "denied") return setEstado("negado");
      const reg = await navigator.serviceWorker.ready;
      setEstado((await reg.pushManager.getSubscription()) ? "ligado" : "desligado");
    })().catch(() => setEstado("sem_suporte"));
  }, []);

  function ligar() {
    iniciar(async () => {
      const chave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!chave) return setEstado("sem_suporte");
      if ((await Notification.requestPermission()) !== "granted") return setEstado("negado");
      const reg = await navigator.serviceWorker.ready;
      const inscricao = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveVapid(chave) });
      const r = await salvarInscricaoPush(inscricao.toJSON());
      setEstado(r.ok ? "ligado" : "desligado");
    });
  }

  function desligar() {
    iniciar(async () => {
      const reg = await navigator.serviceWorker.ready;
      const inscricao = await reg.pushManager.getSubscription();
      if (inscricao) {
        await removerInscricaoPush(inscricao.endpoint);
        await inscricao.unsubscribe();
      }
      setEstado("desligado");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-[1.1rem] border border-borda bg-cartao p-4 shadow-cartao">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-marca-suave text-marca"><BellRing size={18} /></span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">Notificação neste celular</span>
          <span className="block text-xs text-suave">{estado === "ligado" ? "Ligada neste aparelho" : "Avisos na tela, mesmo com o app fechado"}</span>
        </span>
        {estado === "ligado" && <Check size={18} className="text-ok" />}
      </div>
      {estado === "ios_instalar" && <Aviso tom="neutro">No iPhone, instale o app primeiro: toque em Compartilhar e depois em “Adicionar à Tela de Início”. Depois volte aqui.</Aviso>}
      {estado === "negado" && <Aviso tom="alerta">As notificações estão bloqueadas para o Aluguei. Libere nas configurações do navegador ou do celular.</Aviso>}
      {estado === "sem_suporte" && <Aviso tom="neutro">Este navegador não recebe notificações. Os avisos continuam no app e por e-mail.</Aviso>}
      {estado === "desligado" && <Botao onClick={ligar} disabled={pendente} className="self-start">{pendente ? "Ativando…" : "Ativar notificações"}</Botao>}
      {estado === "ligado" && (
        <div className="flex flex-wrap gap-2">
          <Botao variante="secundario" tamanho="sm" disabled={pendente || testado} onClick={() => iniciar(async () => { await avisoDeTeste(); setTestado(true); })}>{testado ? "Enviado" : "Enviar um teste"}</Botao>
          <Botao variante="fantasma" tamanho="sm" disabled={pendente} onClick={desligar}>Desligar neste aparelho</Botao>
        </div>
      )}
    </div>
  );
}
