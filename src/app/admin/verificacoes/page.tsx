import { BadgeCheck, FileText, X } from "lucide-react";
import { Botao, CabecalhoPagina, Cartao, DadoRotulado, Placa, Vazio, classeEntrada } from "@/components/ui";
import { exigirEquipeAluguei } from "@/lib/equipe-aluguei";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { decidirVerificacao } from "./acoes";

export const metadata = { title: "Verificação de carros", robots: { index: false } };

/**
 * Fila da equipe do Aluguei: CRLVs enviados pelos locadores. Conferir no
 * documento: placa, RENAVAM, modelo/ano/cor e se o titular é o locador (ou se
 * ele tem autorização). Na dúvida, consultar a placa no app Carteira Digital de Trânsito.
 */
export default async function Verificacoes() {
  await exigirEquipeAluguei();
  const admin = supabaseAdmin();
  const { data: fila } = await admin.from("veiculos").select("*").eq("verificacao", "em_analise").order("criado_em");
  const lista = fila ?? [];
  const [{ data: orgs }, { data: docs }] = lista.length
    ? await Promise.all([
        admin.from("organizacoes").select("id, nome, documento").in("id", lista.map((v) => v.organizacao_id)),
        admin.from("evidencias").select("id, caminho_storage, mime").in("id", lista.map((v) => v.crlv_evidencia_id).filter((x): x is string => Boolean(x))),
      ])
    : [{ data: [] }, { data: [] }];
  const links = await Promise.all(
    (docs ?? []).map(async (d) => ({ id: d.id, url: (await admin.storage.from("evidencias").createSignedUrl(d.caminho_storage, 1800)).data?.signedUrl ?? null })),
  );

  return (
    <main className="mx-auto max-w-4xl">
      <CabecalhoPagina titulo="Verificação de carros" subtitulo={`${lista.length} na fila`} />
      <div className="mb-4 rounded-[1.1rem] border border-borda bg-cartao p-4 text-sm shadow-cartao">
        <p className="font-semibold">Como conferir (grátis e oficial)</p>
        <ol className="mt-1 list-decimal pl-5 text-suave">
          <li>Abra o CRLV. No <strong className="text-texto">CRLV digital (PDF)</strong>, aponte o app <strong className="text-texto">Vio</strong> (do governo) para o QR Code: ele mostra os dados direto do Detran.</li>
          <li>Placa, RENAVAM, modelo, ano e cor do QR Code têm que bater com o cadastro.</li>
          <li>O <strong className="text-texto">proprietário</strong> tem que ser o locador (mesmo CPF/CNPJ) ou alguém que ele comprove que autoriza.</li>
          <li>Foto de CRLV impresso ou sem QR Code: peça o PDF digital antes de aprovar.</li>
        </ol>
      </div>
      {!lista.length && <Vazio icone={BadgeCheck} titulo="Fila vazia">Nenhum CRLV esperando conferência.</Vazio>}
      <div className="flex flex-col gap-4">
        {lista.map((v) => {
          const org = orgs?.find((o) => o.id === v.organizacao_id);
          const link = links.find((l) => l.id === v.crlv_evidencia_id)?.url;
          return (
            <Cartao key={v.id} className="grid gap-4 md:grid-cols-[1fr_16rem]">
              <div>
                <div className="mb-2 flex items-center gap-3"><Placa placa={v.placa} /><span className="font-semibold">{v.modelo}</span></div>
                <dl className="divide-y divide-borda">
                  <DadoRotulado rotulo="Ano / cor">{[v.ano_fabricacao && v.ano_modelo ? `${v.ano_fabricacao}/${v.ano_modelo}` : v.ano_modelo, v.cor].filter(Boolean).join(" · ") || "—"}</DadoRotulado>
                  <DadoRotulado rotulo="RENAVAM">{v.renavam ?? "—"}</DadoRotulado>
                  <DadoRotulado rotulo="Locador">{org?.nome} · {org?.documento}</DadoRotulado>
                </dl>
                {link && <a href={link} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-marca"><FileText size={16} /> Abrir o CRLV</a>}
              </div>
              <div className="flex flex-col gap-2">
                <form action={decidirVerificacao.bind(null, v.id, true)}>
                  <Botao icone={BadgeCheck} className="w-full">Aprovar</Botao>
                </form>
                <form action={decidirVerificacao.bind(null, v.id, false)} className="flex flex-col gap-2">
                  <input name="motivo" placeholder="Motivo da recusa" className={classeEntrada} required />
                  <Botao variante="perigo" icone={X} className="w-full">Recusar</Botao>
                </form>
              </div>
            </Cartao>
          );
        })}
      </div>
    </main>
  );
}
