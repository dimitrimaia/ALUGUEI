import { UserPlus, Users } from "lucide-react";
import { Avatar, BotaoLink, CabecalhoPagina, ItemLista, Lista, Selo, Vazio } from "@/components/ui";
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
      <CabecalhoPagina titulo="Motoristas" acao={<BotaoLink href="/painel/motoristas/convidar" icone={UserPlus}>Convidar</BotaoLink>} />
      {!motoristas.length ? (
        <Vazio icone={Users} titulo="Nenhum motorista ainda" acao={<BotaoLink href="/painel/motoristas/convidar" icone={UserPlus}>Convidar motorista</BotaoLink>}>
          Você manda o convite pelo WhatsApp e o motorista faz o cadastro pelo celular.
        </Vazio>
      ) : (
        <Lista>
          {motoristas.map((m) => {
            const s = STATUS_LOCATARIO[m.status];
            const pendencias = (m.pendencias_pre_analise as string[] | null)?.length ?? 0;
            return (
              <div key={m.id}>
                <ItemLista
                  href={`/painel/motoristas/${m.id}`}
                  inicio={<Avatar nome={m.nome} />}
                  titulo={m.nome}
                  detalhe={m.telefone}
                  lateral={
                    <span className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
                      {m.status === "em_analise" && pendencias > 0 && <Selo tom="perigo">{pendencias} alerta(s)</Selo>}
                      <Selo tom={s.tom}>{s.rotulo}</Selo>
                    </span>
                  }
                />
              </div>
            );
          })}
        </Lista>
      )}
    </>
  );
}
