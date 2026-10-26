import { Comecar } from "@/components/app-boas-vindas/comecar";
import { primeiroNome } from "@/dominio/conta/preferencias";
import { perfilResumido } from "@/lib/conta";
import { aluguelDoContrato } from "@/lib/plantao";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Começar", robots: { index: false } };

/** Primeiros passos depois de criar a conta (no app e no site). */
export default async function PaginaComecar() {
  const usuario = await exigirUsuario("/comecar");
  const [perfil, aluguel] = await Promise.all([perfilResumido(), aluguelDoContrato(usuario.id)]);
  return <Comecar nome={primeiroNome(perfil?.nomeInformado)} temContrato={aluguel !== null} />;
}
