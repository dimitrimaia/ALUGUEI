"use client";

import { useActionState } from "react";
import { Aviso, Botao, Campo, classeEntrada } from "@/components/ui";
import { criarOrganizacao, type EstadoComecar } from "./acoes";

export function FormularioComecar() {
  const [estado, enviar, enviando] = useActionState<EstadoComecar, FormData>(criarOrganizacao, {});
  return (
    <form action={enviar} className="flex flex-col gap-4">
      {estado.mensagem && <Aviso tom="perigo">{estado.mensagem}</Aviso>}
      <Campo rotulo="Nome da locadora" dica="Seu nome completo (pessoa física) ou a razão social da empresa." erro={estado.erros?.nome}>
        <input name="nome" className={classeEntrada} required />
      </Campo>
      <Campo rotulo="CPF ou CNPJ" dica="Só números. Use o CPF se aluga como pessoa física." erro={estado.erros?.documento}>
        <input name="documento" inputMode="numeric" className={classeEntrada} required />
      </Campo>
      <div className="grid grid-cols-[1fr_5rem] gap-3">
        <Campo rotulo="Cidade" erro={estado.erros?.cidade}>
          <input name="cidade" className={classeEntrada} required />
        </Campo>
        <Campo rotulo="UF" erro={estado.erros?.uf}>
          <input name="uf" maxLength={2} className={`${classeEntrada} uppercase`} required />
        </Campo>
      </div>
      <Botao tamanho="lg" disabled={enviando}>{enviando ? "Criando…" : "Criar conta e continuar"}</Botao>
    </form>
  );
}
