import { notFound } from "next/navigation";
import { Chat } from "@/components/chat";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { marcarLida, participacao } from "@/lib/conversas";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function ConversaMotorista({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await exigirUsuario(`/m/conversas/${id}`);
  const p = await participacao(id, usuario);
  if (!p || p.papel !== "motorista") notFound();
  const admin = supabaseAdmin();
  const [{ data: mensagens }, { data: anuncio }, { data: org }] = await Promise.all([
    admin.from("mensagens").select("*").eq("conversa_id", id).order("criado_em"),
    admin.from("anuncios").select("veiculo_id, aluguel_semanal_centavos, cidade, uf").eq("id", p.conversa.anuncio_id).single(),
    admin.from("organizacoes").select("nome").eq("id", p.conversa.organizacao_id).single(),
  ]);
  const { data: v } = anuncio ? await admin.from("veiculos").select("modelo").eq("id", anuncio.veiculo_id).single() : { data: null };
  await marcarLida(id, "motorista");

  return (
    // Tela cheia e fixa: só a lista de mensagens rola, e o campo fica colado embaixo.
    <div className="fixed inset-0 z-30 mx-auto flex max-w-[30rem] flex-col bg-fundo px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <CabecalhoMotorista titulo={org?.nome ?? "Conversa"} voltar="/m/conversas" />
      <div className="-mt-3 rounded-xl border border-borda bg-cartao px-3 py-2 text-xs">
        <span className="font-semibold">{v?.modelo}</span>
        {anuncio && <span className="text-suave"> · {formatarBRL(anuncio.aluguel_semanal_centavos)}/semana · {anuncio.cidade}/{anuncio.uf}</span>}
      </div>
      <Chat conversaId={id} papel="motorista" iniciais={mensagens ?? []} />
    </div>
  );
}
