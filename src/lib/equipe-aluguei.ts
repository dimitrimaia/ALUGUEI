import "server-only";
import { notFound } from "next/navigation";
import { usuarioAtual } from "./sessao";

/**
 * Equipe da plataforma (moderação, verificação de carros). Os e-mails ficam na
 * variável ADMINS, separados por vírgula. Para quem não está na lista, a página não existe.
 */
export async function exigirEquipeAluguei() {
  const usuario = await usuarioAtual();
  const admins = (process.env.ADMINS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!usuario?.email || !admins.includes(usuario.email.toLowerCase())) notFound();
  return usuario;
}
