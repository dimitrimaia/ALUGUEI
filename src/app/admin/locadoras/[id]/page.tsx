import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Botao, Cartao, DadoRotulado, Placa } from "@/components/ui";
import { quando, Tabela, TituloAdmin } from "@/components/admin/ui";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { listarUsuarios } from "@/lib/admin-usuarios";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ajustarLocadora } from "../../acoes-admin";

export const metadata = { title: "Locadora" };

/** Uma locadora por dentro: equipe, frota, motoristas, contratos e cobranças. */
export default async function Locadora({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = supabaseAdmin();
  const { data: org } = await admin.from("organizacoes").select("*").eq("id", id).maybeSingle();
  if (!org) notFound();
  const [{ data: membros }, { data: carros }, { data: locatarios }, { data: contratos }, { data: cobrancas }, usuarios] = await Promise.all([
    admin.from("membros").select("*").eq("organizacao_id", id),
    admin.from("veiculos").select("*").eq("organizacao_id", id).order("criado_em", { ascending: false }),
    admin.from("locatarios").select("id, nome, status, usuario_id, criado_em").eq("organizacao_id", id).order("criado_em", { ascending: false }).limit(200),
    admin.from("contratos").select("id, status, inicio, fim, locatario_id, veiculo_id").eq("organizacao_id", id).order("inicio", { ascending: false }).limit(200),
    admin.from("cobrancas").select("id, valor_centavos, vencimento, status, valor_pago_centavos").eq("organizacao_id", id).order("vencimento", { ascending: false }).limit(50),
    listarUsuarios(),
  ]);
  const usuario = (uid: string | null) => usuarios.find((u) => u.id === uid);
  const nomeLoc = (lid: string) => locatarios?.find((l) => l.id === lid)?.nome ?? "—";
  const placa = (vid: string) => carros?.find((v) => v.id === vid)?.placa ?? "—";
  return (
    <main className="mx-auto max-w-6xl">
      <TituloAdmin titulo={org.nome} subtitulo={`${org.documento} · ${org.cidade}/${org.uf} · desde ${quando(org.criado_em, true)}`} acao={<Link href="/admin/locadoras" className="text-sm font-semibold text-marca">← Locadoras</Link>} />
      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-5">
          <section>
            <h2 className="mb-2 font-bold">Frota ({carros?.length ?? 0})</h2>
            <Tabela colunas={["Placa", "Modelo", "Situação", "Verificação", "Odômetro"]} linhas={(carros ?? []).map((v) => ({ chave: v.id, celulas: [<Placa key="p" placa={v.placa} tamanho="sm" />, v.modelo, v.status, v.verificacao, `${v.odometro_atual.toLocaleString("pt-BR")} km`] }))} vazio="Nenhum carro." />
          </section>
          <section>
            <h2 className="mb-2 font-bold">Contratos</h2>
            <Tabela colunas={["Motorista", "Carro", "Status", "Período"]} linhas={(contratos ?? []).map((k) => ({ chave: k.id, celulas: [nomeLoc(k.locatario_id), placa(k.veiculo_id), k.status, `${k.inicio} → ${k.fim}`] }))} vazio="Nenhum contrato." />
          </section>
          <section>
            <h2 className="mb-2 font-bold">Motoristas cadastrados</h2>
            <Tabela colunas={["Nome", "Cadastro", "Conta", "Desde"]} linhas={(locatarios ?? []).map((l) => ({ chave: l.id, celulas: [l.nome, l.status, l.usuario_id ? <Link key="u" href={`/admin/usuarios/${l.usuario_id}` as Route} className="text-marca">{usuario(l.usuario_id)?.email ?? "ver conta"}</Link> : "sem conta", quando(l.criado_em, true)] }))} vazio="Nenhum motorista." />
          </section>
          <section>
            <h2 className="mb-2 font-bold">Últimas cobranças</h2>
            <Tabela colunas={["Vencimento", "Valor", "Status", "Pago"]} linhas={(cobrancas ?? []).map((c) => ({ chave: c.id, celulas: [c.vencimento, formatarBRL(c.valor_centavos), c.status, c.valor_pago_centavos ? formatarBRL(c.valor_pago_centavos) : "—"] }))} vazio="Nenhuma cobrança." />
          </section>
        </div>
        <div className="flex flex-col gap-4">
          <Cartao>
            <h2 className="mb-2 font-bold">Equipe</h2>
            {(membros ?? []).map((m) => (
              <p key={m.id} className="text-sm"><Link href={`/admin/usuarios/${m.usuario_id}` as Route} className="font-semibold text-marca">{usuario(m.usuario_id)?.email ?? m.usuario_id.slice(0, 8)}</Link> · {m.papel}</p>
            ))}
          </Cartao>
          <Cartao>
            <h2 className="mb-2 font-bold">Pagamentos</h2>
            <dl className="divide-y divide-borda">
              <DadoRotulado rotulo="Conta Asaas">{org.subconta_pagamento_id ? "ligada" : "não ligada"}</DadoRotulado>
              <DadoRotulado rotulo="Pix direto">{org.chave_pix_direto ? "cadastrado" : "—"}</DadoRotulado>
            </dl>
          </Cartao>
          <Cartao>
            <h2 className="mb-2 font-bold">Ajustes da plataforma</h2>
            <form action={ajustarLocadora.bind(null, id)} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium">Mensalidade por carro (R$)
                <input name="mensalidade" defaultValue={(org.mensalidade_por_carro_centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} className="h-10 rounded-xl border border-borda bg-cartao px-3" />
              </label>
              <label className="flex items-center justify-between gap-2 text-sm font-medium">Modo assistido
                <input type="checkbox" name="assistido" defaultChecked={org.modo_assistido} className="size-5 accent-[var(--marca)]" />
              </label>
              <Botao>Salvar</Botao>
              <p className="text-xs text-suave">Fica registrado na auditoria (antes e depois).</p>
            </form>
          </Cartao>
        </div>
      </div>
    </main>
  );
}
