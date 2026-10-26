import { Plus, Search, Users } from "lucide-react";
import type { Metadata } from "next";
import { CartaoCarona } from "@/components/caronas/cartao";
import { CabecalhoPublico } from "@/components/site/cabecalho-publico";
import { BotaoLink, classeEntrada, Vazio } from "@/components/ui";
import { buscarCaronas, pessoas, vagasLivres } from "@/lib/caronas";

export const metadata: Metadata = {
  title: "Caronas",
  description: "Caronas entre cidades com divisão de custos. Ofereça as vagas do seu carro ou encontre quem vai para o mesmo lugar.",
  openGraph: { title: "Caronas · Aluguei", description: "Divida combustível e pedágio com quem vai para o mesmo lugar." },
};
export const dynamic = "force-dynamic";

/** Busca pública de caronas: qualquer pessoa vê; para pedir, entra na conta. */
export default async function CaronasPublicas({ searchParams }: { searchParams: Promise<{ de?: string; para?: string; dia?: string }> }) {
  const f = await searchParams;
  const lista = await buscarCaronas(f);
  const [livres, gente] = await Promise.all([vagasLivres(lista.map((c) => c.id)), pessoas(lista.map((c) => c.motorista_id))]);
  return (
    <div className="tema-claro min-h-dvh bg-fundo">
      <CabecalhoPublico />
      <main className="mx-auto max-w-3xl px-5 pt-6 pb-16">
        <h1 className="text-[1.6rem] leading-tight font-extrabold tracking-tight sm:text-3xl">Caronas</h1>
        <p className="mt-1 text-sm text-suave">Vai pegar estrada? Divida combustível e pedágio com quem vai para o mesmo lugar. Sem lucro, só a divisão do custo.</p>
        <form className="mt-5 grid gap-2 rounded-[1.1rem] border border-borda bg-cartao p-3 shadow-cartao sm:grid-cols-[1fr_1fr_10rem_auto]">
          <input name="de" defaultValue={f.de} placeholder="Saindo de" aria-label="Saindo de" className={classeEntrada} />
          <input name="para" defaultValue={f.para} placeholder="Indo para" aria-label="Indo para" className={classeEntrada} />
          <input name="dia" type="date" defaultValue={f.dia} aria-label="Dia" className={classeEntrada} />
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-marca px-4 text-sm font-semibold text-white"><Search size={16} /> Buscar</button>
        </form>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {lista.map((c) => {
            const m = gente.get(c.motorista_id);
            return <CartaoCarona key={c.id} c={c} livres={livres.get(c.id) ?? 0} motorista={m ? { nome: m.nome.split(" ")[0]!, foto: m.foto } : undefined} href={`/m/caronas/${c.id}`} />;
          })}
        </div>
        {!lista.length && (
          <div className="mt-4">
            <Vazio icone={Users} titulo="Ainda não há caronas com esse filtro" acao={<BotaoLink href="/m/caronas/oferecer" icone={Plus}>Oferecer carona</BotaoLink>}>
              Seja o primeiro: ofereça as vagas da sua próxima viagem. É grátis.
            </Vazio>
          </div>
        )}
      </main>
    </div>
  );
}
