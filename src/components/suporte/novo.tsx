"use client";

import { Send } from "lucide-react";
import { useActionState } from "react";
import { Aviso, Botao, Campo, classeAreaTexto, classeEntrada } from "@/components/ui";
import { abrirAtendimento } from "@/lib/acoes-suporte";

export function NovoAtendimento({ modo, assuntos }: { modo: "motorista" | "locador"; assuntos: readonly string[] }) {
  const [estado, acao, pendente] = useActionState(abrirAtendimento.bind(null, modo), {});
  return (
    <form action={acao} className="flex flex-col gap-3">
      <Campo rotulo="Assunto">
        <select name="assunto" className={classeEntrada} defaultValue={assuntos[0]}>
          {assuntos.map((a) => <option key={a}>{a}</option>)}
        </select>
      </Campo>
      <Campo rotulo="Como podemos ajudar?">
        <textarea name="texto" rows={4} className={classeAreaTexto} placeholder="Conte o que aconteceu. Se for sobre um pagamento ou contrato, diga qual." required minLength={5} maxLength={2000} />
      </Campo>
      {estado.erro && <Aviso tom="perigo">{estado.erro}</Aviso>}
      <Botao icone={Send} disabled={pendente} className="self-start">{pendente ? "Enviando…" : "Enviar"}</Botao>
    </form>
  );
}
