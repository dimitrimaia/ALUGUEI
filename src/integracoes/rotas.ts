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

export type Sugestao = { nome: string; lat: number; lon: number };

/** Endereços parecidos com o texto (para o campo com sugestões), perto de `perto` se vier. */
export async function sugerirEnderecos(texto: string, perto?: { lat: number; lon: number } | null): Promise<Sugestao[]> {
  const q = texto.trim();
  if (q.length < 3) return [];
  const centro = perto ?? { lat: -15.8, lon: -47.9 };
  try {
    const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=default&lat=${centro.lat}&lon=${centro.lon}`, { headers: { "user-agent": AGENTE }, signal: AbortSignal.timeout(5000), next: { revalidate: 86_400 } });
    if (!r.ok) return [];
    const corpo = (await r.json()) as { features?: { geometry: { coordinates: [number, number] }; properties: { countrycode?: string; name?: string; city?: string; state?: string; street?: string; housenumber?: string; district?: string } }[] };
    const vistos = new Set<string>();
    return (corpo.features ?? [])
      .filter((f) => f.properties.countrycode === "BR")
      .map((f) => {
        const p = f.properties;
        const rua = p.street ? `${p.street}${p.housenumber ? `, ${p.housenumber}` : ""}` : null;
        const nome = [p.name && p.name !== p.street ? p.name : null, rua, p.district, p.city, p.state].filter(Boolean).join(" · ");
        return { nome, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] };
      })
      .filter((s) => s.nome && !vistos.has(s.nome) && vistos.add(s.nome))
      .slice(0, 5);
  } catch {
    return [];
  }
}

export type RotaCompleta = { km: number; minutos: number; linha: { lat: number; lon: number }[] };

/** Rota de carro com a linha do caminho (para achar os pedágios). Null se o OSRM não respondeu. */
export async function rotaComLinha(a: { lat: number; lon: number }, b: { lat: number; lon: number }): Promise<RotaCompleta | null> {
  return rotaPorPontos([a, b]);
}

/** Rota passando pelos pontos na ordem (saída, paradas, destino). */
export async function rotaPorPontos(pontos: { lat: number; lon: number }[]): Promise<RotaCompleta | null> {
  if (pontos.length < 2) return null;
  const caminho = pontos.map((p) => `${p.lon},${p.lat}`).join(";");
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${caminho}?overview=simplified&geometries=geojson`, { headers: { "user-agent": AGENTE }, signal: AbortSignal.timeout(8000), next: { revalidate: 86_400 } });
    if (!r.ok) return null;
    const corpo = (await r.json()) as { routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[] };
    const rota = corpo.routes?.[0];
    if (!rota) return null;
    return { km: Math.round(rota.distance / 100) / 10, minutos: Math.max(1, Math.round(rota.duration / 60)), linha: rota.geometry.coordinates.map(([lon, lat]) => ({ lat, lon })) };
  } catch {
    return null;
  }
}

/** Cabines de pedágio do OpenStreetMap na área da rota (com o preço, quando o mapa tem). */
export async function pedagiosNaArea(linha: { lat: number; lon: number }[]): Promise<{ nome: string; lat: number; lon: number; charge?: string }[]> {
  if (!linha.length) return [];
  const lats = linha.map((p) => p.lat);
  const lons = linha.map((p) => p.lon);
  const folga = 0.02;
  const caixa = [Math.min(...lats) - folga, Math.min(...lons) - folga, Math.max(...lats) + folga, Math.max(...lons) + folga].map((n) => n.toFixed(4)).join(",");
  const consulta = `[out:json][timeout:20];(node["barrier"="toll_booth"](${caixa});way["barrier"="toll_booth"](${caixa}););out center tags;`;
  try {
    const r = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: new URLSearchParams({ data: consulta }), headers: { "user-agent": AGENTE }, signal: AbortSignal.timeout(20_000), next: { revalidate: 604_800 } });
    if (!r.ok) return [];
    const corpo = (await r.json()) as { elements?: { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] };
    return (corpo.elements ?? []).flatMap((e) => {
      const lat = e.lat ?? e.center?.lat;
      const lon = e.lon ?? e.center?.lon;
      if (lat == null || lon == null) return [];
      const t = e.tags ?? {};
      return [{ nome: t.name || t.operator || "Praça de pedágio", lat, lon, charge: t["charge:motorcar"] ?? t.charge }];
    });
  } catch {
    return [];
  }
}
