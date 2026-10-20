import { Phone, UserCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Chat } from "@/components/chat";
import { BotaoAcao } from "@/components/painel/botao-acao";
import { CabecalhoPagina, Cartao, DadoRotulado, Placa } from "@/components/ui";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { marcarLida, participacao } from "@/lib/conversas";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { enviarConviteDaConversa } from "../acoes";

export default async function Conversa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { usuario, organizacao } = await exigirEquipe();
  const p = await participacao(id, usuario);
  if (!p || p.papel !== "locador" || p.conversa.organizacao_id !== organizacao.id) notFound();
  const admin = supabaseAdmin();
  const [{ data: mensagens }, { data: anuncio }] = await Promise.all([
    admin.from("mensagens").select("*").eq("conversa_id", id).order("criado_em"),
    admin.from("anuncios").select("*").eq("id", p.conversa.anuncio_id).single(),
  ]);
  const { data: v } = anuncio ? await admin.from("veiculos").select("modelo, placa").eq("id", anuncio.veiculo_id).single() : { data: null };
  await marcarLida(id, "locador");
  const c = p.conversa;

  return (
    <>
      <CabecalhoPagina voltar={{ href: "/painel/conversas", rotulo: "Conversas" }} titulo={c.nome_motorista} subtitulo={v ? `Interessado no ${v.modelo}` : undefined} />
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Cartao className="flex h-[calc(100dvh-17rem)] min-h-[24rem] flex-col p-3 sm:p-4 lg:h-[calc(100dvh-14rem)]">
          <Chat conversaId={id} papel="locador" iniciais={mensagens ?? []} />
        </Cartao>
        <div className="flex flex-col gap-4">
          <Cartao>
            {v && <div className="mb-3 flex items-center gap-3"><Placa placa={v.placa} tamanho="sm" /><span className="text-sm font-semibold">{v.modelo}</span></div>}
            {anuncio && (
              <dl className="divide-y divide-borda">
                <DadoRotulado rotulo="Aluguel">{formatarBRL(anuncio.aluguel_semanal_centavos)}/sem</DadoRotulado>
                <DadoRotulado rotulo="Caução">{formatarBRL(anuncio.caucao_centavos)}</DadoRotulado>
                <DadoRotulado rotulo="Franquia">{anuncio.franquia_km_mensal.toLocaleString("pt-BR")} km</DadoRotulado>
              </dl>
            )}
            <p className="mt-3 flex items-center gap-2 text-sm"><Phone size={15} className="text-marca" /> {c.telefone_motorista}</p>
          </Cartao>
          <Cartao className="flex flex-col gap-3">
            <p className="text-sm font-bold">Fechou negócio?</p>
            <p className="text-xs text-suave">O convite usa as condições do anúncio. O motorista faz o cadastro pelo link que aparece na conversa, e depois segue o fluxo normal: análise, contrato e vistoria.</p>
            {c.locatario_id ? (
              <Link href={`/painel/motoristas/${c.locatario_id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-marca"><UserCheck size={16} /> Ver cadastro do motorista</Link>
            ) : (
              <BotaoAcao acao={enviarConviteDaConversa.bind(null, id)} rotulo="Enviar convite" variante="primario" tamanho="md" confirmar="Enviar o convite?" />
            )}
          </Cartao>
        </div>
      </div>
    </>
  );
}
