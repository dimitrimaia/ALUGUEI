import "server-only";
import { distanciaReta, rotaEstimada } from "@/dominio/ganhos/particular";

/**
 * Endereço → coordenadas (Photon, do OpenStreetMap) e rota de carro (OSRM).
 * Os dois são gratuitos e públicos, com limite de uso justo: bons para o
 * volume do piloto. Se falharem, a rota é estimada pela linha reta.
 * Para volume alto: trocar por Google Routes/Mapbox (pago) só aqui.
 */

const AGENTE = "Aluguei/1.0 (+https://aluguei.xyz)";
type Ponto = { lat: number; lon: number; nome: string };

export async function geocodificar(texto: string): Promise<Ponto | null> {
  const q = texto.trim();
  if (q.length < 3) return null;
  try {
    // Viés para o Brasil (centro aproximado) e só resultados no país.
    const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lat=-15.8&lon=-47.9`, { headers: { "user-agent": AGENTE }, signal: AbortSignal.timeout(5000), next: { revalidate: 86_400 } });
    if (!r.ok) return null;
    const corpo = (await r.json()) as { features?: { geometry: { coordinates: [number, number] }; properties: { countrycode?: string; name?: string; city?: string; state?: string; street?: string; housenumber?: string } }[] };
    const f = corpo.features?.find((x) => x.properties.countrycode === "BR");
    if (!f) return null;
    const p = f.properties;
    const nome = [p.street ? `${p.street}${p.housenumber ? `, ${p.housenumber}` : ""}` : p.name, p.city, p.state].filter(Boolean).join(" · ");
    return { lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], nome };
  } catch {
    return null;
  }
}

export type Rota = { km: number; minutos: number; estimada: boolean; origem: string; destino: string };

export async function calcularRota(origem: string, destino: string): Promise<Rota | null> {
  const [a, b] = await Promise.all([geocodificar(origem), geocodificar(destino)]);
  if (!a || !b) return null;
  const reta = distanciaReta(a, b);
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`, { headers: { "user-agent": AGENTE }, signal: AbortSignal.timeout(6000), next: { revalidate: 86_400 } });
    const corpo = r.ok ? ((await r.json()) as { routes?: { distance: number; duration: number }[] }) : null;
    const rota = corpo?.routes?.[0];
    const km = rota ? Math.round(rota.distance / 100) / 10 : 0;
    // Rota absurda (zero ou mais de 4× a linha reta): usa a estimativa.
    if (rota && km >= 0.1 && km <= Math.max(1, reta * 4)) return { km, minutos: Math.max(1, Math.round(rota.duration / 60)), estimada: false, origem: a.nome, destino: b.nome };
  } catch {}
  return { ...rotaEstimada(reta), estimada: true, origem: a.nome, destino: b.nome };
}
