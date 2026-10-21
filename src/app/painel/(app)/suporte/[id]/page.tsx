import { notFound } from "next/navigation";
import { ChatSuporte } from "@/components/chat";
import { agenteLigado, humanoAssumiu } from "@/lib/agente-suporte";
import { CabecalhoPagina, Cartao } from "@/components/ui";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { acessoAtendimento } from "@/lib/suporte";

export const metadata = { title: "Suporte" };

export default async function AtendimentoLocador({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acesso = await acessoAtendimento(id, "usuario");
  if (!acesso) notFound();
  const admin = supabaseAdmin();
  const { data: mensagens } = await admin.from("mensagens_suporte").select("*").eq("atendimento_id", id).order("criado_em");
  await admin.from("atendimentos").update({ lido_usuario_em: new Date().toISOString() }).eq("id", id);
  return (
    <div className="max-w-2xl">
      <CabecalhoPagina voltar={{ href: "/painel/suporte", rotulo: "Suporte" }} titulo={acesso.atendimento.assunto} tituloCurto={`Suporte · ${acesso.atendimento.assunto}`} />
      <Cartao className="flex h-[calc(100dvh-14rem)] min-h-[22rem] flex-col p-3 sm:p-4 lg:h-[calc(100dvh-12rem)]">
        <ChatSuporte atendimentoId={id} iniciais={mensagens ?? []} assistente={agenteLigado() && !humanoAssumiu(mensagens ?? [])} />
      </Cartao>
    </div>
  );
}
