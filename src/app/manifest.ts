import type { MetadataRoute } from "next";

/** Permite instalar o Aluguei na tela inicial do celular (PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aluguei",
    short_name: "Aluguei",
    description: "Contrato, pagamento semanal, check-in e vistoria do carro alugado.",
    lang: "pt-BR",
    start_url: "/inicio",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f6fb",
    theme_color: "#1f56e8",
    icons: [
      { src: "/icone/192", sizes: "192x192", type: "image/png" },
      { src: "/icone/512", sizes: "512x512", type: "image/png" },
      { src: "/icone/512-mascaravel", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
