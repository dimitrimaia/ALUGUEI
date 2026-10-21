import { CheckCircle2, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { BotaoAcao } from "@/components/painel/botao-acao";
import { CabecalhoPagina, Cartao, DadoRotulado, Selo } from "@/components/ui";
import { ITENS_CHECKIN } from "@/dominio/checkin/checkin";
import { data, formatarData } from "@/dominio/datas/data";
import { combustivelPorExtenso } from "@/dominio/vistoria/roteiro";
import { linkTemporario } from "@/lib/evidencias";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { marcarRevisado } from "../acoes";

export const metadata = { title: "Check-in" };

/** O check-in enviado pelo motorista: fotos, vídeo, km, combustível, hora e local. */
export default async function VerCheckin({ params }: { params: Promise<{ id: string; checkinId: string }> }) {
  const { id, checkinId } = await params;
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const { data: ck } = await supabase.from("checkins").select("*").eq("id", checkinId).eq("contrato_id", id).eq("organizacao_id", organizacao.id).maybeSingle();
  if (!ck) notFound();
  const evidencias = ck.evidencias as Record<string, string>;
  const { data: provas } = await supabase.from("evidencias").select("id, caminho_storage, mime, recebido_em, latitude, longitude").in("id", Object.values(evidencias));
  const arquivos = await Promise.all(
    ITENS_CHECKIN.map(async (item) => {
      const p = provas?.find((x) => x.id === evidencias[item.id]);
      return { item, prova: p, url: p ? await linkTemporario(p.caminho_storage) : null };
    }),
  );
  const local = provas?.find((p) => p.latitude && p.longitude);

  return (
    <div className="max-w-3xl">
      <CabecalhoPagina voltar={{ href: `/painel/contratos/${id}`, rotulo: "Contrato" }} titulo={`Check-in de ${formatarData(data(ck.referencia))}`} subtitulo={`Enviado em ${new Date(ck.enviado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`} />
      <div className="grid gap-4">
        <Cartao>
          <dl className="divide-y divide-borda">
            <DadoRotulado rotulo="Km informado">{ck.odometro_informado?.toLocaleString("pt-BR")} km</DadoRotulado>
            <DadoRotulado rotulo="Combustível">{ck.combustivel_oitavos !== null ? combustivelPorExtenso(ck.combustivel_oitavos) : "—"}</DadoRotulado>
            <DadoRotulado rotulo="Local">
              {local ? <a className="inline-flex items-center gap-1 font-semibold text-marca" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${local.latitude},${local.longitude}`}><MapPin size={14} /> Ver no mapa</a> : "Não informado"}
            </DadoRotulado>
          </dl>
          <div className="mt-4 flex items-center justify-between gap-3">
            {ck.revisado_por ? <Selo tom="ok"><CheckCircle2 size={13} className="mr-1 inline" />Revisado</Selo> : <Selo tom="alerta">Aguardando sua revisão</Selo>}
            {!ck.revisado_por && <BotaoAcao acao={marcarRevisado.bind(null, id, ck.id)} rotulo="Marcar como revisado" variante="primario" />}
          </div>
        </Cartao>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {arquivos.map(({ item, prova, url }) => (
            <Cartao key={item.id} className={`p-2 sm:p-2 ${item.tipo === "video" ? "col-span-2 lg:col-span-3" : ""}`}>
              {url && prova?.mime.startsWith("video") ? (
                <video src={url} controls playsInline className="aspect-video w-full rounded-xl bg-black" />
              ) : url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={item.rotulo} className="aspect-[4/3] w-full rounded-xl object-cover" /></a>
              ) : (
                <div className="grid aspect-[4/3] place-items-center rounded-xl bg-cartao-2 text-sm text-suave">Sem arquivo</div>
              )}
              <p className="px-1.5 pt-2 pb-1 text-xs font-semibold sm:text-sm">{item.rotulo}</p>
            </Cartao>
          ))}
        </div>
      </div>
    </div>
  );
}
