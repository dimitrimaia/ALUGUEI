import { quando, Tabela, TituloAdmin } from "@/components/admin/ui";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Erros do app" };

/** Erros do servidor e das telas (instrumentation.ts e /api/erros), agrupados pela mensagem. */
export default async function Erros() {
  const { data } = await supabaseAdmin().from("erros_app").select("*").order("criado_em", { ascending: false }).limit(1000);
  const grupos = new Map<string, { mensagem: string; origem: string; vezes: number; ultimo: string; caminhos: Set<string>; usuarios: Set<string> }>();
  for (const e of data ?? []) {
    const k = `${e.origem}|${e.mensagem}`;
    const g = grupos.get(k) ?? { mensagem: e.mensagem, origem: e.origem, vezes: 0, ultimo: e.criado_em, caminhos: new Set(), usuarios: new Set() };
    g.vezes++;
    if (e.caminho) g.caminhos.add(e.caminho);
    if (e.usuario_id) g.usuarios.add(e.usuario_id);
    grupos.set(k, g);
  }
  const lista = [...grupos.values()].sort((a, b) => b.ultimo.localeCompare(a.ultimo));
  return (
    <main className="mx-auto max-w-6xl">
      <TituloAdmin titulo="Erros do app" subtitulo={`${data?.length ?? 0} registros recentes em ${lista.length} tipos`} />
      <Tabela
        colunas={["Erro", "Onde", "Vezes", "Pessoas", "Último"]}
        linhas={lista.map((g, i) => ({ chave: String(i), celulas: [<span key="m" className="font-mono text-xs break-all">{g.mensagem.slice(0, 220)}</span>, <span key="c" className="text-xs">{g.origem} · {[...g.caminhos].slice(0, 3).join(", ")}</span>, g.vezes, g.usuarios.size, quando(g.ultimo)] }))}
        vazio="Nenhum erro registrado."
      />
    </main>
  );
}
