import { FormAcao } from "@/components/admin/form-acao";
import { quando, Tabela, TituloAdmin } from "@/components/admin/ui";
import { Botao, Cartao, classeEntrada } from "@/components/ui";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { enviarEmMassa } from "../acoes-admin";

export const metadata = { title: "Mensagens em massa" };

/** Aviso para um grupo de pessoas: sino do app, push e e-mail (para quem deixou receber novidades). */
export default async function Mensagens() {
  const { data: historico } = await supabaseAdmin().from("auditoria").select("criado_em, depois").eq("acao", "admin.mensagem_massa").order("criado_em", { ascending: false }).limit(30);
  return (
    <main className="mx-auto max-w-4xl">
      <TituloAdmin titulo="Mensagens em massa" subtitulo="Chega no sino do app e como notificação no celular" />
      <Cartao className="mb-5">
        <FormAcao acao={enviarEmMassa} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">Para quem
            <select name="publico" className={classeEntrada} defaultValue="todos">
              <option value="todos">Todas as contas</option>
              <option value="copiloto">Quem usa o Copiloto</option>
              <option value="locadores">Locadores</option>
              <option value="motoristas_locadora">Motoristas cadastrados em locadora</option>
              <option value="inativos">Sem entrar há 14 dias</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">Título<input name="titulo" maxLength={80} required className={classeEntrada} placeholder="Ex.: Novidade no Copiloto" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Texto<textarea name="texto" maxLength={500} required rows={4} className={`${classeEntrada} h-auto py-2`} placeholder="O que mudou e por que importa, em poucas linhas." /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Link no app (opcional)<input name="link" className={classeEntrada} placeholder="/m/plantao/calculadora" /></label>
          <p className="text-xs text-suave">Quem desligou "Novidades" nas preferências vê só no sino, sem push nem e-mail. Contas bloqueadas não recebem.</p>
          <Botao>Enviar</Botao>
        </FormAcao>
      </Cartao>
      <h2 className="mb-2 font-bold">Enviadas</h2>
      <Tabela
        colunas={["Quando", "Público", "Título", "Enviados"]}
        linhas={(historico ?? []).map((h, i) => {
          const d = (h.depois ?? {}) as { publico?: string; titulo?: string; enviados?: number };
          return { chave: String(i), celulas: [quando(h.criado_em, true), d.publico ?? "—", d.titulo ?? "—", d.enviados ?? 0] };
        })}
        vazio="Nenhuma mensagem enviada ainda."
      />
    </main>
  );
}
