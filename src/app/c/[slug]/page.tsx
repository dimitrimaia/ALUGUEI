import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PedidoPublico } from "@/components/clientes/pedido-publico";
import { Avatar, Marca } from "@/components/ui";
import type { TabelaParticular } from "@/dominio/ganhos/particular";
import { pessoas } from "@/lib/caronas";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function perfil(slug: string) {
  const { data } = await supabaseAdmin().from("perfis_particular").select("*").eq("slug", slug).eq("ativo", true).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await perfil((await params).slug);
  return p ? { title: `Corridas com ${p.nome} · ${p.cidade}`, description: `Agende sua corrida com ${p.nome} em ${p.cidade}. Preço na hora, confirmação pelo WhatsApp.` } : { title: "Página não encontrada" };
}

/** Página pública do motorista (link para os clientes particulares). Sempre clara, como um cartão de visita. */
export default async function PaginaMotorista({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await perfil(slug);
  if (!p) notFound();
  const foto = (await pessoas([p.usuario_id])).get(p.usuario_id)?.foto ?? null;
  const tabelas = p.tabelas as TabelaParticular[];
  return (
    <div className="min-h-dvh bg-[#f3f6fb] text-[#0b1630]" style={{ colorScheme: "light" }}>
      <div className="mx-auto flex max-w-md flex-col gap-5 px-4 py-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar nome={p.nome} foto={foto} tamanho="xl" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{p.nome}</h1>
            <p className="text-sm text-[#5b6880]">Motorista particular · {p.cidade}</p>
          </div>
          {p.apresentacao && <p className="max-w-sm text-sm text-[#334155]">{p.apresentacao}</p>}
        </div>
        <section className="rounded-[1.4rem] bg-white p-4 shadow-[0_10px_30px_-12px_rgba(11,22,48,0.25)]">
          <h2 className="mb-3 font-bold">Agende sua corrida</h2>
          <PedidoPublico slug={p.slug} categorias={tabelas.map((t) => t.nome)} />
        </section>
        <Link href="/" className="flex items-center justify-center gap-2 text-xs text-[#5b6880]">Feito com <Marca className="scale-75" /></Link>
      </div>
    </div>
  );
}
