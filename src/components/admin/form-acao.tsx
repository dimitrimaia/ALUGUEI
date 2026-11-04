"use client";

import { useActionState } from "react";

type Resultado = { ok?: string; erro?: string };

/** Formulário de uma ação do painel que mostra o resultado (ou o erro) logo abaixo. */
export function FormAcao({ acao, children, className = "flex flex-col gap-2" }: { acao: (form: FormData) => Promise<Resultado>; children: React.ReactNode; className?: string }) {
  const [estado, enviar, pendente] = useActionState(async (_: Resultado, form: FormData) => acao(form), {});
  return (
    <form action={enviar} className={className}>
      <fieldset disabled={pendente} className="contents">{children}</fieldset>
      {pendente && <p className="text-xs text-suave">Fazendo…</p>}
      {estado.erro && <p className="text-xs font-semibold text-perigo">{estado.erro}</p>}
      {estado.ok && <p className="text-xs font-semibold text-ok">{estado.ok}</p>}
    </form>
  );
}
