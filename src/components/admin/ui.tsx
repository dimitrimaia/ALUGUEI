import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

/** Data e hora curtas em Brasília ("04/11, 10:18"); vazio vira "—". */
export function quando(iso: string | null | undefined, comAno = false): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", ...(comAno ? { year: "2-digit" } : {}), hour: "2-digit", minute: "2-digit" });
}

/** Cabeçalho de uma página do painel. */
export function TituloAdmin({ titulo, subtitulo, acao }: { titulo: string; subtitulo?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
        {subtitulo && <p className="text-sm text-suave">{subtitulo}</p>}
      </div>
      {acao}
    </div>
  );
}

/** Número grande da visão geral (com link opcional). */
export function Numero({ rotulo, valor, detalhe, href, tom = "neutro" }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode; href?: string; tom?: "neutro" | "alerta" | "perigo" | "ok" }) {
  const cor = { neutro: "", alerta: "text-alerta", perigo: "text-perigo", ok: "text-ok" }[tom];
  const corpo = (
    <>
      <p className="text-xs font-semibold tracking-wide text-suave uppercase">{rotulo}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${cor}`}>{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-suave">{detalhe}</p>}
    </>
  );
  const classe = "rounded-[1.1rem] border border-borda bg-cartao p-4 shadow-cartao";
  return href ? <Link href={href as Route} className={`${classe} transition-colors hover:bg-cartao-2`}>{corpo}</Link> : <div className={classe}>{corpo}</div>;
}

/** Tabela simples e responsiva (rola na horizontal no celular). */
export function Tabela({ colunas, linhas, vazio = "Nada por aqui." }: { colunas: string[]; linhas: { chave: string; celulas: ReactNode[]; href?: string }[]; vazio?: string }) {
  if (!linhas.length) return <p className="rounded-[1.1rem] border border-borda bg-cartao p-6 text-center text-sm text-suave">{vazio}</p>;
  return (
    <div className="overflow-x-auto rounded-[1.1rem] border border-borda bg-cartao shadow-cartao">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="border-b border-borda bg-cartao-2 text-xs text-suave uppercase">
          <tr>{colunas.map((c) => <th key={c} className="px-3 py-2.5 font-semibold">{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-borda">
          {linhas.map((l) => (
            <tr key={l.chave} className="hover:bg-cartao-2">
              {l.celulas.map((c, i) => (
                <td key={i} className="px-3 py-2.5 align-top">{i === 0 && l.href ? <Link href={l.href as Route} className="font-semibold text-marca">{c}</Link> : c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Abas de filtro por ?param=valor. */
export function Filtros({ base, param, atual, opcoes }: { base: string; param: string; atual: string; opcoes: [string, string][] }) {
  return (
    <nav className="mb-4 flex flex-wrap gap-1.5">
      {opcoes.map(([v, r]) => (
        <Link key={v} href={(v ? `${base}?${param}=${v}` : base) as Route} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${atual === v ? "bg-marca text-white" : "bg-cartao-2 text-suave"}`}>{r}</Link>
      ))}
    </nav>
  );
}
