"use client";

import { useActionState } from "react";
import { Aviso, Botao, Campo, classeEntrada } from "@/components/ui";
import { criarVeiculo, type EstadoVeiculo } from "../acoes";

export function FormularioVeiculo() {
  const [estado, enviar, enviando] = useActionState<EstadoVeiculo, FormData>(criarVeiculo, {});
  const e = estado.erros ?? {};
  return (
    <form action={enviar} className="flex flex-col gap-4">
      {estado.mensagem && <Aviso tom="perigo">{estado.mensagem}</Aviso>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Placa" erro={e.placa}>
          <input name="placa" className={`${classeEntrada} uppercase`} placeholder="ABC1D23" required />
        </Campo>
        <Campo rotulo="Marca e modelo" erro={e.modelo}>
          <input name="modelo" className={classeEntrada} placeholder="Fiat Uno Attractive 1.0" required />
        </Campo>
        <Campo rotulo="Ano de fabricação" erro={e.anoFabricacao}>
          <input name="anoFabricacao" inputMode="numeric" className={classeEntrada} />
        </Campo>
        <Campo rotulo="Ano do modelo" erro={e.anoModelo}>
          <input name="anoModelo" inputMode="numeric" className={classeEntrada} />
        </Campo>
        <Campo rotulo="Cor" erro={e.cor}>
          <input name="cor" className={classeEntrada} />
        </Campo>
        <Campo rotulo="Renavam" erro={e.renavam}>
          <input name="renavam" inputMode="numeric" className={classeEntrada} />
        </Campo>
        <Campo rotulo="Km atual (odômetro)" erro={e.odometroAtual}>
          <input name="odometroAtual" inputMode="numeric" className={classeEntrada} required />
        </Campo>
      </div>
      <Botao disabled={enviando}>{enviando ? "Salvando…" : "Salvar veículo"}</Botao>
    </form>
  );
}
