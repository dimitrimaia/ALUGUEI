import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { BotaoLink, CabecalhoPagina, Selo, Vazio } from "@/components/ui";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/servidor";

const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export default async function Conversas() {
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const { data: conversas } = await supabase.from("conversas").select("*").eq("organizacao_id", organizacao.id).order("ultima_mensagem_em", { ascending: false });
  const lista = conversas ?? [];
  const { data: anuncios } = lista.length ? await supabase.from("anuncios").select("id, veiculo_id").in("id", lista.map((c) => c.anuncio_id)) : { data: [] };
  const { data: veiculos } = anuncios?.length ? await supabase.from("veiculos").select("id, modelo").in("id", anuncios.map((a) => a.veiculo_id)) : { data: [] };
  const carro = (id: string) => veiculos?.find((v) => v.id === anuncios?.find((a) => a.id === id)?.veiculo_id)?.modelo ?? "Carro";

  return (
    <>
      <CabecalhoPagina titulo="Conversas" subtitulo="Motoristas que se interessaram pelos seus anúncios." />
      {!lista.length ? (
        <Vazio icone={MessageCircle} titulo="Nenhuma conversa ainda" acao={<BotaoLink href="/painel/anuncios">Anunciar um carro</BotaoLink>}>
          Quando um motorista tocar em “Tenho interesse” num anúncio, a conversa aparece aqui.
        </Vazio>
      ) : (
        <div className="divide-y divide-borda overflow-hidden rounded-[1.1rem] border border-borda bg-cartao shadow-cartao">
          {lista.map((c) => {
            const naoLida = !c.lida_locador_em || c.lida_locador_em < c.ultima_mensagem_em;
            return (
              <Link key={c.id} href={`/painel/conversas/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-cartao-2">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-suave text-sm font-bold text-marca">{c.nome_motorista.trim()[0]?.toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${naoLida ? "font-extrabold" : "font-semibold"}`}>{c.nome_motorista}</span>
                  <span className="block truncate text-xs text-suave">{carro(c.anuncio_id)}</span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className="text-[0.7rem] text-suave">{quando(c.ultima_mensagem_em)}</span>
                  {c.locatario_id ? <Selo tom="ok">Convidado</Selo> : naoLida ? <span className="size-2.5 rounded-full bg-marca" aria-label="Mensagem nova" /> : null}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
