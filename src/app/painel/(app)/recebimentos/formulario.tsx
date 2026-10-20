"use client";

import { useActionState, useState } from "react";
import { Aviso, Botao, Campo, classeEntrada } from "@/components/ui";
import { ativarRecebimentos, type EstadoRecebimentos } from "./acoes";

export function FormularioRecebimentos({ pessoaFisica }: { pessoaFisica: boolean }) {
  const [estado, enviar, enviando] = useActionState<EstadoRecebimentos, FormData>(ativarRecebimentos, {});
  const [endereco, setEndereco] = useState({ logradouro: "", bairro: "" });
  const e = estado.erros ?? {};

  async function buscarCep(cep: string) {
    const d = cep.replace(/\D/g, "");
    if (d.length !== 8) return;
    try {
      const j = await (await fetch(`https://viacep.com.br/ws/${d}/json/`)).json();
      if (!j.erro) setEndereco({ logradouro: j.logradouro ?? "", bairro: j.bairro ?? "" });
    } catch {}
  }

  return (
    <form action={enviar} className="flex flex-col gap-4">
      {estado.mensagem && <Aviso tom="perigo">{estado.mensagem}</Aviso>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="E-mail" dica="Para acessar a conta Asaas." erro={e.email}>
          <input name="email" type="email" className={classeEntrada} required />
        </Campo>
        <Campo rotulo="Celular" erro={e.celular}>
          <input name="celular" type="tel" inputMode="tel" placeholder="(31) 99999-9999" className={classeEntrada} required />
        </Campo>
        {pessoaFisica ? (
          <Campo rotulo="Data de nascimento" erro={e.dataNascimento}>
            <input name="dataNascimento" type="date" className={classeEntrada} required />
          </Campo>
        ) : (
          <Campo rotulo="Tipo de empresa" erro={e.tipoEmpresa}>
            <select name="tipoEmpresa" className={classeEntrada} required defaultValue="">
              <option value="" disabled>Escolha</option>
              <option value="MEI">MEI</option>
              <option value="LIMITED">Limitada (LTDA)</option>
              <option value="INDIVIDUAL">Individual (EI)</option>
              <option value="ASSOCIATION">Associação</option>
            </select>
          </Campo>
        )}
        <Campo rotulo="Faturamento mensal aproximado (R$)" erro={e.rendaMensal}>
          <input name="rendaMensal" inputMode="decimal" placeholder="10.000,00" className={classeEntrada} required />
        </Campo>
        <Campo rotulo="CEP" erro={e.cep}>
          <input name="cep" inputMode="numeric" className={classeEntrada} onBlur={(ev) => buscarCep(ev.target.value)} required />
        </Campo>
        <Campo rotulo="Rua" erro={e.logradouro}>
          <input name="logradouro" value={endereco.logradouro} onChange={(ev) => setEndereco({ ...endereco, logradouro: ev.target.value })} className={classeEntrada} required />
        </Campo>
        <Campo rotulo="Número" erro={e.numero}>
          <input name="numero" className={classeEntrada} required />
        </Campo>
        <Campo rotulo="Complemento">
          <input name="complemento" className={classeEntrada} />
        </Campo>
        <Campo rotulo="Bairro" erro={e.bairro}>
          <input name="bairro" value={endereco.bairro} onChange={(ev) => setEndereco({ ...endereco, bairro: ev.target.value })} className={classeEntrada} required />
        </Campo>
      </div>
      <Botao tamanho="lg" disabled={enviando}>{enviando ? "Criando a conta…" : "Ativar recebimentos"}</Botao>
    </form>
  );
}
