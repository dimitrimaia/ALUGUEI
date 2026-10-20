import { ImageResponse } from "next/og";

/** Ícone do app desenhado em código: o "A" de estrada sobre o azul da marca. */
export function respostaIcone(tamanho: number, { mascaravel = false } = {}) {
  const margem = mascaravel ? tamanho * 0.2 : tamanho * 0.12;
  const lado = tamanho - margem * 2;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #3b74ff 0%, #1641b8 100%)", borderRadius: mascaravel ? 0 : tamanho * 0.22 }}>
        <svg width={lado} height={lado} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 20 11 4.5h2L19.5 20" />
          <path d="M12 10.5v1.6M12 14.6v1.6M12 18.7V20" strokeWidth="2" />
        </svg>
      </div>
    ),
    { width: tamanho, height: tamanho },
  );
}
