import { ArrowDown, Car, MessageCircle, Route as IconeRota, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { BotaoCancelarReserva, DecidirReserva, FormReservar } from "@/components/caronas/formularios";
import { BotaoCancelarCarona } from "@/components/caronas/cancelar";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { Aviso, Avatar, BotaoLink, Cartao, DadoRotulado, Selo } from "@/components/ui";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { linkWhatsApp, pessoas, quando, REGRAS_CARONA, type RegraCarona, vagasLivres } from "@/lib/caronas";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Carona" };

export default async function Carona({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ publicada?: string }> }) {
  const { id } = await params;
  const usuario = await exigirUsuario(`/m/caronas/${id}`);
  const admin = supabaseAdmin();
  const { data: c } = await admin.from("caronas").select("*").eq("id", id).maybeSingle();
  if (!c || (c.status !== "aberta" && c.motorista_id !== usuario.id)) {
    const { data: minha } = c ? await admin.from("reservas_carona").select("id").eq("carona_id", id).eq("passageiro_id", usuario.id).maybeSingle() : { data: null };
    if (!c || !minha) notFound();
  }
  const sou = c.motorista_id === usuario.id;
  const { data: reservas } = await admin.from("reservas_carona").select("*").eq("carona_id", id).order("criado_em");
  const minha = reservas?.find((r) => r.passageiro_id === usuario.id);
  const [livres, gente] = await Promise.all([vagasLivres([id]), pessoas([c.motorista_id, ...(reservas ?? []).map((r) => r.passageiro_id)])]);
  const vagas = livres.get(id) ?? 0;
  const motorista = gente.get(c.motorista_id)!;
  const regras = Object.entries((c.regras ?? {}) as Record<string, boolean>).filter(([, v]) => v).map(([k]) => REGRAS_CARONA[k as RegraCarona]).filter(Boolean);
  const rota = `${c.origem_cidade} → ${c.destino_cidade}`;
  const passou = new Date(c.partida).getTime() < Date.now();

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo="Carona" voltar="/m/caronas" />
      {(await searchParams).publicada && <Aviso tom="ok" titulo="Carona publicada!">Você recebe um aviso a cada pedido. Compartilhe no grupo da sua cidade para encher o carro mais rápido.</Aviso>}

      <section className="fundo-marca rounded-[1.4rem] p-5 text-white shadow-flutuante">
        <p className="text-sm font-semibold text-white/80 capitalize">{quando(c.partida)}</p>
        <div className="mt-2">
          <p className="text-xl font-bold">{c.origem_cidade} <span className="text-base font-normal text-white/70">{c.origem_uf}</span></p>
          {c.origem_ponto && <p className="text-sm text-white/75">{c.origem_ponto}</p>}
          <ArrowDown size={18} className="my-1 text-white/70" />
          <p className="text-xl font-bold">{c.destino_cidade} <span className="text-base font-normal text-white/70">{c.destino_uf}</span></p>
          {c.destino_ponto && <p className="text-sm text-white/75">{c.destino_ponto}</p>}
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div><p className="text-xs text-white/75">Contribuição por pessoa</p><p className="text-2xl font-extrabold tabular-nums">{formatarBRL(c.contribuicao_centavos)}</p></div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">{vagas > 0 ? `${vagas} ${vagas === 1 ? "vaga" : "vagas"}` : "Lotada"}</span>
        </div>
      </section>

      <Cartao>
        <div className="flex items-center gap-3">
          <Avatar nome={motorista.nome} foto={motorista.foto} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{motorista.nome}</p>
            <p className="text-xs text-suave">{motorista.telefoneConfirmado ? "Celular confirmado" : "Celular não confirmado"}</p>
          </div>
          {sou && <Selo tom="marca">Você</Selo>}
        </div>
        <dl className="mt-3 divide-y divide-borda">
          <DadoRotulado rotulo="Distância"><span className="inline-flex items-center gap-1"><IconeRota size={14} /> {c.km} km</span></DadoRotulado>
          {c.carro && <DadoRotulado rotulo="Carro"><span className="inline-flex items-center gap-1"><Car size={14} /> {c.carro}</span></DadoRotulado>}
          <DadoRotulado rotulo="Teto da contribuição (custo ÷ pessoas)">{formatarBRL(c.contribuicao_maxima_centavos)}</DadoRotulado>
        </dl>
        {!!regras.length && <div className="mt-3 flex flex-wrap gap-1.5">{regras.map((r) => <Selo key={r}>{r}</Selo>)}</div>}
        {c.observacoes && <p className="mt-3 rounded-xl bg-cartao-2 p-3 text-sm">{c.observacoes}</p>}
      </Cartao>

      {sou ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold tracking-tight">Pedidos</h2>
          {reservas?.length ? (
            reservas.map((r) => {
              const p = gente.get(r.passageiro_id)!;
              return (
                <Cartao key={r.id} className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar nome={p.nome} foto={p.foto} tamanho="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.nome}</p>
                      <p className="text-xs text-suave">{r.lugares} {r.lugares === 1 ? "lugar" : "lugares"}</p>
                    </div>
                    <Selo tom={r.status === "aceita" ? "ok" : r.status === "pendente" ? "alerta" : "neutro"}>{r.status === "aceita" ? "Confirmada" : r.status === "pendente" ? "Novo" : r.status === "recusada" ? "Recusada" : "Cancelada"}</Selo>
                  </div>
                  {r.mensagem && <p className="rounded-xl bg-cartao-2 p-3 text-sm">“{r.mensagem}”</p>}
                  {r.status === "pendente" && c.status === "aberta" && <DecidirReserva reservaId={r.id} />}
                  {r.status === "aceita" && p.telefone && <BotaoLink href={linkWhatsApp(p.telefone, `Oi, ${p.nome}! Sobre a carona ${rota} (${quando(c.partida)}): vamos combinar o encontro?`)} variante="secundario" icone={MessageCircle} target="_blank">Chamar no WhatsApp</BotaoLink>}
                </Cartao>
              );
            })
          ) : (
            <p className="text-sm text-suave">Nenhum pedido ainda. Você recebe um aviso quando chegar.</p>
          )}
          {c.status === "aberta" && <BotaoCancelarCarona caronaId={c.id} />}
        </section>
      ) : minha && minha.status !== "cancelada" ? (
        <Cartao className="flex flex-col gap-3">
          <div className="flex items-center justify-between"><h2 className="font-bold">Seu pedido</h2><Selo tom={minha.status === "aceita" ? "ok" : minha.status === "pendente" ? "alerta" : "perigo"}>{minha.status === "aceita" ? "Confirmado" : minha.status === "pendente" ? "Aguardando o motorista" : "Não confirmado"}</Selo></div>
          {minha.status === "aceita" && motorista.telefone && <BotaoLink href={linkWhatsApp(motorista.telefone, `Oi, ${motorista.nome}! Sou da carona ${rota} (${quando(c.partida)}) pelo Aluguei. Onde nos encontramos?`)} icone={MessageCircle} tamanho="lg" target="_blank">Combinar pelo WhatsApp</BotaoLink>}
          {minha.status !== "recusada" && !passou && <BotaoCancelarReserva caronaId={c.id} />}
        </Cartao>
      ) : c.status === "aberta" && !passou && vagas > 0 ? (
        <Cartao className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 font-bold"><Users size={18} /> Quero ir junto</h2>
          <FormReservar caronaId={c.id} livres={vagas} />
          <p className="text-xs text-suave">O motorista confirma pelo app. Depois disso, o WhatsApp de um aparece para o outro.</p>
        </Cartao>
      ) : (
        <Aviso tom="neutro">{passou ? "Esta carona já saiu." : "Não há mais vagas."}</Aviso>
      )}
    </div>
  );
}
