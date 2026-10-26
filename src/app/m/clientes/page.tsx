import { CalendarClock, MessageCircle } from "lucide-react";
import { AcoesAgendamento } from "@/components/clientes/agendamento";
import { EditorClientes } from "@/components/clientes/editor";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { BotaoLink, Cartao, Selo, Vazio } from "@/components/ui";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { paraSlug, TABELA_PADRAO, type TabelaParticular } from "@/dominio/ganhos/particular";
import { linkWhatsApp, pessoas, quando } from "@/lib/caronas";
import { exigirUsuario } from "@/lib/sessao";
import { urlDoSite } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Meus clientes" };

const STATUS = { novo: ["Novo", "alerta"], confirmado: ["Confirmado", "ok"], concluido: ["Concluído", "neutro"], cancelado: ["Cancelado", "neutro"] } as const;

/** Clientes particulares: a página do motorista com preço na hora e os pedidos que chegaram por ela. */
export default async function Clientes() {
  const usuario = await exigirUsuario("/m/clientes");
  const admin = supabaseAdmin();
  const [{ data: perfil }, { data: pedidos }, gente, site] = await Promise.all([
    admin.from("perfis_particular").select("*").eq("usuario_id", usuario.id).maybeSingle(),
    admin.from("agendamentos_particulares").select("*").eq("motorista_id", usuario.id).order("quando", { ascending: false }).limit(50),
    pessoas([usuario.id]),
    urlDoSite(),
  ]);
  const eu = gente.get(usuario.id);
  const inicial = perfil
    ? { slug: perfil.slug, nome: perfil.nome, cidade: perfil.cidade, whatsapp: perfil.whatsapp.replace(/^55/, ""), apresentacao: perfil.apresentacao ?? "", tabelas: perfil.tabelas as TabelaParticular[], ativo: perfil.ativo }
    : { slug: paraSlug(eu?.nome ?? ""), nome: eu?.nome ?? "", cidade: "", whatsapp: eu?.telefone?.replace(/^\+?55/, "") ?? "", apresentacao: "", tabelas: [TABELA_PADRAO], ativo: true };

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo="Meus clientes" voltar="/m/plantao" />
      {!perfil && (
        <div className="rounded-[1.1rem] border border-marca/30 bg-marca-suave p-4 text-sm">
          <p className="font-semibold">Corridas particulares, sem taxa de app</p>
          <p className="mt-1 text-suave">Crie sua página com preço na hora. O cliente digita de onde e para onde vai, vê o valor e agenda pelo seu WhatsApp. Ótimo para aeroporto, viagens e clientes fixos.</p>
        </div>
      )}
      <EditorClientes inicial={inicial} salvo={Boolean(perfil)} site={site} />

      {perfil && (
        <section className="flex flex-col gap-2">
          <h2 className="mt-2 text-base font-bold tracking-tight">Pedidos</h2>
          {pedidos?.length ? (
            pedidos.map((a) => {
              const [rotulo, tom] = STATUS[a.status as keyof typeof STATUS] ?? ["", "neutro"];
              return (
                <Cartao key={a.id} className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-marca capitalize"><CalendarClock size={13} /> {quando(a.quando)}</p>
                      <p className="mt-1 truncate font-semibold">{a.nome}</p>
                      <p className="text-sm text-suave [overflow-wrap:anywhere]">{a.origem} → {a.destino}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Selo tom={tom}>{rotulo}</Selo>
                      {a.valor_estimado_centavos > 0 && <p className="mt-1 font-bold tabular-nums">{formatarBRL(a.valor_estimado_centavos)}</p>}
                      <p className="text-xs text-suave">{a.categoria}</p>
                    </div>
                  </div>
                  <BotaoLink href={linkWhatsApp(a.whatsapp, `Oi, ${a.nome}! Recebi seu pedido de corrida para ${quando(a.quando)}.`)} variante="secundario" tamanho="sm" icone={MessageCircle} target="_blank">WhatsApp do cliente</BotaoLink>
                  <AcoesAgendamento id={a.id} status={a.status} />
                </Cartao>
              );
            })
          ) : (
            <Vazio icone={CalendarClock} titulo="Nenhum pedido ainda">Compartilhe o seu link: cada pedido aparece aqui e chega no seu WhatsApp.</Vazio>
          )}
        </section>
      )}
    </div>
  );
}
