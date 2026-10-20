import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const fonte = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--fonte-texto", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Aluguei · Gestão de locação para motoristas de app", template: "%s · Aluguei" },
  description: "Contrato, cobrança semanal, check-in e vistoria do carro alugado, tudo pelo celular.",
  applicationName: "Aluguei",
  appleWebApp: { capable: true, title: "Aluguei", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6fb" },
    { media: "(prefers-color-scheme: dark)", color: "#060e1f" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={fonte.variable}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
