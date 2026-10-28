"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { adicionarLugaresEvitar, buscarLugaresComunidade, registrarCorridas, registrarFinalizadas, salvarPreferenciasCopiloto, salvarRegua, salvarReguaCompleta } from "@/lib/acoes-plantao";
import { normalizarCriterios } from "@/dominio/ganhos/custos";
import { plantaoNativo, soltarOuvinte } from "@/lib/nativo";
import type { Criterios, PerfilCusto } from "@/dominio/ganhos/custos";
import type { PreferenciasCopiloto } from "@/dominio/ganhos/copiloto";

/**
 * No app Android: entrega à bolha os custos e critérios atuais e traz para o
 * servidor as corridas que ela avaliou (a fila fica no celular até dar certo).
 */
export function SincronizarPlantao({ perfil, criterios: daConta, preferencias }: { perfil: PerfilCusto; criterios: Criterios; preferencias?: PreferenciasCopiloto }) {
  const router = useRouter();
  useEffect(() => {
    const p = plantaoNativo();
    if (!p) return;
    let vivo = true;
    async function sincronizar() {
      let criterios = daConta;
      try {
        // Perfil escolhido na bolha (Dia, Noite...): vira a régua da conta.
        const { perfil: escolhido } = await p!.perfilPendente().catch(() => ({ perfil: null }));
        if (escolhido) {
          criterios = normalizarCriterios(escolhido.criterios);
          await salvarReguaCompleta(criterios);
          await p!.limparPerfilPendente().catch(() => null);
        }
        // Régua mudada na bolha vale mais que a da conta: salva primeiro e manda a combinada.
        const { regua } = await p!.reguaPendente().catch(() => ({ regua: null }));
        if (regua) {
          await salvarRegua(regua);
          criterios = { ...criterios, ...regua };
          await p!.limparReguaPendente().catch(() => null);
        }
        const tema = document.documentElement.dataset.tema;
        const temaApp = tema === "escuro" ? "escuro" : tema === "auto" ? "auto" : "claro";
        const comunidade = await buscarLugaresComunidade().catch(() => []);
        await p!.configurar({
          perfil,
          criterios,
          comunidade,
          // "app": o cartão segue o tema escolhido no Aluguei.
          tema: preferencias && preferencias.tema !== "app" ? preferencias.tema : temaApp,
          ...(preferencias ? { preferencias, segundosCartao: preferencias.segundosCartao, vibrar: preferencias.vibrar } : {}),
        });
        // Lugares marcados na bolha ("Evitar este lugar") vão para a régua da conta.
        const { lugares } = await p!.lugaresAdicionados().catch(() => ({ lugares: [] as string[] }));
        if (lugares.length) {
          await adicionarLugaresEvitar(lugares);
          await p!.limparLugaresAdicionados().catch(() => null);
        }
        const { corridas } = await p!.corridasPendentes();
        if (corridas.length) {
          await registrarCorridas(corridas.map((c) => ({ ...c, decisao: c.decisao === "sem_resposta" ? null : c.decisao })));
          await p!.confirmarEnvio({ ids: corridas.map((c) => c.id) });
        }
        // Depois das corridas: a finalizada atualiza a corrida que acabou de subir.
        const finalizadas = p!.corridasFinalizadas ? (await p!.corridasFinalizadas().catch(() => ({ corridas: [] }))).corridas : [];
        const { ids } = finalizadas.length ? await registrarFinalizadas(finalizadas) : { ids: [] as string[] };
        if (ids.length) await p!.confirmarFinalizadas?.({ ids });
        if (vivo && (corridas.length || ids.length)) router.refresh();
      } catch {
        // Sem rede: tenta de novo na próxima abertura.
      }
    }
    sincronizar();
    // Régua ajustada pelo menu da bolha: guarda na conta.
    const regua = p.addListener("regua", (d) => {
      const r = d as { minimoPorKm?: number; minimoPorHora?: number };
      salvarRegua(r).catch(() => null);
    });
    // Base marcada pela bolha ("Definir base aqui") e "não perguntar mais" vão para a conta.
    const base = p.addListener("base", (d) => {
      const b = d as { lat?: number; lon?: number };
      if (preferencias && typeof b.lat === "number" && typeof b.lon === "number") salvarPreferenciasCopiloto({ ...preferencias, base: { nome: "Base marcada no mapa", lat: b.lat, lon: b.lon } }).catch(() => null);
    });
    const pref = p.addListener("preferencia", (d) => {
      const x = d as { perguntarAceite?: boolean };
      if (preferencias && typeof x.perguntarAceite === "boolean") salvarPreferenciasCopiloto({ ...preferencias, perguntarAceite: x.perguntarAceite }).catch(() => null);
    });
    const aoVoltar = () => document.visibilityState === "visible" && sincronizar();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      vivo = false;
      for (const o of [regua, base, pref]) soltarOuvinte(o);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [perfil, daConta, preferencias, router]);
  return null;
}
