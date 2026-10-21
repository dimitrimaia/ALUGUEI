import { ListaAvisos } from "@/components/avisos";
import { CabecalhoPagina } from "@/components/ui";
import { exigirEquipe } from "@/lib/sessao";

export const metadata = { title: "Avisos" };

export default async function AvisosLocador() {
  const { usuario } = await exigirEquipe();
  return (
    <div className="max-w-2xl">
      <CabecalhoPagina voltar={{ href: "/painel", rotulo: "Início" }} titulo="Avisos" />
      <ListaAvisos usuarioId={usuario.id} />
    </div>
  );
}
