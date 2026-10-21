import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso, CabecalhoPagina, Cartao } from "@/components/ui";
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
    supabase.from("veiculos").select("*").eq("id", veiculoId).eq("organizacao_id", organizacao.id).maybeSingle(),
    supabase.from("anuncios").select("*").eq("veiculo_id", veiculoId).maybeSingle(),
  ]);
  if (!v) notFound();
  const fotos = ((a?.fotos as string[] | undefined) ?? []).map((caminho) => ({ caminho, url: urlFoto(caminho) }));

  return (
    <div className="max-w-2xl">
      <CabecalhoPagina voltar={{ href: "/painel/anuncios", rotulo: "Anúncios" }} titulo={a ? "Editar anúncio" : "Anunciar carro"} subtitulo={`${v.modelo} · ${formatarPlaca(v.placa)}`} />
      {v.verificacao !== "verificado" && !a && (
        <div className="mb-4">
          <Aviso tom="alerta" titulo="Verifique o documento do carro antes">
            Só carros com o CRLV conferido pela equipe do Aluguei aparecem na busca. Isso protege os motoristas e dá mais confiança no seu anúncio.{" "}
            <Link href={`/painel/veiculos/${v.id}#documento`} className="font-semibold text-marca underline">Enviar o CRLV</Link>
          </Aviso>
        </div>
      )}
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
