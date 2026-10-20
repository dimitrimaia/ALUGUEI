import { notFound, redirect } from "next/navigation";
import { CabecalhoPagina } from "@/components/ui";
import { formatarPlaca } from "@/dominio/cadastro/documentos";
import { linkTemporario } from "@/lib/evidencias";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { VistoriaEntrega } from "./vistoria";

/** Vistoria de entrega guiada (RF-040 a RF-042). Pensada para ser feita no celular, ao lado do carro. */
export default async function PaginaVistoria({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const { data: c } = await supabase.from("contratos").select("id, status, veiculo_id, locatario_id").eq("id", id).eq("organizacao_id", organizacao.id).maybeSingle();
  if (!c) notFound();
  if (c.status !== "assinado") redirect(`/painel/contratos/${id}`);

  const [{ data: v }, { data: l }, { data: enviadas }] = await Promise.all([
    supabase.from("veiculos").select("placa, modelo, odometro_atual").eq("id", c.veiculo_id).single(),
    supabase.from("locatarios").select("nome").eq("id", c.locatario_id).single(),
    supabase.from("evidencias").select("id, finalidade, caminho_storage, recebido_em").eq("contrato_id", id).like("finalidade", "vistoria.entrega.%").order("recebido_em"),
  ]);

  // Retoma o que já foi enviado (ex.: a página recarregou no meio da vistoria).
  const fotos: Record<string, { evidenciaId: string; url: string | null }> = {};
  const extras: { evidenciaId: string; url: string | null }[] = [];
  for (const e of enviadas ?? []) {
    const foto = e.finalidade.replace("vistoria.entrega.", "");
    const item = { evidenciaId: e.id, url: await linkTemporario(e.caminho_storage) };
    if (foto === "extra") extras.push(item);
    else fotos[foto] = item;
  }

  return (
    <div className="max-w-3xl">
      <CabecalhoPagina
        voltar={{ href: `/painel/contratos/${id}`, rotulo: "Contrato" }}
        titulo="Vistoria de entrega"
        subtitulo={`${v ? `${v.modelo} · ${formatarPlaca(v.placa)}` : ""}${l ? ` · ${l.nome}` : ""}`}
      />
      <VistoriaEntrega contratoId={id} odometroAtual={v?.odometro_atual ?? 0} fotosIniciais={fotos} extrasIniciais={extras} />
    </div>
  );
}
