import { redirect } from "next/navigation";
import { CarrosselBoasVindas } from "@/components/app-boas-vindas/carrossel";
import { usuarioAtual } from "@/lib/sessao";

export const metadata = { title: "Bem-vindo", robots: { index: false } };

/** Primeira tela do app (Capacitor) para quem não entrou. O site continua com a página de apresentação. */
export default async function BoasVindasApp() {
  if (await usuarioAtual()) redirect("/inicio");
  return <CarrosselBoasVindas />;
}
