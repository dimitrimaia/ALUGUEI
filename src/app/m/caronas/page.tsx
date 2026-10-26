import { Plus, Search, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { CartaoCarona } from "@/components/caronas/cartao";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { BotaoLink, classeEntrada, Selo, Vazio } from "@/components/ui";
import { buscarCaronas, pessoas, vagasLivres } from "@/lib/caronas";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Caronas" };

const STATUS_RESERVA = { pendente: ["Aguardando", "alerta"], aceita: ["Confirmada", "ok"], recusada: ["Não confirmada", "perigo"], cancelada: ["Cancelada", "neutro"] } as const;

export default async function Caronas({ searchParams }: { searchParams: Promise<{ aba?: string; de?: string; para?: string; dia?: string }> }) {
  const usuario = await exigirUsuario("/m/caronas");
  const f = await searchParams;
  const minhas = f.aba === "minhas";
  const admin = supabaseAdmin();

  if (minhas) {
    const [{ data: oferecidas }, { data: reservas }] = await Promise.all([
      admin.from("caronas").select("*").eq("motorista_id", usuario.id).order("partida", { ascending: false }).limit(50),
      admin.from("reservas_carona").select("*, caronas!inner(*)").eq("passageiro_id", usuario.id).order("criado_em", { ascending: false }).limit(50),
    ]);
    const ids = [...(oferecidas ?? []).map((c) => c.id), ...(reservas ?? []).map((r) => r.carona_id)];
    const [livres, { data: pendentes }] = await Promise.all([vagasLivres(ids), admin.from("reservas_carona").select("carona_id").in("carona_id", (oferecidas ?? []).map((c) => c.id)).eq("status", "pendente")]);
    return (
      <div className="flex flex-col gap-4">
        <Cabecalho minhas />
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold tracking-tight">Que eu ofereço</h2>
          {oferecidas?.length ? (
            oferecidas.map((c) => (
              <div key={c.id} className="relative">
                <CartaoCarona c={c} livres={livres.get(c.id) ?? 0} href={`/m/caronas/${c.id}`} />
                {(pendentes ?? []).some((p) => p.carona_id === c.id) && <span className="absolute top-3 right-3"><Selo tom="alerta">Pedido novo</Selo></span>}
                {c.status !== "aberta" && <span className="absolute top-3 right-3"><Selo>{c.status === "cancelada" ? "Cancelada" : "Concluída"}</Selo></span>}
              </div>
            ))
          ) : (
            <Vazio icone={Users} titulo="Nenhuma carona oferecida">Vai viajar? Ofereça as vagas e divida o custo da estrada.</Vazio>
          )}
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold tracking-tight">Que eu pedi</h2>
          {reservas?.length ? (
            reservas.map((r) => {
              const [rotulo, tom] = STATUS_RESERVA[r.status as keyof typeof STATUS_RESERVA] ?? ["", "neutro"];
              return (
                <div key={r.id} className="relative">
                  <CartaoCarona c={r.caronas as never} livres={livres.get(r.carona_id) ?? 0} href={`/m/caronas/${r.carona_id}`} />
                  <span className="absolute top-3 right-3"><Selo tom={tom}>{rotulo}</Selo></span>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-suave">Você ainda não pediu carona.</p>
          )}
        </section>
      </div>
    );
  }

  const lista = await buscarCaronas({ de: f.de, para: f.para, dia: f.dia });
  const [livres, gente] = await Promise.all([vagasLivres(lista.map((c) => c.id)), pessoas(lista.map((c) => c.motorista_id))]);
  return (
    <div className="flex flex-col gap-4">
      <Cabecalho minhas={false} />
      <form className="flex flex-col gap-2 rounded-[1.1rem] border border-borda bg-cartao p-3 shadow-cartao">
        <div className="grid grid-cols-2 gap-2">
          <input name="de" defaultValue={f.de} placeholder="Saindo de" aria-label="Saindo de" className={classeEntrada} />
          <input name="para" defaultValue={f.para} placeholder="Indo para" aria-label="Indo para" className={classeEntrada} />
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input name="dia" type="date" defaultValue={f.dia} aria-label="Dia" className={classeEntrada} />
          <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-marca px-4 text-sm font-semibold text-white"><Search size={16} /> Buscar</button>
        </div>
      </form>
      {lista.length ? (
        <div className="flex flex-col gap-2">
          {lista.map((c) => <CartaoCarona key={c.id} c={c} livres={livres.get(c.id) ?? 0} motorista={gente.get(c.motorista_id)} href={`/m/caronas/${c.id}`} />)}
        </div>
      ) : (
        <Vazio icone={Users} titulo={f.de || f.para || f.dia ? "Nenhuma carona com esse filtro" : "Ainda não há caronas por aqui"} acao={<BotaoLink href="/m/caronas/oferecer" icone={Plus}>Oferecer a primeira</BotaoLink>}>
          Vai pegar estrada? Ofereça as vagas do seu carro e divida combustível e pedágio. Quanto mais gente oferece, mais caronas aparecem.
        </Vazio>
      )}
      <p className="text-center text-xs text-suave">Carona é para dividir custo, sem lucro. Combine tudo pelo WhatsApp depois da confirmação e confira os dados de quem vai junto.</p>
    </div>
  );
}

function Cabecalho({ minhas }: { minhas: boolean }) {
  return (
    <>
      <CabecalhoMotorista titulo="Caronas" voltar="/m/plantao" />
      <div className="flex items-center gap-2">
        <nav className="grid flex-1 grid-cols-2 gap-1 rounded-2xl bg-cartao-2 p-1" aria-label="Caronas">
          {[
            ["Buscar", "/m/caronas", !minhas],
            ["Minhas", "/m/caronas?aba=minhas", minhas],
          ].map(([rotulo, href, atual]) => (
            <Link key={String(rotulo)} href={href as Route} aria-current={atual ? "page" : undefined} className={`grid h-10 place-items-center rounded-xl text-sm font-semibold ${atual ? "bg-cartao shadow-cartao" : "text-suave"}`}>{rotulo}</Link>
          ))}
        </nav>
        <BotaoLink href="/m/caronas/oferecer" icone={Plus} className="h-12 rounded-2xl">Oferecer</BotaoLink>
      </div>
    </>
  );
}

