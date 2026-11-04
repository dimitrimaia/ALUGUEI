import { quando, Tabela, TituloAdmin } from "@/components/admin/ui";
import { listarUsuarios } from "@/lib/admin-usuarios";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Auditoria" };

/** Registro (só de inserção) das ações sensíveis: de locadores, motoristas e da equipe. */
export default async function Auditoria({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  let consulta = supabaseAdmin().from("auditoria").select("*").order("criado_em", { ascending: false }).limit(300);
  if (q.trim()) consulta = consulta.ilike("acao", `%${q.trim()}%`);
  const [{ data }, usuarios] = await Promise.all([consulta, listarUsuarios()]);
  const quem = (id: string | null) => (id ? (usuarios.find((u) => u.id === id)?.email ?? id.slice(0, 8)) : "sistema");
  return (
    <main className="mx-auto max-w-6xl">
      <TituloAdmin titulo="Auditoria" subtitulo="Últimas 300 ações registradas" />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Filtrar pela ação (ex.: admin., contrato., cobranca.)" className="h-10 flex-1 rounded-xl border border-borda bg-cartao px-3 text-sm" />
        <button className="h-10 rounded-xl bg-marca px-4 text-sm font-semibold text-white">Filtrar</button>
      </form>
      <Tabela
        colunas={["Quando", "Ação", "Quem", "Entidade", "Mudança"]}
        linhas={(data ?? []).map((a) => ({ chave: a.id, celulas: [quando(a.criado_em, true), <span key="a" className="font-mono text-xs">{a.acao}</span>, quem(a.usuario_id), `${a.entidade}${a.entidade_id ? ` · ${a.entidade_id.slice(0, 8)}` : ""}`, <span key="d" className="font-mono text-[0.7rem] break-all text-suave">{a.depois ? JSON.stringify(a.depois).slice(0, 160) : ""}</span>] }))}
        vazio="Nada registrado."
      />
    </main>
  );
}
