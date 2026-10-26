"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { registrarCorridas } from "@/lib/acoes-plantao";
import { plantaoNativo } from "@/lib/nativo";
import type { Criterios, PerfilCusto } from "@/dominio/ganhos/custos";

/**
 * No app Android: entrega à bolha os custos e critérios atuais e traz para o
 * servidor as corridas que ela avaliou (a fila fica no celular até dar certo).
 */
export function SincronizarPlantao({ perfil, criterios }: { perfil: PerfilCusto; criterios: Criterios }) {
  const router = useRouter();
  useEffect(() => {
    const p = plantaoNativo();
    if (!p) return;
    let vivo = true;
    async function sincronizar() {
      try {
        await p!.configurar({ perfil, criterios });
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
    const aoVoltar = () => document.visibilityState === "visible" && sincronizar();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [perfil, criterios, router]);
  return null;
}
