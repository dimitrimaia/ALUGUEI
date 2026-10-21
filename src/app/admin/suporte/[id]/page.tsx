import { notFound } from "next/navigation";
import { ChatSuporte } from "@/components/chat";
import { Botao, CabecalhoPagina, Cartao, DadoRotulado } from "@/components/ui";
import { encerrarAtendimento } from "@/lib/acoes-suporte";
import { exigirEquipeAluguei } from "@/lib/equipe-aluguei";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { acessoAtendimento } from "@/lib/suporte";

export const metadata = { title: "Atendimento", robots: { index: false } };

export default async function AtendimentoEquipe({ params }: { params: Promise<{ id: string }> }) {
  await exigirEquipeAluguei();
  const { id } = await params;
  const acesso = await acessoAtendimento(id, "equipe");
  if (!acesso) notFound();
  const a = acesso.atendimento;
  const admin = supabaseAdmin();
  const [{ data: mensagens }, { data: u }, { data: org }] = await Promise.all([
    admin.from("mensagens_suporte").select("*").eq("atendimento_id", id).order("criado_em"),
    admin.auth.admin.getUserById(a.usuario_id),
    a.organizacao_id ? admin.from("organizacoes").select("nome").eq("id", a.organizacao_id).single() : Promise.resolve({ data: null }),
  ]);
  await admin.from("atendimentos").update({ lido_equipe_em: new Date().toISOString() }).eq("id", id);
  return (
    <main className="mx-auto grid max-w-5xl gap-4 px-5 py-8 lg:grid-cols-[1fr_18rem]">
      <div>
        <CabecalhoPagina voltar={{ href: "/admin/suporte", rotulo: "Fila" }} titulo={a.assunto} />
        <Cartao className="flex h-[calc(100dvh-12rem)] min-h-[24rem] flex-col p-3 sm:p-4">
          <ChatSuporte atendimentoId={id} iniciais={mensagens ?? []} lado="equipe" />
        </Cartao>
      </div>
      <Cartao className="h-fit">
        <dl className="divide-y divide-borda">
          <DadoRotulado rotulo="Pessoa">{(u.user?.user_metadata?.nome as string) ?? "—"}</DadoRotulado>
          <DadoRotulado rotulo="E-mail">{u.user?.email ?? "—"}</DadoRotulado>
          <DadoRotulado rotulo="Modo">{a.modo === "locador" ? "Locador" : "Motorista"}</DadoRotulado>
          {org && <DadoRotulado rotulo="Locadora">{org.nome}</DadoRotulado>}
        </dl>
        {a.status !== "encerrado" && (
          <form action={async () => { "use server"; await encerrarAtendimento(id, "equipe"); }} className="mt-4">
            <Botao variante="secundario" className="w-full">Encerrar atendimento</Botao>
          </form>
        )}
      </Cartao>
    </main>
  );
}
