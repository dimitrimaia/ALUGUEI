"use client";

import { useActionState } from "react";
import { Aviso, Botao, Campo, classeEntrada } from "@/components/ui";
import { convidarMotorista, type EstadoConvite } from "../acoes";

export function FormularioConvite({
  veiculos,
  veiculoInicial,
}: {
  veiculos: { id: string; rotulo: string }[];
  veiculoInicial?: string | undefined;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoConvite, FormData>(convidarMotorista, {});
  const e = estado.erros ?? {};
  return (
    <form action={enviar} className="flex flex-col gap-4">
      {estado.mensagem && <Aviso tom="perigo">{estado.mensagem}</Aviso>}
      <Campo rotulo="Nome do motorista" erro={e.nome}>
        <input name="nome" className={classeEntrada} required />
      </Campo>
      <Campo rotulo="Celular (WhatsApp)" erro={e.telefone}>
        <input name="telefone" type="tel" inputMode="tel" placeholder="(31) 99999-9999" className={classeEntrada} required />
      </Campo>
      <Campo rotulo="Veículo oferecido" erro={e.veiculoId} dica={veiculos.length ? undefined : "Nenhum veículo disponível; dá para definir depois."}>
        <select name="veiculoId" defaultValue={veiculoInicial ?? ""} className={classeEntrada}>
          <option value="">Definir depois</option>
          {veiculos.map((v) => (
            <option key={v.id} value={v.id}>{v.rotulo}</option>
          ))}
        </select>
      </Campo>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-medium">Condições</legend>
        <Campo rotulo="Aluguel semanal (R$)" erro={e.aluguelSemanal}>
          <input name="aluguelSemanal" inputMode="decimal" defaultValue="600,00" className={classeEntrada} required />
        </Campo>
        <Campo rotulo="Caução (R$)" erro={e.caucao}>
          <input name="caucao" inputMode="decimal" defaultValue="1.200,00" className={classeEntrada} required />
        </Campo>
        <Campo rotulo="Franquia de km por mês" erro={e.franquiaKmMensal}>
          <input name="franquiaKmMensal" inputMode="numeric" defaultValue="6000" className={classeEntrada} required />
        </Campo>
        <Campo rotulo="Prazo do contrato (meses)" erro={e.prazoMeses}>
          <input name="prazoMeses" inputMode="numeric" defaultValue="3" className={classeEntrada} required />
        </Campo>
      </fieldset>
      <Botao disabled={enviando}>{enviando ? "Criando convite…" : "Criar convite"}</Botao>
    </form>
  );
}
