import type { Centavos } from "../dinheiro/centavos";

/** Tabela de preço do motorista para clientes particulares, por categoria de carro. */
export type TabelaParticular = {
  nome: string;
  tarifaBase: Centavos;
  porKm: Centavos;
  porMinuto: Centavos;
  minimo: Centavos;
};

export const TABELA_PADRAO: TabelaParticular = { nome: "Carro", tarifaBase: 500, porKm: 250, porMinuto: 30, minimo: 1500 };

/** Preço estimado: base + km + minutos, nunca abaixo do mínimo, arredondado para cima no real. */
export function estimarParticular(km: number, minutos: number, t: TabelaParticular): Centavos {
  const bruto = t.tarifaBase + t.porKm * km + t.porMinuto * minutos;
  return Math.ceil(Math.max(t.minimo, bruto) / 100) * 100;
}

/** Distância em linha reta (km), para conferir a rota e de reserva quando o serviço de rotas falha. */
export function distanciaReta(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Rota de reserva: linha reta × 1,35 (média das cidades), a 25 km/h. */
export function rotaEstimada(retaKm: number) {
  const km = Math.round(retaKm * 1.35 * 10) / 10;
  return { km, minutos: Math.max(1, Math.round((km / 25) * 60)) };
}

/** "joão da silva" → "joao-da-silva" (link público do motorista). */
export function paraSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
