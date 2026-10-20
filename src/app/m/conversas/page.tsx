import { MessageCircle, Search } from "lucide-react";
import Link from "next/link";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { BotaoLink, Vazio } from "@/components/ui";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

const quando = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });

export default async function ConversasMotorista() {
  const usuario = await exigirUsuario("/m/conversas");
  const admin = supabaseAdmin();
  const { data: conversas } = await admin.from("conversas").select("*").eq("usuario_id", usuario.id).order("ultima_mensagem_em", { ascending: false });
  const lista = conversas ?? [];
  const [{ data: anuncios }, { data: orgs }] = lista.length
    ? await Promise.all([
        admin.from("anuncios").select("id, veiculo_id").in("id", lista.map((c) => c.anuncio_id)),
        admin.from("organizacoes").select("id, nome").in("id", lista.map((c) => c.organizacao_id)),
      ])
    : [{ data: [] }, { data: [] }];
  const { data: veiculos } = anuncios?.length ? await admin.from("veiculos").select("id, modelo").in("id", anuncios.map((a) => a.veiculo_id)) : { data: [] };
  const carro = (anuncioId: string) => veiculos?.find((v) => v.id === anuncios?.find((a) => a.id === anuncioId)?.veiculo_id)?.modelo ?? "Carro";

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo="Conversas" />
      {!lista.length ? (
        <Vazio icone={MessageCircle} titulo="Nenhuma conversa ainda" acao={<BotaoLink href="/carros" icone={Search}>Buscar carros</BotaoLink>}>
          Encontre um carro na sua cidade e fale com o locador por aqui.
        </Vazio>
      ) : (
        <div className="divide-y divide-borda overflow-hidden rounded-[1.1rem] border border-borda bg-cartao shadow-cartao">
          {lista.map((c) => {
            const naoLida = !c.lida_motorista_em || c.lida_motorista_em < c.ultima_mensagem_em;
            return (
              <Link key={c.id} href={`/m/conversas/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-cartao-2">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-suave text-marca"><MessageCircle size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${naoLida ? "font-extrabold" : "font-semibold"}`}>{carro(c.anuncio_id)}</span>
                  <span className="block truncate text-xs text-suave">{orgs?.find((o) => o.id === c.organizacao_id)?.nome}</span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className="text-[0.7rem] text-suave">{quando(c.ultima_mensagem_em)}</span>
                  {naoLida && <span className="size-2.5 rounded-full bg-marca" aria-label="Mensagem nova" />}
                </span>
              </Link>
            );
          })}
        </div>
      )}
      <BotaoLink href="/carros" variante="secundario" icone={Search}>Buscar mais carros</BotaoLink>
    </div>
  );
}
