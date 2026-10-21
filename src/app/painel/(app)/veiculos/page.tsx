import { Car, Gauge, Plus } from "lucide-react";
import Link from "next/link";
import { BotaoLink, CabecalhoPagina, Placa, Selo, Vazio } from "@/components/ui";
import { exigirEquipe } from "@/lib/sessao";
import { STATUS_VEICULO } from "@/lib/rotulos";
import { supabaseServidor } from "@/lib/supabase/servidor";

const km = new Intl.NumberFormat("pt-BR");

export default async function Veiculos() {
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const { data: veiculos } = await supabase
    .from("veiculos")
    .select("id, placa, modelo, ano_modelo, cor, odometro_atual, status")
    .eq("organizacao_id", organizacao.id)
    .order("criado_em", { ascending: false });

  const contagem = (s: string) => (veiculos ?? []).filter((v) => v.status === s).length;

  return (
    <>
      <CabecalhoPagina
        titulo="Veículos"
        subtitulo={veiculos?.length ? `${veiculos.length} na frota · ${contagem("alugado")} alugado(s) · ${contagem("disponivel")} disponível(is)` : "Sua frota em um só lugar"}
        acao={<BotaoLink href="/painel/veiculos/novo" icone={Plus}>Novo veículo</BotaoLink>}
      />
      {/* O outro lado de "Meus carros": os carros que eu alugo de outros locadores. */}
      <div className="mb-4 grid max-w-md grid-cols-2 gap-1 rounded-xl bg-cartao-2 p-1 ring-1 ring-borda" role="tablist">
        <span role="tab" aria-selected className="rounded-lg bg-cartao py-2 text-center text-sm font-semibold shadow-cartao">Minha frota</span>
        <Link href="/m/carros" role="tab" aria-selected={false} className="rounded-lg py-2 text-center text-sm font-semibold text-suave">Que eu aluguei</Link>
      </div>
      {!veiculos?.length ? (
        <Vazio icone={Car} titulo="Nenhum veículo ainda" acao={<BotaoLink href="/painel/veiculos/novo" icone={Plus}>Cadastrar veículo</BotaoLink>}>
          Cadastre o carro com placa e km atual. Depois anuncie na busca ou cadastre o motorista.
        </Vazio>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {veiculos.map((v) => {
            const s = STATUS_VEICULO[v.status];
            return (
              <Link
                key={v.id}
                href={`/painel/veiculos/${v.id}`}
                className="group overflow-hidden rounded-[1.25rem] border border-borda bg-cartao shadow-cartao transition-all hover:-translate-y-0.5 hover:shadow-flutuante"
              >
                <div className="relative flex h-28 items-end justify-between bg-gradient-to-br from-marca-suave to-cartao-2 px-5 pb-4">
                  <Car className="absolute top-4 right-5 text-marca/25 transition-transform group-hover:translate-x-1" size={64} strokeWidth={1.4} aria-hidden />
                  <Placa placa={v.placa} />
                  <Selo tom={s.tom}>{s.rotulo}</Selo>
                </div>
                <div className="px-5 py-4">
                  <p className="truncate font-bold">{v.modelo}</p>
                  <p className="mt-0.5 text-sm text-suave">{[v.ano_modelo, v.cor].filter(Boolean).join(" · ") || "—"}</p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold"><Gauge size={16} className="text-marca" aria-hidden /> {km.format(v.odometro_atual)} km</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
