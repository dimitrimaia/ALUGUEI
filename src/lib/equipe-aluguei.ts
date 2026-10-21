import "server-only";
import { notFound } from "next/navigation";
import { usuarioAtual } from "./sessao";

/**
 * Equipe da plataforma (moderação, verificação de carros). Os e-mails ficam na
 * variável ADMINS, separados por vírgula. Para quem não está na lista, a página não existe.
 */
export function emailsDaEquipe(): string[] {
  return (process.env.ADMINS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

/** O usuário logado, se ele for da equipe do Aluguei. */
export async function equipeAluguei() {
  const usuario = await usuarioAtual();
  return usuario?.email && emailsDaEquipe().includes(usuario.email.toLowerCase()) ? usuario : null;
}

export async function exigirEquipeAluguei() {
  const usuario = await equipeAluguei();
  if (!usuario) notFound();
  return usuario;
}
