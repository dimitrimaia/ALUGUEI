import { notFound } from "next/navigation";
import { ChatSuporte } from "@/components/chat";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { acessoAtendimento } from "@/lib/suporte";

export const metadata = { title: "Suporte" };

export default async function AtendimentoMotorista({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acesso = await acessoAtendimento(id, "usuario");
  if (!acesso) notFound();
  const admin = supabaseAdmin();
  const { data: mensagens } = await admin.from("mensagens_suporte").select("*").eq("atendimento_id", id).order("criado_em");
  await admin.from("atendimentos").update({ lido_usuario_em: new Date().toISOString() }).eq("id", id);
  return (
    // Tela cheia, como a conversa com o locador.
    <div className="fixed inset-0 z-30 mx-auto flex max-w-[30rem] flex-col bg-fundo px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <CabecalhoMotorista titulo={`Suporte · ${acesso.atendimento.assunto}`} voltar="/m/suporte" />
      <ChatSuporte atendimentoId={id} iniciais={mensagens ?? []} />
    </div>
  );
}
