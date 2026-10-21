import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Suspense } from "react";
import { BarraProgresso } from "@/components/barra-progresso";
import { RegistroNavegacao } from "@/components/voltar";
import { SCRIPT_TEMA } from "@/lib/tema";
import "./globals.css";

const fonte = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--fonte-texto", display: "swap" });

const TITULO = "Aluguei · Gestão de locação para motoristas de app";
const DESCRICAO = "Contrato, cobrança semanal no Pix, check-in e vistoria do carro alugado, tudo pelo celular. Para locadores e motoristas de aplicativo.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL_PRODUCAO ?? "https://aluguei.xyz"),
  title: { default: TITULO, template: "%s · Aluguei" },
  description: DESCRICAO,
  applicationName: "Aluguei",
  appleWebApp: { capable: true, title: "Aluguei", statusBarStyle: "default" },
  // Prévia do link no WhatsApp, Instagram e afins. A imagem vem de opengraph-image.tsx.
  openGraph: { type: "website", locale: "pt_BR", siteName: "Aluguei", title: TITULO, description: DESCRICAO },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRICAO },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // App em tela cheia: sem zoom por pinça nem zoom automático ao focar campos.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-tema é trocado pelo script antes da pintura; suppressHydrationWarning evita o aviso do React.
    <html lang="pt-BR" className={fonte.variable} data-tema="claro" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <Suspense>
          <BarraProgresso />
          <RegistroNavegacao />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
