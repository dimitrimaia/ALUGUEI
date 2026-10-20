import { notFound } from "next/navigation";
import { CabecalhoPagina, Cartao } from "@/components/ui";
import { formatarPlaca } from "@/dominio/cadastro/documentos";
import { PARAMETROS_CONTRATO_REFERENCIA as ref } from "@/dominio/contrato/parametros";
import { urlFoto } from "@/lib/marketplace";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { FormularioAnuncio } from "./formulario";

export default async function EditarAnuncio({ params }: { params: Promise<{ veiculoId: string }> }) {
  const { veiculoId } = await params;
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const [{ data: v }, { data: a }] = await Promise.all([
    supabase.from("veiculos").select("id, placa, modelo, status").eq("id", veiculoId).eq("organizacao_id", organizacao.id).maybeSingle(),
    supabase.from("anuncios").select("*").eq("veiculo_id", veiculoId).maybeSingle(),
  ]);
  if (!v) notFound();
  const fotos = ((a?.fotos as string[] | undefined) ?? []).map((caminho) => ({ caminho, url: urlFoto(caminho) }));

  return (
    <div className="max-w-2xl">
      <CabecalhoPagina voltar={{ href: "/painel/anuncios", rotulo: "Anúncios" }} titulo={a ? "Editar anúncio" : "Anunciar carro"} subtitulo={`${v.modelo} · ${formatarPlaca(v.placa)}`} />
      <Cartao>
        <FormularioAnuncio
          veiculoId={v.id}
          fotosIniciais={fotos}
          inicial={{
            cidade: a?.cidade ?? organizacao.cidade,
            uf: a?.uf ?? organizacao.uf,
            aluguelSemanal: ((a?.aluguel_semanal_centavos ?? ref.aluguelSemanal) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
            caucao: ((a?.caucao_centavos ?? ref.caucao.total) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
            franquiaKmMensal: a?.franquia_km_mensal ?? ref.km.franquiaMensal,
            prazoMinimoMeses: a?.prazo_minimo_meses ?? 3,
            descricao: a?.descricao ?? "",
          }}
        />
      </Cartao>
    </div>
  );
}
