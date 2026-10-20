import { ImageResponse } from "next/og";

/** Ícone do app desenhado em código: carro branco sobre o verde da marca. */
export function respostaIcone(tamanho: number, { mascaravel = false } = {}) {
  const margem = mascaravel ? tamanho * 0.2 : tamanho * 0.12;
  const lado = tamanho - margem * 2;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0e7c66", borderRadius: mascaravel ? 0 : tamanho * 0.22 }}>
        <svg width={lado} height={lado} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 16h14l-1.6-5.2A2 2 0 0 0 15.5 9.4h-7a2 2 0 0 0-1.9 1.4L5 16Z" />
          <path d="M5 16v2.5M19 16v2.5" />
          <circle cx="8" cy="16" r="0.7" fill="#ffffff" />
          <circle cx="16" cy="16" r="0.7" fill="#ffffff" />
        </svg>
      </div>
    ),
    { width: tamanho, height: tamanho },
  );
}
