import { Calendar, Car, Gauge, MapPin, MessageCircle, ShieldCheck, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CabecalhoPublico } from "@/components/site/cabecalho-publico";
import { BotaoLink, Cartao, DadoRotulado } from "@/components/ui";
import { placaParcial } from "@/dominio/marketplace/cidade";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { anuncioPublico } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const a = await anuncioPublico((await params).id);
  if (!a) return { title: "Carro" };
  const titulo = `${a.veiculo.modelo} para alugar em ${a.cidade}`;
  const descricao = `${formatarBRL(a.aluguelSemanal)} por semana · caução ${formatarBRL(a.caucao)} · ${a.locador.nome}. Converse com o locador pelo Aluguei.`;
  // Na prévia do WhatsApp aparece a primeira foto do carro; sem foto, a imagem padrão do site.
  return {
    title: titulo,
    description: descricao,
    openGraph: { title: titulo, description: descricao, ...(a.fotos[0] ? { images: [{ url: a.fotos[0], alt: a.veiculo.modelo }] } : {}) },
    twitter: { card: "summary_large_image", title: titulo, description: descricao },
  };
}

export default async function Anuncio({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ de?: string }> }) {
  const { id } = await params;
  const doApp = (await searchParams).de === "app";
  const a = await anuncioPublico(id);
  if (!a) notFound();

  return (
    <div className="tema-claro min-h-dvh bg-fundo">
      <CabecalhoPublico voltar={doApp ? { href: "/m/buscar", rotulo: "Buscar carros" } : { href: "/carros", rotulo: "Carros" }} />
      <main className="mx-auto max-w-5xl px-5 pt-5 pb-28 lg:grid lg:grid-cols-[1.3fr_1fr] lg:gap-8 lg:pb-16">
        <div>
          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-[1.1rem]">
            {a.fotos.length ? (
              a.fotos.map((f, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={f} src={f} alt={`${a.veiculo.modelo}, foto ${i + 1}`} className="aspect-[16/10] w-full shrink-0 snap-center rounded-[1.1rem] object-cover" />
              ))
            ) : (
              <div className="grid aspect-[16/10] w-full place-items-center rounded-[1.1rem] bg-gradient-to-br from-marca-suave to-cartao-2"><Car size={80} strokeWidth={1.2} className="text-marca/30" /></div>
            )}
          </div>
          {a.fotos.length > 1 && <p className="mt-1.5 text-center text-xs text-suave">Deslize para ver as {a.fotos.length} fotos</p>}

          <h1 className="mt-5 text-[1.6rem] leading-tight font-extrabold tracking-tight">{a.veiculo.modelo}</h1>
          <p className="text-sm text-suave">{[a.veiculo.anoFabricacao && a.veiculo.anoModelo ? `${a.veiculo.anoFabricacao}/${a.veiculo.anoModelo}` : a.veiculo.anoModelo, a.veiculo.cor, placaParcial(a.veiculo.placa)].filter(Boolean).join(" · ")}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm"><MapPin size={15} className="text-marca" /> {a.cidade}/{a.uf} · {a.locador.nome}</p>

          {a.descricao && <p className="mt-5 text-[0.95rem] leading-relaxed whitespace-pre-line">{a.descricao}</p>}
        </div>

        <aside className="mt-6 flex flex-col gap-4 lg:mt-0">
          <Cartao>
            <p className="text-xs font-semibold text-suave">Aluguel</p>
            <p className="text-3xl font-extrabold tracking-tight">{formatarBRL(a.aluguelSemanal)}<span className="text-sm font-semibold text-suave">/semana</span></p>
            <dl className="mt-3 divide-y divide-borda">
              <DadoRotulado rotulo="Caução">{formatarBRL(a.caucao)}</DadoRotulado>
              <DadoRotulado rotulo="Franquia">{a.franquiaKmMensal.toLocaleString("pt-BR")} km/mês</DadoRotulado>
              <DadoRotulado rotulo="Prazo mínimo">{a.prazoMinimoMeses} {a.prazoMinimoMeses === 1 ? "mês" : "meses"}</DadoRotulado>
              <DadoRotulado rotulo="Km atual">{a.veiculo.odometro.toLocaleString("pt-BR")} km</DadoRotulado>
            </dl>
            <div className="mt-5 hidden lg:block">
              <BotaoLink href={`/carros/${a.id}/interesse`} tamanho="lg" className="w-full"><MessageCircle size={18} /> Tenho interesse</BotaoLink>
            </div>
          </Cartao>
          <Cartao className="flex flex-col gap-3 text-sm">
            {[
              { icone: MessageCircle, t: "Converse com o locador pelo app, sem expor seu número." },
              { icone: ShieldCheck, t: "Contrato digital e vistoria com fotos na retirada." },
              { icone: Wallet, t: "Aluguel pago no Pix, com extrato de tudo." },
              { icone: Calendar, t: "Valores combinados viram contrato só quando você assina." },
            ].map(({ icone: Icone, t }) => (
              <p key={t} className="flex gap-2.5"><Icone size={17} className="mt-0.5 shrink-0 text-marca" /> {t}</p>
            ))}
          </Cartao>
          <p className="flex items-center gap-1.5 text-xs text-suave"><Gauge size={13} /> Anúncio de {a.locador.nome}, {a.locador.cidade}/{a.locador.uf}</p>
        </aside>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-cartao/95 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <BotaoLink href={`/carros/${a.id}/interesse`} tamanho="lg" className="w-full"><MessageCircle size={18} /> Tenho interesse</BotaoLink>
      </div>
    </div>
  );
}
