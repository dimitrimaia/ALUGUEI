"use client";

import { Save, Trash2 } from "lucide-react";
import { useActionState, useTransition } from "react";
import { Aviso, Botao, Campo, Cartao, classeEntrada } from "@/components/ui";
import { editarCorrida, excluirCorrida } from "@/lib/acoes-plantao";
import { CampoReais, Pilulas } from "./formularios";

type Corrida = { id: string; valor: number; km: number; minutos: number | null; kmBusca: number | null; minutosBusca: number | null; decisao: string | null };
const n = (v: number | null) => (v === null ? "" : String(v).replace(".", ","));

export function EditarCorrida({ c }: { c: Corrida }) {
  const [estado, despachar, pendente] = useActionState(editarCorrida.bind(null, c.id), {});
  const [apagando, iniciar] = useTransition();
  return (
    <form action={despachar} className="flex flex-col gap-4">
      <Cartao className="flex flex-col gap-3">
        <CampoReais nome="valor" rotulo="Valor da corrida" obrigatorio padrao={(c.valor / 100).toFixed(2).replace(".", ",")} />
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Km da viagem"><input name="km" inputMode="decimal" defaultValue={n(c.km)} className={classeEntrada} /></Campo>
          <Campo rotulo="Minutos da viagem"><input name="minutos" inputMode="numeric" defaultValue={n(c.minutos)} className={classeEntrada} /></Campo>
          <Campo rotulo="Km até o passageiro"><input name="kmBusca" inputMode="decimal" defaultValue={n(c.kmBusca)} className={classeEntrada} /></Campo>
          <Campo rotulo="Minutos até ele"><input name="minutosBusca" inputMode="numeric" defaultValue={n(c.minutosBusca)} className={classeEntrada} /></Campo>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Você pegou?</span>
          <Pilulas nome="decisao" opcoes={["aceitei", "recusei"] as const} rotulos={{ aceitei: "Peguei", recusei: "Não peguei" }} padrao={c.decisao === "aceitei" || c.decisao === "recusei" ? c.decisao : undefined} />
        </div>
      </Cartao>
      {estado.erro && <Aviso tom="perigo">{estado.erro}</Aviso>}
      <Botao tamanho="lg" icone={Save} disabled={pendente} className="w-full">{pendente ? "Salvando…" : "Salvar alterações"}</Botao>
      <button type="button" disabled={apagando} onClick={() => confirm("Excluir esta oferta do histórico?") && iniciar(() => excluirCorrida(c.id))} className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-perigo"><Trash2 size={15} /> Excluir do histórico</button>
    </form>
  );
}
