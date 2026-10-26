import type { NextConfig } from "next";

// Versão desta publicação: o app compara com a do servidor e recarrega quando sai uma nova
// (uma tela antiga chamando ações de outra versão é o que dá "Algo deu errado").
const versao = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_VERSAO: versao },
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
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
