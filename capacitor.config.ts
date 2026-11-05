import type { CapacitorConfig } from "@capacitor/cli";

/**
 * App nativo do Aluguei (Capacitor em modo servidor remoto).
 * As telas vêm do site; o que é nativo fica no plugin "Plantao" (Android).
 * Detalhes em docs/app-nativo.md.
 */
const config: CapacitorConfig = {
  appId: "aluguei.app",
  appName: "Aluguei",
  // Só a tela de "Abrindo o Aluguei…"; o app de verdade vem de server.url.
  webDir: "public-nativo",
  server: {
    // O endereço oficial é sem "www" (www redireciona para cá, na Vercel). A ponte
    // nativa (plugin Plantao) só entra no endereço EXATO daqui: se o domínio
    // principal mudar na Vercel, mude aqui também e gere um APK novo.
    // Abre direto na área do app (/inicio), não na página de apresentação.
    url: "https://aluguei.xyz/inicio",
    androidScheme: "https",
    cleartext: false,
    allowNavigation: ["aluguei.xyz", "*.aluguei.xyz", "*.supabase.co"],
  },
  // O servidor reconhece o app pelo navegador ("AlugueiApp") e pula a landing.
  appendUserAgent: "AlugueiApp",
  android: {
    allowMixedContent: false,
  },
};

export default config;
