"use client";

import { useActionState } from "react";
import { Aviso, Botao, Campo, classeEntrada } from "@/components/ui";
import { salvarPixDireto } from "./acoes-pix";

export function FormPixDireto({ chave }: { chave: string | null }) {
  const [estado, acao, pendente] = useActionState(salvarPixDireto, null);
  return (
    <form action={acao} className="flex flex-col gap-3">
      <Campo rotulo="Sua chave Pix" dica="CPF, CNPJ, e-mail, celular com +55 ou chave aleatória. Precisa estar no seu nome ou da sua empresa.">
        <input name="chave" defaultValue={chave ?? ""} className={classeEntrada} placeholder="+55 31 99999-9999" />
      </Campo>
      {estado && <Aviso tom={estado.ok ? "ok" : "perigo"}>{estado.ok ? estado.mensagem : estado.erro}</Aviso>}
      <div className="flex gap-2">
        <Botao disabled={pendente}>{pendente ? "Salvando…" : chave ? "Atualizar chave" : "Usar Pix direto"}</Botao>
        {chave && <Botao variante="fantasma" name="remover" value="1" disabled={pendente}>Desligar</Botao>}
      </div>
    </form>
  );
}
