import { usuarioAtual } from "@/lib/sessao";
import { LOCADOR, MOTORISTA } from "@/components/site/conteudo";
import { PaginaPerfil } from "@/components/site/pagina-perfil";
import { SiteInicial } from "@/components/site/site-inicial";

export default async function Inicio() {
  const usuario = await usuarioAtual();
  return <SiteInicial logado={usuario ? { nome: usuario.email ?? usuario.telefone ?? "Minha conta" } : null} locador={<PaginaPerfil c={LOCADOR} />} motorista={<PaginaPerfil c={MOTORISTA} />} />;
}
