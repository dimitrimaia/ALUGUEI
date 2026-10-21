import { ImageResponse } from "next/og";

export const alt = "Aluguei: gestão de locação de carros para motoristas de app";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Fonte da marca para a imagem (gerada no build). Sem rede, cai na fonte padrão. */
async function fontesDaMarca() {
  try {
    const css = await (await fetch("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700")).text();
    const urls = [...css.matchAll(/font-weight: (\d+);\s*src: url\((.+?\.ttf)\)/g)];
    return await Promise.all(
      urls.map(async ([, peso, url]) => ({ name: "Jakarta", data: await (await fetch(url!)).arrayBuffer(), weight: Number(peso) as 500 | 700, style: "normal" as const })),
    );
  } catch {
    return [];
  }
}

/** Imagem da prévia do link (WhatsApp, Instagram, Facebook), desenhada em código. */
export default async function ImagemCompartilhamento() {
  const fontes = await fontesDaMarca();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          color: "#fff",
          background: "radial-gradient(120% 120% at 100% 0%, rgba(91,140,255,0.55) 0%, rgba(91,140,255,0) 55%), linear-gradient(135deg, #0a2a7a 0%, #1f56e8 100%)",
          fontFamily: fontes.length ? "Jakarta" : "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="76" height="76" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 20 11 4.5h2L19.5 20" />
            <path d="M12 10.5v1.6M12 14.6v1.6M12 18.7V20" strokeWidth="2" />
          </svg>
          <span style={{ fontSize: 60, fontWeight: 700, letterSpacing: 6 }}>ALUGUEI</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <span style={{ fontSize: 66, fontWeight: 700, lineHeight: 1.08, maxWidth: 960 }}>Locação de carros para motoristas de app</span>
          <span style={{ fontSize: 32, fontWeight: 500, color: "rgba(255,255,255,0.82)", maxWidth: 980 }}>Contrato, aluguel semanal no Pix, check-in e vistoria, tudo pelo celular.</span>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {["Para locadores", "Para motoristas", "aluguei.xyz"].map((t) => (
            <span key={t} style={{ display: "flex", fontSize: 26, fontWeight: 700, padding: "12px 24px", borderRadius: 999, background: "rgba(255,255,255,0.14)", border: "2px solid rgba(255,255,255,0.25)" }}>{t}</span>
          ))}
        </div>
      </div>
    ),
    { ...size, ...(fontes.length ? { fonts: fontes } : {}) },
  );
}
