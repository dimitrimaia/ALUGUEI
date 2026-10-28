import type { Centavos } from "../dinheiro/centavos";

/**
 * Rota de uma viagem: quais praças de pedágio ficam no caminho. A linha da rota
 * vem do OSRM e as praças do OpenStreetMap (barrier=toll_booth); o preço só vem
 * quando o mapa tem a etiqueta `charge` (raro), senão o motorista digita.
 *
 * Puro (sem rede): testado em rota.test.ts.
 */

export type Coordenada = { lat: number; lon: number };
export type Praca = Coordenada & { nome: string; preco: Centavos | null };

/** Distância (metros) de um ponto ao trecho a-b, numa projeção plana local (boa para centenas de metros). */
function aoTrecho(p: Coordenada, a: Coordenada, b: Coordenada): number {
  const k = Math.cos((p.lat * Math.PI) / 180) * 111_320;
  const [px, py, ax, ay, bx, by] = [p.lon * k, p.lat * 110_574, a.lon * k, a.lat * 110_574, b.lon * k, b.lat * 110_574];
  const dx = bx - ax;
  const dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Menor distância do ponto à linha da rota e em que trecho ela acontece. */
export function distanciaARota(p: Coordenada, linha: Coordenada[]): { metros: number; trecho: number } {
  let melhor = { metros: Infinity, trecho: 0 };
  for (let i = 0; i < linha.length - 1; i++) {
    const d = aoTrecho(p, linha[i]!, linha[i + 1]!);
    if (d < melhor.metros) melhor = { metros: d, trecho: i };
  }
  if (linha.length === 1) melhor = { metros: aoTrecho(p, linha[0]!, linha[0]!), trecho: 0 };
  return melhor;
}

/**
 * Praças a até `maxMetros` da rota, na ordem do caminho. Cabines da mesma praça
 * (os dois sentidos, várias cancelas) a menos de 1 km viram uma só.
 */
export function pracasNaRota(linha: Coordenada[], pracas: Praca[], maxMetros = 150): Praca[] {
  const perto = pracas
    .map((p) => ({ p, ...distanciaARota(p, linha) }))
    .filter((x) => x.metros <= maxMetros)
    .sort((a, b) => a.trecho - b.trecho);
  const saida: Praca[] = [];
  for (const { p } of perto) {
    const igual = saida.find((s) => distanciaARota(p, [s]).metros < 1000);
    if (igual) {
      if (igual.preco === null && p.preco !== null) igual.preco = p.preco;
      continue;
    }
    saida.push({ ...p });
  }
  return saida;
}

/** Etiqueta `charge` do OpenStreetMap ("6.40 BRL", "R$ 6,40") → centavos, ou null. */
export function lerPreco(charge: string | undefined): Centavos | null {
  if (!charge) return null;
  const m = /(\d+)(?:[.,](\d{1,2}))?/.exec(charge);
  if (!m || (!/brl|r\$/i.test(charge) && !/^\s*[\d.,]+\s*$/.test(charge))) return null;
  const v = Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0"));
  return v > 0 && v < 50_000 ? (v as Centavos) : null;
}
