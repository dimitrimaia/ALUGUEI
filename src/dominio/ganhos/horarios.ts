import type { Centavos } from "../dinheiro/centavos";

export type OfertaHorario = { momento: string; valor: Centavos; metros: number; sinal: string };
export type Bloco = { de: number; ofertas: number; mediaPorKm: Centavos | null; verdes: number };

/** Hora do dia em Brasília (0..23). */
export const horaBrasilia = (iso: string) => Number(new Date(iso).toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" })) % 24;

/**
 * Ofertas agrupadas em blocos de 2 horas: quantas chegaram, a média por km e
 * quantas foram verdes. Mostra quando vale a pena estar online.
 */
export function porBlocoDeHorario(ofertas: readonly OfertaHorario[]): Bloco[] {
  const blocos: Bloco[] = Array.from({ length: 12 }, (_, i) => ({ de: i * 2, ofertas: 0, mediaPorKm: null, verdes: 0 }));
  const somas = Array.from({ length: 12 }, () => ({ valor: 0, km: 0 }));
  for (const o of ofertas) {
    const i = Math.floor(horaBrasilia(o.momento) / 2);
    blocos[i]!.ofertas++;
    if (o.sinal === "verde") blocos[i]!.verdes++;
    somas[i]!.valor += o.valor;
    somas[i]!.km += o.metros / 1000;
  }
  return blocos.map((b, i) => ({ ...b, mediaPorKm: somas[i]!.km > 0 ? Math.round(somas[i]!.valor / somas[i]!.km) : null }));
}

/** Melhor e pior bloco (com pelo menos `minimo` ofertas), pela média por km. */
export function melhorEPior(blocos: readonly Bloco[], minimo = 3) {
  const validos = blocos.filter((b) => b.ofertas >= minimo && b.mediaPorKm !== null);
  if (!validos.length) return { melhor: null, pior: null };
  const ordem = [...validos].sort((a, b) => b.mediaPorKm! - a.mediaPorKm!);
  return { melhor: ordem[0]!, pior: ordem.length > 1 ? ordem.at(-1)! : null };
}
