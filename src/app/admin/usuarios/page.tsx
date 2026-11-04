import { Selo } from "@/components/ui";
import { Filtros, quando, Tabela, TituloAdmin } from "@/components/admin/ui";
import { listarUsuarios } from "@/lib/admin-usuarios";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Usuários" };

const POR_PAGINA = 50;

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ q?: string; tipo?: string; p?: string }> }) {
  const { q = "", tipo = "", p = "1" } = await searchParams;
  const [todos, { data: membros }, { data: perfis }] = await Promise.all([
    listarUsuarios(),
    supabaseAdmin().from("membros").select("usuario_id").limit(10_000),
    supabaseAdmin().from("perfis_custo").select("usuario_id").limit(10_000),
  ]);
  const locadores = new Set((membros ?? []).map((m) => m.usuario_id));
  const copiloto = new Set((perfis ?? []).map((m) => m.usuario_id));
  const busca = q.trim().toLowerCase();
  const filtrados = todos.filter((u) => {
    if (busca && ![u.email, u.telefone, u.nome, u.id].some((x) => x?.toLowerCase().includes(busca))) return false;
    if (tipo === "locador") return locadores.has(u.id);
    if (tipo === "copiloto") return copiloto.has(u.id);
    if (tipo === "bloqueado") return u.bloqueado;
    if (tipo === "sem-confirmar") return !u.emailConfirmado && !!u.email;
    return true;
  });
  const pagina = Math.max(1, Number(p) || 1);
  const vista = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const base = (x: Record<string, string>) => `/admin/usuarios?${new URLSearchParams({ ...(q ? { q } : {}), ...(tipo ? { tipo } : {}), ...x })}`;
  return (
    <main className="mx-auto max-w-6xl">
      <TituloAdmin titulo="Usuários" subtitulo={`${filtrados.length} de ${todos.length} contas`} />
      <form className="mb-3 flex gap-2">
        {tipo && <input type="hidden" name="tipo" value={tipo} />}
        <input name="q" defaultValue={q} placeholder="Buscar por nome, e-mail, celular ou id" className="h-10 flex-1 rounded-xl border border-borda bg-cartao px-3 text-sm" />
        <button className="h-10 rounded-xl bg-marca px-4 text-sm font-semibold text-white">Buscar</button>
      </form>
      <Filtros base="/admin/usuarios" param="tipo" atual={tipo} opcoes={[["", "Todos"], ["locador", "Locadores"], ["copiloto", "Usam o Copiloto"], ["sem-confirmar", "E-mail sem confirmar"], ["bloqueado", "Bloqueados"]]} />
      <Tabela
        colunas={["Conta", "Contato", "Perfil", "Criada", "Último acesso"]}
        linhas={vista.map((u) => ({
          chave: u.id,
          href: `/admin/usuarios/${u.id}`,
          celulas: [
            u.nome ?? u.email ?? u.telefone ?? u.id.slice(0, 8),
            <span key="c" className="text-xs">{u.email ?? "—"}<br />{u.telefone ?? ""}</span>,
            <span key="p" className="flex flex-wrap gap-1">
              {locadores.has(u.id) && <Selo tom="marca">Locador</Selo>}
              {copiloto.has(u.id) && <Selo tom="ok">Copiloto</Selo>}
              {u.bloqueado && <Selo tom="perigo">Bloqueado</Selo>}
              {!u.emailConfirmado && u.email && <Selo tom="alerta">Sem confirmar</Selo>}
            </span>,
            quando(u.criadoEm, true),
            quando(u.ultimoLogin, true),
          ],
        }))}
        vazio="Nenhuma conta encontrada."
      />
      <div className="mt-3 flex justify-between text-sm">
        {pagina > 1 ? <a href={base({ p: String(pagina - 1) })} className="font-semibold text-marca">← Anteriores</a> : <span />}
        {pagina * POR_PAGINA < filtrados.length && <a href={base({ p: String(pagina + 1) })} className="font-semibold text-marca">Próximas →</a>}
      </div>
    </main>
  );
}
