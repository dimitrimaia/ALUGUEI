import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Fotos de documentos chegam comprimidas no navegador; o limite cobre 3–4 imagens.
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};

export default nextConfig;
