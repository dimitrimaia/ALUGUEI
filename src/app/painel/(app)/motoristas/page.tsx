import Link from "next/link";
import { BotaoLink, Cartao, Selo, Suave, Titulo, Vazio } from "@/components/ui";
import type { Linha } from "@/db/tipos";
import { exigirEquipe } from "@/lib/sessao";
import { STATUS_LOCATARIO } from "@/lib/rotulos";
import { supabaseServidor } from "@/lib/supabase/servidor";

const ORDEM: Linha<"locatarios">["status"][] = ["em_analise", "convidado", "em_cadastro", "aprovado", "recusado"];

export default async function Motoristas() {
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const { data } = await supabase
    .from("locatarios")
    .select("id, nome, telefone, status, pendencias_pre_analise, criado_em")
    .eq("organizacao_id", organizacao.id)
    .order("criado_em", { ascending: false });

  const motoristas = (data ?? []).sort((a, b) => ORDEM.indexOf(a.status) - ORDEM.indexOf(b.status));

  return (
    <>
      <Titulo acao={<BotaoLink href="/painel/motoristas/convidar">Convidar motorista</BotaoLink>}>Motoristas</Titulo>
      {!motoristas.length ? (
        <Vazio>Nenhum motorista ainda. Convide pelo WhatsApp.</Vazio>
      ) : (
        <ul className="grid gap-3">
          {motoristas.map((m) => {
            const s = STATUS_LOCATARIO[m.status];
            const pendencias = (m.pendencias_pre_analise as string[] | null)?.length ?? 0;
            return (
              <li key={m.id}>
                <Link href={`/painel/motoristas/${m.id}`}>
                  <Cartao className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{m.nome}</p>
                      <Suave>{m.telefone}</Suave>
                    </div>
                    <div className="flex gap-2">
                      {m.status === "em_analise" && pendencias > 0 && <Selo tom="perigo">{pendencias} pendência(s)</Selo>}
                      <Selo tom={s.tom}>{s.rotulo}</Selo>
                    </div>
                  </Cartao>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
