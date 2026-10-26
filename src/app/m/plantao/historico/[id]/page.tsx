import { notFound } from "next/navigation";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { EditarCorrida } from "@/components/plantao/editar-corrida";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Editar oferta" };

export default async function EditarOferta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await exigirUsuario(`/m/plantao/historico/${id}`);
  const { data: c } = await supabaseAdmin().from("corridas_avaliadas").select("*").eq("id", id).eq("usuario_id", usuario.id).maybeSingle();
  if (!c) notFound();
  return (
    <div>
      <CabecalhoMotorista titulo="Editar oferta" voltar="/m/plantao/historico" />
      <EditarCorrida c={{ id: c.id, valor: c.valor_centavos, km: c.metros_corrida / 1000, minutos: c.minutos_corrida, kmBusca: c.metros_busca != null ? c.metros_busca / 1000 : null, minutosBusca: c.minutos_busca, decisao: c.decisao }} />
    </div>
  );
}
