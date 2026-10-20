import { Car, ExternalLink, Megaphone, PauseCircle, PlayCircle } from "lucide-react";
import Link from "next/link";
import { BotaoAcao } from "@/components/painel/botao-acao";
import { BotaoLink, CabecalhoPagina, Placa, Selo, Vazio } from "@/components/ui";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { urlFoto } from "@/lib/marketplace";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { alternarAnuncio } from "./acoes";

/** Carros anunciados na busca pública. */
export default async function Anuncios() {
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const [{ data: veiculos }, { data: anuncios }] = await Promise.all([
    supabase.from("veiculos").select("id, placa, modelo, ano_modelo, status").eq("organizacao_id", organizacao.id).neq("status", "vendido").order("modelo"),
    supabase.from("anuncios").select("*").eq("organizacao_id", organizacao.id),
  ]);

  return (
    <>
      <CabecalhoPagina titulo="Anúncios" subtitulo="Carros que aparecem na busca de motoristas em aluguei.xyz/carros." acao={<BotaoLink href="/carros" variante="secundario" icone={ExternalLink} target="_blank">Ver a busca</BotaoLink>} />
      {!veiculos?.length ? (
        <Vazio icone={Car} titulo="Cadastre um carro primeiro" acao={<BotaoLink href="/painel/veiculos/novo">Cadastrar veículo</BotaoLink>}>Depois é só anunciar.</Vazio>
      ) : (
        <div className="divide-y divide-borda overflow-hidden rounded-[1.1rem] border border-borda bg-cartao shadow-cartao">
          {veiculos.map((v) => {
            const a = anuncios?.find((x) => x.veiculo_id === v.id);
            const foto = (a?.fotos as string[] | undefined)?.[0];
            return (
              <div key={v.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-cartao-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {foto ? <img src={urlFoto(foto)} alt="" className="size-full object-cover" /> : <Car size={22} className="text-suave" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{v.modelo}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Placa placa={v.placa} tamanho="sm" />
                    {a ? <span className="text-xs text-suave">{formatarBRL(a.aluguel_semanal_centavos)}/sem · {a.cidade}/{a.uf}</span> : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {v.status !== "disponivel" ? (
                    <Selo tom="neutro">{v.status === "alugado" ? "Alugado" : "Indisponível"}</Selo>
                  ) : a ? (
                    <>
                      <Selo tom={a.status === "ativo" ? "ok" : "neutro"}>{a.status === "ativo" ? "No ar" : "Pausado"}</Selo>
                      <BotaoAcao acao={alternarAnuncio.bind(null, v.id, a.status !== "ativo")} rotulo={a.status === "ativo" ? "Pausar" : "Reativar"} icone={a.status === "ativo" ? <PauseCircle size={16} /> : <PlayCircle size={16} />} />
                      <Link href={`/painel/anuncios/${v.id}`} className="text-sm font-semibold text-marca">Editar</Link>
                    </>
                  ) : (
                    <BotaoLink href={`/painel/anuncios/${v.id}`} tamanho="sm" icone={Megaphone}>Anunciar</BotaoLink>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
