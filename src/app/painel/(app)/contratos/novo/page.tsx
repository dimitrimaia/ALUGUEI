import { notFound } from "next/navigation";
import type { Oferta } from "@/db/schema/pessoas";
import { CabecalhoPagina, Cartao } from "@/components/ui";
import { formatarPlaca } from "@/dominio/cadastro/documentos";
import { PARAMETROS_CONTRATO_REFERENCIA } from "@/dominio/contrato/parametros";
import { hoje } from "@/dominio/datas/data";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { FormularioContrato } from "./formulario";

export default async function NovoContrato({ searchParams }: { searchParams: Promise<{ locatario?: string }> }) {
  const { locatario } = await searchParams;
  const { organizacao } = await exigirEquipe();
  if (!locatario) notFound();
  const supabase = await supabaseServidor();
  const [{ data: l }, { data: veiculos }] = await Promise.all([
    supabase.from("locatarios").select("id, nome, status, oferta, veiculo_ofertado_id").eq("id", locatario).eq("organizacao_id", organizacao.id).maybeSingle(),
    supabase.from("veiculos").select("id, placa, modelo").eq("organizacao_id", organizacao.id).eq("status", "disponivel").order("modelo"),
  ]);
  if (!l || l.status !== "aprovado") notFound();

  const oferta = l.oferta as Oferta | null;
  const ref = PARAMETROS_CONTRATO_REFERENCIA;
  return (
    <div className="max-w-3xl">
      <CabecalhoPagina
        voltar={{ href: `/painel/motoristas/${l.id}`, rotulo: l.nome }}
        titulo="Novo contrato"
        subtitulo="Os valores vêm do convite. Confira e gere: o motorista assina pelo celular."
      />
      <Cartao>
        <FormularioContrato
          locatarioId={l.id}
          veiculos={(veiculos ?? []).map((v) => ({ id: v.id, rotulo: `${formatarPlaca(v.placa)} · ${v.modelo}` }))}
          inicial={{
            veiculoId: l.veiculo_ofertado_id ?? "",
            inicio: hoje(),
            prazoMeses: oferta?.prazoMeses ?? 3,
            aluguelSemanal: (oferta?.aluguelSemanal ?? ref.aluguelSemanal) / 100,
            caucao: (oferta?.caucao ?? ref.caucao.total) / 100,
            franquiaKmMensal: oferta?.franquiaKmMensal ?? ref.km.franquiaMensal,
            valorKmExcedente: ref.km.valorExcedente / 100,
            areaCirculacao: `${organizacao.cidade}/${organizacao.uf} e região`,
          }}
        />
      </Cartao>
    </div>
  );
}
