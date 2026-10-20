import { SiteInicial } from "@/components/site/site-inicial";
import { VersaoLocador } from "@/components/site/versao-locador";
import { VersaoMotorista } from "@/components/site/versao-motorista";

export default function Inicio() {
  return <SiteInicial locador={<VersaoLocador />} motorista={<VersaoMotorista />} />;
}
