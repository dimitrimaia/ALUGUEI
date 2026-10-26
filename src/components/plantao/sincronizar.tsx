"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { adicionarLugaresEvitar, registrarCorridas, salvarRegua } from "@/lib/acoes-plantao";
import { plantaoNativo } from "@/lib/nativo";
import type { Criterios, PerfilCusto } from "@/dominio/ganhos/custos";

/**
 * No app Android: entrega à bolha os custos e critérios atuais e traz para o
 * servidor as corridas que ela avaliou (a fila fica no celular até dar certo).
 */
export function SincronizarPlantao({ perfil, criterios: daConta }: { perfil: PerfilCusto; criterios: Criterios }) {
  const router = useRouter();
  useEffect(() => {
    const p = plantaoNativo();
    if (!p) return;
    let vivo = true;
    async function sincronizar() {
      let criterios = daConta;
      try {
        // Régua mudada na bolha vale mais que a da conta: salva primeiro e manda a combinada.
        const { regua } = await p!.reguaPendente().catch(() => ({ regua: null }));
        if (regua) {
          await salvarRegua(regua);
          criterios = { ...criterios, ...regua };
          await p!.limparReguaPendente().catch(() => null);
        }
        const tema = document.documentElement.dataset.tema;
        await p!.configurar({ perfil, criterios, tema: tema === "escuro" ? "escuro" : tema === "auto" ? "auto" : "claro" });
        // Lugares marcados na bolha ("Evitar este lugar") vão para a régua da conta.
        const { lugares } = await p!.lugaresAdicionados().catch(() => ({ lugares: [] as string[] }));
        if (lugares.length) {
          await adicionarLugaresEvitar(lugares);
          await p!.limparLugaresAdicionados().catch(() => null);
        }
        const { corridas } = await p!.corridasPendentes();
        if (!corridas.length) return;
        await registrarCorridas(corridas.map((c) => ({ ...c, decisao: c.decisao === "sem_resposta" ? null : c.decisao })));
        await p!.confirmarEnvio({ ids: corridas.map((c) => c.id) });
        if (vivo) router.refresh();
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
    const aoVoltar = () => document.visibilityState === "visible" && sincronizar();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      vivo = false;
      regua.then((o) => o.remove()).catch(() => null);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [perfil, daConta, router]);
  return null;
}
