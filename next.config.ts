import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  serverExternalPackages: ["@react-pdf/renderer"],
  // Fotos de documentos chegam comprimidas no navegador; o limite cobre 3–4 imagens.
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
    // Telas já vistas voltam na hora (por 30 s) em vez de esperar o servidor de novo.
    staleTimes: { dynamic: 30, static: 300 },
  },
};

export default nextConfig;
