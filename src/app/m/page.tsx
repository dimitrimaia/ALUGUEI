import type { Route } from "next";
import { BotaoLink, Cartao, Selo, Suave } from "@/components/ui";
import { exigirUsuario } from "@/lib/sessao";
import { cadastrosDoMotorista } from "@/lib/motorista";
import { STATUS_LOCATARIO } from "@/lib/rotulos";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Tela inicial do motorista (RF-121). Pagamento, km e check-in aparecem quando houver contrato. */
export default async function Motorista() {
  const usuario = await exigirUsuario("/m");
  const cadastros = await cadastrosDoMotorista(usuario.id);
  const orgs = cadastros.length
    ? (await supabaseAdmin().from("organizacoes").select("id, nome").in("id", cadastros.map((c) => c.organizacao_id))).data ?? []
    : [];
  const nomeOrg = (id: string) => orgs.find((o) => o.id === id)?.nome ?? "Locador";

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Olá{cadastros[0] ? `, ${cadastros[0].nome.split(" ")[0]}` : ""}!</h1>
        <form action="/sair" method="post">
          <button className="text-sm underline" style={{ color: "var(--suave)" }}>Sair</button>
        </form>
      </div>

      {!cadastros.length && (
        <Cartao>
          <p className="font-medium">Nenhum convite por aqui.</p>
          <Suave>Para alugar, peça ao locador o link de convite e abra pelo celular.</Suave>
        </Cartao>
      )}

      {cadastros.map((c) => {
        const s = STATUS_LOCATARIO[c.status];
        return (
          <Cartao key={c.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{nomeOrg(c.organizacao_id)}</p>
              <Selo tom={s.tom}>{s.rotulo}</Selo>
            </div>
            {c.status === "em_cadastro" && (
              <>
                <Suave>Falta terminar seu cadastro.</Suave>
                <BotaoLink href={`/m/cadastro/${c.id}` as Route}>Continuar cadastro</BotaoLink>
              </>
            )}
            {c.status === "em_analise" && <Suave>Recebemos seu cadastro. O locador vai analisar e você será avisado.</Suave>}
            {c.status === "aprovado" && <Suave>Cadastro aprovado! O próximo passo é assinar o contrato.</Suave>}
            {c.status === "recusado" && <Suave>O locador não aprovou o cadastro desta vez.</Suave>}
          </Cartao>
        );
      })}
    </main>
  );
}
