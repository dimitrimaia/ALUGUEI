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
    url: "https://aluguei.xyz",
    androidScheme: "https",
    cleartext: false,
    allowNavigation: ["aluguei.xyz", "*.aluguei.xyz", "*.supabase.co"],
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
