import { notFound, redirect } from "next/navigation";
import { CabecalhoPublico } from "@/components/site/cabecalho-publico";
import { Aviso, Cartao } from "@/components/ui";
import { mensagemDeInteresse } from "@/dominio/marketplace/cidade";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { anuncioPublico } from "@/lib/marketplace";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { FormularioInteresse } from "./formulario";

export default async function Interesse({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await exigirUsuario(`/carros/${id}/interesse`);
  const a = await anuncioPublico(id);
  if (!a) notFound();

  const admin = supabaseAdmin();
  const { data: conversa } = await admin.from("conversas").select("id").eq("anuncio_id", id).eq("usuario_id", usuario.id).maybeSingle();
  if (conversa) redirect(`/m/conversas/${conversa.id}`);
  const { data: anuncio } = await admin.from("anuncios").select("organizacao_id").eq("id", id).single();
  const { data: membro } = anuncio ? await admin.from("membros").select("id").eq("organizacao_id", anuncio.organizacao_id).eq("usuario_id", usuario.id).maybeSingle() : { data: null };
  const { data: cadastro } = await admin.from("locatarios").select("nome, telefone").eq("usuario_id", usuario.id).limit(1).maybeSingle();

  return (
    <div className="tema-claro min-h-dvh bg-fundo">
      <CabecalhoPublico voltar={{ href: `/carros/${id}`, rotulo: "Anúncio" }} />
      <main className="mx-auto flex max-w-md flex-col gap-4 px-5 pt-6 pb-16">
        <div>
          <h1 className="text-[1.5rem] font-extrabold tracking-tight">Falar com o locador</h1>
          <p className="mt-1 text-sm text-suave">{a.veiculo.modelo} · {formatarBRL(a.aluguelSemanal)}/semana · {a.cidade}/{a.uf}</p>
        </div>
        {membro ? (
          <Aviso tom="neutro">Este anúncio é da sua locadora. As conversas dele ficam no painel.</Aviso>
        ) : (
          <Cartao>
            <FormularioInteresse anuncioId={id} inicial={{ nome: cadastro?.nome ?? "", celular: cadastro?.telefone ?? usuario.telefone ?? "", mensagem: mensagemDeInteresse(a.veiculo.modelo) }} />
          </Cartao>
        )}
        <p className="text-center text-xs text-suave">Seu celular fica visível só para o locador deste anúncio.</p>
      </main>
    </div>
  );
}
