import type { ReactNode } from "react";
import { BarraTopo } from "@/components/app/barras";
import { CabecalhoPagina } from "@/components/ui";

/**
 * Cabeçalho das telas do modo motorista, com a mesma regra do modo locador:
 * - telas das abas (raiz): logo no topo e o título na página;
 * - telas internas: voltar + título no topo.
 */
export function CabecalhoMotorista({ titulo, voltar = "/m", raiz = false, subtitulo, acao }: { titulo: string; voltar?: string; raiz?: boolean; subtitulo?: ReactNode; acao?: ReactNode }) {
  if (raiz) {
    return (
      <div className="pt-4">
        <BarraTopo />
        <CabecalhoPagina titulo={titulo} subtitulo={subtitulo} acao={acao} />
      </div>
    );
  }
  return (
    <div className="mb-4">
      <BarraTopo voltar={voltar} titulo={titulo} />
    </div>
  );
}

/** Cabeçalho do início: logo e menu. */
export function CabecalhoInicio() {
  return <BarraTopo />;
}
