import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormAcao } from "@/components/admin/form-acao";
import { Botao, Cartao, classeEntrada, DadoRotulado, Selo } from "@/components/ui";
import { quando, Tabela, TituloAdmin } from "@/components/admin/ui";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { bloquearUsuario, confirmarEmail, excluirConta } from "../../acoes-admin";

export const metadata = { title: "Usuário" };

/** Tudo de uma conta: dados de login, locadoras, cadastros como motorista, contratos e uso do Copiloto. */
export default async function Usuario({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = supabaseAdmin();
  const { data: u } = await admin.auth.admin.getUserById(id);
  if (!u?.user) notFound();
  const user = u.user;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const trintaDias = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [{ data: membros }, { data: cadastros }, { count: ofertas }, { count: aceitas }, { data: perfil }] = await Promise.all([
    admin.from("membros").select("papel, organizacao_id").eq("usuario_id", id),
    admin.from("locatarios").select("id, nome, status, organizacao_id, criado_em").eq("usuario_id", id),
    admin.from("corridas_avaliadas").select("id", { count: "exact", head: true }).eq("usuario_id", id).gte("ocorrida_em", trintaDias),
    admin.from("corridas_avaliadas").select("id", { count: "exact", head: true }).eq("usuario_id", id).eq("decisao", "aceitei").gte("ocorrida_em", trintaDias),
    admin.from("perfis_custo").select("atualizado_em").eq("usuario_id", id).maybeSingle(),
  ]);
  const orgIds = [...new Set([...(membros ?? []).map((m) => m.organizacao_id), ...(cadastros ?? []).map((c) => c.organizacao_id)])];
  const [{ data: orgs }, { data: contratos }] = await Promise.all([
    orgIds.length ? admin.from("organizacoes").select("id, nome").in("id", orgIds) : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
    (cadastros ?? []).length ? admin.from("contratos").select("id, status, inicio, fim, parametros, organizacao_id").in("locatario_id", (cadastros ?? []).map((c) => c.id)) : Promise.resolve({ data: [] as never[] }),
  ]);
  const nomeOrg = (oid: string) => orgs?.find((o) => o.id === oid)?.nome ?? oid.slice(0, 8);
  const bloqueado = Boolean(user.banned_until && new Date(user.banned_until) > new Date());
  return (
    <main className="mx-auto max-w-5xl">
      <TituloAdmin titulo={typeof meta.nome === "string" ? meta.nome : (user.email ?? user.phone ?? "Conta")} subtitulo={<span className="font-mono text-xs">{id}</span>} acao={<Link href="/admin/usuarios" className="text-sm font-semibold text-marca">← Usuários</Link>} />
      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-4">
          <Cartao>
            <h2 className="mb-2 font-bold">Conta</h2>
            <dl className="divide-y divide-borda">
              <DadoRotulado rotulo="E-mail">{user.email ?? "—"} {user.email && (user.email_confirmed_at ? <Selo tom="ok">confirmado</Selo> : <Selo tom="alerta">sem confirmar</Selo>)}</DadoRotulado>
              <DadoRotulado rotulo="Celular">{user.phone || "—"} {user.phone && (user.phone_confirmed_at ? <Selo tom="ok">confirmado</Selo> : <Selo tom="alerta">sem confirmar</Selo>)}</DadoRotulado>
              <DadoRotulado rotulo="Criada">{quando(user.created_at, true)}</DadoRotulado>
              <DadoRotulado rotulo="Último acesso">{quando(user.last_sign_in_at, true)}</DadoRotulado>
              <DadoRotulado rotulo="Situação">{bloqueado ? <Selo tom="perigo">Bloqueada</Selo> : <Selo tom="ok">Ativa</Selo>}</DadoRotulado>
            </dl>
          </Cartao>
          <Cartao>
            <h2 className="mb-2 font-bold">Locadoras (equipe)</h2>
            {(membros ?? []).length ? (membros ?? []).map((m) => <p key={m.organizacao_id} className="text-sm"><Link href={`/admin/locadoras/${m.organizacao_id}` as Route} className="font-semibold text-marca">{nomeOrg(m.organizacao_id)}</Link> · {m.papel}</p>) : <p className="text-sm text-suave">Não é locador.</p>}
          </Cartao>
          <div>
            <h2 className="mb-2 font-bold">Como motorista</h2>
            <Tabela
              colunas={["Locadora", "Cadastro", "Desde"]}
              linhas={(cadastros ?? []).map((c) => ({ chave: c.id, href: `/admin/locadoras/${c.organizacao_id}`, celulas: [nomeOrg(c.organizacao_id), c.status, quando(c.criado_em, true)] }))}
              vazio="Nenhum cadastro em locadora."
            />
          </div>
          <Tabela
            colunas={["Contrato", "Locadora", "Status", "Período", "Aluguel"]}
            linhas={(contratos ?? []).map((k) => ({ chave: k.id, celulas: [k.id.slice(0, 8), nomeOrg(k.organizacao_id), k.status, `${k.inicio} → ${k.fim}`, formatarBRL(((k.parametros ?? {}) as { aluguelSemanal?: number }).aluguelSemanal ?? 0) + "/sem"] }))}
            vazio="Nenhum contrato."
          />
        </div>
        <div className="flex flex-col gap-4">
          <Cartao>
            <h2 className="mb-2 font-bold">Copiloto (30 dias)</h2>
            <p className="text-sm">{perfil ? `${ofertas ?? 0} ofertas lidas · ${aceitas ?? 0} aceitas` : "Não usa o Copiloto."}</p>
            {Boolean(meta.aluguel) && <p className="mt-1 text-xs text-suave">Tem carro alugado fora do app cadastrado.</p>}
          </Cartao>
          <Cartao className="flex flex-col gap-2">
            <h2 className="font-bold">Ações</h2>
            {user.email && !user.email_confirmed_at && (
              <form action={confirmarEmail.bind(null, id)}><Botao variante="secundario" className="w-full">Confirmar e-mail</Botao></form>
            )}
            <form action={bloquearUsuario.bind(null, id, !bloqueado)}>
              <Botao variante={bloqueado ? "secundario" : "perigo"} className="w-full">{bloqueado ? "Desbloquear conta" : "Bloquear conta"}</Botao>
            </form>
            <p className="text-xs text-suave">Bloquear impede de entrar no app (os dados ficam). Tudo fica na auditoria.</p>
            <details className="mt-2 rounded-xl border border-perigo/30 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-perigo">Excluir conta (LGPD)</summary>
              <p className="mt-2 text-xs text-suave">Apaga o login e os dados da conta. Contratos, fotos de vistoria e auditoria ficam guardados (obrigação legal). Não dá se a pessoa tem contrato em andamento ou é dona de locadora.</p>
              <FormAcao acao={excluirConta.bind(null, id)} className="mt-2 flex flex-col gap-2">
                <input name="confirmar" placeholder="Digite EXCLUIR" className={classeEntrada} required />
                <Botao variante="perigo">Excluir de vez</Botao>
              </FormAcao>
            </details>
          </Cartao>
        </div>
      </div>
    </main>
  );
}
