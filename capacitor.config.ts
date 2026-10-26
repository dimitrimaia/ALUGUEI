import type { CapacitorConfig } from "@capacitor/cli";

/**
 * App nativo do Aluguei (Capacitor em modo servidor remoto).
 * As telas vêm do site; o que é nativo fica no plugin "Plantao" (Android).
 * Detalhes em docs/app-nativo.md.
 */
const config: CapacitorConfig = {
  appId: "xyz.aluguei.app",
  appName: "Aluguei",
  // Só a tela de "Abrindo o Aluguei…"; o app de verdade vem de server.url.
  webDir: "public-nativo",
  server: {
    // Com "www": o site redireciona aluguei.xyz para www.aluguei.xyz, e a ponte
    // nativa (plugin Plantao) só entra no endereço exato configurado aqui.
    // Abre direto na área logada (/inicio), não na página de apresentação.
    url: "https://www.aluguei.xyz/inicio",
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
