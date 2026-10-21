"use client";

import { BarraTopo } from "./barras";

/**
 * Barra do topo das telas internas do painel (celular): fica por cima da barra
 * do layout, no mesmo lugar, trocando o logo por voltar + título.
 */
export function BarraTopoInterna({ voltar, titulo }: { voltar: string; titulo: string }) {
  return (
    <div className="lg:hidden [&>div]:hidden [&>header]:z-[31]">
      <BarraTopo voltar={voltar} titulo={titulo} />
    </div>
  );
}
