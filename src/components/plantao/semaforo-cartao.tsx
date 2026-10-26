import type { Avaliacao } from "@/dominio/ganhos/corrida";
import { formatarBRL } from "@/dominio/dinheiro/centavos";

export const COR_SINAL = {
  verde: { fundo: "bg-[#16a34a]", rotulo: "Vale a pena" },
  amarelo: { fundo: "bg-[#d97706]", rotulo: "Avalie" },
  vermelho: { fundo: "bg-[#dc2626]", rotulo: "Não compensa" },
} as const;

const km = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;

/** O mesmo cartão da bolha do Android, para a calculadora e a simulação. */
export function CartaoSemaforo({ a, kmBusca }: { a: Avaliacao; kmBusca?: number | null }) {
  const cor = COR_SINAL[a.sinal];
  return (
    <div className={`${cor.fundo} rounded-[1.3rem] p-4 text-white shadow-flutuante`} role="status" aria-live="polite">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide"><span className="size-3 rounded-full bg-white" />{cor.rotulo}</span>
        <span className="text-xs text-white/80">{km(a.kmTotal)} · {a.minutosTotal} min{a.tempoEstimado ? " (estimado)" : ""}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-black/15 py-2"><p className="text-[0.65rem] text-white/80">por km</p><p className="text-lg font-extrabold tabular-nums">{formatarBRL(a.porKm)}</p></div>
        <div className="rounded-xl bg-black/15 py-2"><p className="text-[0.65rem] text-white/80">por hora</p><p className="text-lg font-extrabold tabular-nums">{formatarBRL(a.porHora)}</p></div>
        <div className="rounded-xl bg-black/15 py-2"><p className="text-[0.65rem] text-white/80">lucro</p><p className="text-lg font-extrabold tabular-nums">{formatarBRL(a.lucro)}</p></div>
      </div>
      <p className="mt-2 text-xs text-white/85">
        Custo estimado {formatarBRL(a.custo)} · lucro {formatarBRL(a.lucroPorHora)}/h{kmBusca ? ` · passageiro a ${km(kmBusca)}` : ""}
      </p>
      {!!a.motivos.length && <p className="mt-1 text-xs font-semibold">{a.motivos.join(" · ")}</p>}
    </div>
  );
}
