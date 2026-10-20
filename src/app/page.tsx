import { LOCADOR, MOTORISTA } from "@/components/site/conteudo";
import { PaginaPerfil } from "@/components/site/pagina-perfil";
import { SiteInicial } from "@/components/site/site-inicial";

export default function Inicio() {
  return <SiteInicial locador={<PaginaPerfil c={LOCADOR} />} motorista={<PaginaPerfil c={MOTORISTA} />} />;
}
