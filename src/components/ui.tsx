import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Cartao({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border p-4 ${className}`} style={{ background: "var(--cartao)", borderColor: "var(--borda)" }}>
      {children}
    </div>
  );
}

export function Titulo({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">{children}</h1>
      {acao}
    </div>
  );
}

export function Suave({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm ${className}`} style={{ color: "var(--suave)" }}>{children}</p>;
}

const estiloBotao = {
  primario: { background: "var(--marca)", color: "var(--marca-texto)" },
  secundario: { borderColor: "var(--borda)", background: "var(--cartao)" },
  perigo: { background: "var(--perigo)", color: "#fff" },
} as const;

type Variante = keyof typeof estiloBotao;

export function Botao({ variante = "primario", className = "", ...props }: ComponentProps<"button"> & { variante?: Variante }) {
  return (
    <button
      {...props}
      className={`rounded-lg border border-transparent px-4 py-2.5 font-medium disabled:opacity-60 ${className}`}
      style={estiloBotao[variante]}
    />
  );
}

export function BotaoLink({ variante = "primario", className = "", ...props }: ComponentProps<typeof Link> & { variante?: Variante }) {
  return (
    <Link
      {...props}
      className={`inline-block rounded-lg border border-transparent px-4 py-2.5 text-center font-medium ${className}`}
      style={estiloBotao[variante]}
    />
  );
}

export function Campo({
  rotulo,
  dica,
  erro,
  children,
}: {
  rotulo: string;
  dica?: string;
  erro?: string | undefined;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{rotulo}</span>
      {children}
      {dica && !erro && <span className="text-xs" style={{ color: "var(--suave)" }}>{dica}</span>}
      {erro && <span className="text-xs" style={{ color: "var(--perigo)" }}>{erro}</span>}
    </label>
  );
}

export const classeEntrada = "w-full rounded-lg border px-3 py-2.5";

export type Tom = "neutro" | "ok" | "alerta" | "perigo" | "marca";

export function Selo({ tom = "neutro", children }: { tom?: Tom; children: ReactNode }) {
  const cor = { neutro: "var(--suave)", ok: "var(--ok)", alerta: "var(--alerta)", perigo: "var(--perigo)", marca: "var(--marca)" }[tom];
  return (
    <span className="inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium" style={{ color: cor, borderColor: cor }}>
      {children}
    </span>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: "var(--borda)", color: "var(--suave)" }}>
      {children}
    </div>
  );
}

export function Aviso({ tom = "alerta", children }: { tom?: Tom; children: ReactNode }) {
  const cor = { neutro: "var(--suave)", ok: "var(--ok)", alerta: "var(--alerta)", perigo: "var(--perigo)", marca: "var(--marca)" }[tom];
  return (
    <div role="status" className="rounded-lg border-l-4 p-3 text-sm" style={{ borderColor: cor, background: "var(--cartao)" }}>
      {children}
    </div>
  );
}
