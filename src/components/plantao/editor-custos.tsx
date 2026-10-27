"use client";

import { avisar } from "@/components/toast";
import { acaoSegura } from "@/lib/versao";
import { ChevronRight, Lock, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Aviso, Botao, Cartao, Selo } from "@/components/ui";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { COMBUSTIVEIS, type PerfilCusto, taxas, UNIDADE_COMBUSTIVEL } from "@/dominio/ganhos/custos";
import { salvarCustos } from "@/lib/acoes-plantao";
import { EntradaNumero, EntradaReais, Rotulo } from "./entradas";

const NOME_COMBUSTIVEL = { gasolina: "Gasolina", etanol: "Etanol", gnv: "GNV", diesel: "Diesel", eletrico: "Elétrico" } as const;

export function EditorCustos({ inicial, metaInicial, aluguelSemanal }: { inicial: PerfilCusto; metaInicial: number; aluguelSemanal: number | null }) {
  const router = useRouter();
  const [p, setP] = useState(inicial);
  const [meta, setMeta] = useState<number | null>(metaInicial || null);
  const [estado, setEstado] = useState<{ erro?: string; ok?: boolean }>({});
  const [salvando, iniciar] = useTransition();
  const t = taxas(p);
  const u = UNIDADE_COMBUSTIVEL[p.combustivel];
  const mudar = (parcial: Partial<PerfilCusto>) => {
    setEstado({});
    setP((x) => ({ ...x, ...parcial }));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 -mx-4 border-b border-borda bg-fundo/95 px-4 py-3 backdrop-blur">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><p className="text-[0.65rem] font-semibold text-suave">Custo por km</p><p className="font-bold tabular-nums">{formatarBRL(Math.round(t.variavelPorKm))}</p></div>
          <div><p className="text-[0.65rem] font-semibold text-suave">Fixo por hora</p><p className="font-bold tabular-nums">{formatarBRL(Math.round(t.fixoPorHora))}</p></div>
          <div><p className="text-[0.65rem] font-semibold text-suave">Fixos no mês</p><p className="font-bold tabular-nums">{formatarBRL(t.fixoMensal)}</p></div>
        </div>
      </div>

      <Cartao className="flex flex-col gap-4">
        <h2 className="font-bold">Combustível</h2>
        <div className="flex flex-wrap gap-2">
          {COMBUSTIVEIS.map((k) => (
            <button key={k} type="button" onClick={() => mudar({ combustivel: k })} aria-pressed={p.combustivel === k} className={`h-10 rounded-full border px-4 text-sm font-semibold ${p.combustivel === k ? "border-marca bg-marca text-white" : "border-borda bg-cartao text-suave"}`}>
              {NOME_COMBUSTIVEL[k]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Rotulo texto={`Preço por ${u.unidade}`}><EntradaReais rotulo="Preço do combustível" valor={p.precoCombustivel} aoMudar={(v) => v !== null && mudar({ precoCombustivel: v })} /></Rotulo>
          <Rotulo texto="Média do carro"><EntradaNumero rotulo="Consumo" valor={p.consumo} sufixo={u.consumo} aoMudar={(v) => v && mudar({ consumo: v })} /></Rotulo>
        </div>
        <p className="text-xs text-suave">Só de combustível: {formatarBRL(Math.round(t.combustivelPorKm))} por km.</p>
      </Cartao>

      <Cartao className="flex flex-col gap-3">
        <div>
          <h2 className="font-bold">Gastos fixos do mês</h2>
          <p className="text-xs text-suave">Divididos pelas horas que você roda: viram custo por hora.</p>
        </div>
        {p.fixosMensais.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            {f.doContrato ? (
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl bg-cartao-2 px-3 py-2.5">
                <span className="min-w-0"><span className="block truncate text-sm font-semibold">{f.nome}</span><span className="text-xs text-suave">{aluguelSemanal ? `${formatarBRL(aluguelSemanal)} por semana` : ""}</span></span>
                <span className="flex items-center gap-1.5 text-sm font-bold tabular-nums"><Lock size={13} className="text-suave" />{formatarBRL(f.valor)}</span>
              </div>
            ) : (
              <>
                <input aria-label="Nome do gasto" value={f.nome} onChange={(e) => mudar({ fixosMensais: p.fixosMensais.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)) })} className="h-11 min-w-0 flex-1 rounded-xl border border-borda bg-cartao px-3 text-sm outline-none focus:border-marca" />
                <EntradaReais rotulo={`Valor de ${f.nome}`} className="w-36" valor={f.valor} aoMudar={(v) => mudar({ fixosMensais: p.fixosMensais.map((x, j) => (j === i ? { ...x, valor: v ?? 0 } : x)) })} />
                <button type="button" aria-label={`Remover ${f.nome}`} onClick={() => mudar({ fixosMensais: p.fixosMensais.filter((_, j) => j !== i) })} className="grid size-10 shrink-0 place-items-center rounded-full text-suave hover:bg-cartao-2"><Trash2 size={17} /></button>
              </>
            )}
          </div>
        ))}
        {aluguelSemanal && <p className="text-xs text-suave"><Selo tom="marca">Automático</Selo> O aluguel vem do seu contrato no Aluguei e acompanha qualquer mudança.</p>}
        <div className="flex flex-wrap gap-2">
          {[!aluguelSemanal && "Aluguel do carro", "Seguro", "Celular e internet", "Alimentação", "IPVA e licenciamento (÷12)"]
            .filter((n): n is string => Boolean(n) && !p.fixosMensais.some((f) => f.nome === n))
            .map((n) => (
              <button key={n} type="button" onClick={() => mudar({ fixosMensais: [...p.fixosMensais, { nome: n, valor: 0 }] })} className="inline-flex h-9 items-center gap-1 rounded-full border border-dashed border-borda-forte px-3 text-xs font-semibold text-suave hover:text-texto"><Plus size={14} /> {n}</button>
            ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Rotulo texto="Dias que roda no mês"><EntradaNumero rotulo="Dias por mês" inteiro valor={p.diasPorMes} sufixo="dias" aoMudar={(v) => v && mudar({ diasPorMes: Math.min(31, v) })} /></Rotulo>
          <Rotulo texto="Horas por dia"><EntradaNumero rotulo="Horas por dia" valor={p.horasPorDia} sufixo="h" aoMudar={(v) => v && mudar({ horasPorDia: Math.min(24, v) })} /></Rotulo>
        </div>
      </Cartao>

      <Cartao className="flex flex-col gap-3">
        <div>
          <h2 className="font-bold">Desgaste do carro</h2>
          <p className="text-xs text-suave">Gastos que vêm a cada tantos km. Se o locador paga a manutenção, apague.</p>
        </div>
        {p.desgaste.map((d, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl bg-cartao-2 p-3">
            <div className="flex items-center gap-2">
              <input aria-label="Nome do item" value={d.nome} onChange={(e) => mudar({ desgaste: p.desgaste.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)) })} className="h-9 min-w-0 flex-1 rounded-lg border border-borda bg-cartao px-2.5 text-sm font-semibold outline-none focus:border-marca" />
              <button type="button" aria-label={`Remover ${d.nome}`} onClick={() => mudar({ desgaste: p.desgaste.filter((_, j) => j !== i) })} className="grid size-9 place-items-center rounded-full text-suave hover:bg-cartao"><Trash2 size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <EntradaReais rotulo={`Valor de ${d.nome}`} valor={d.valor} aoMudar={(v) => mudar({ desgaste: p.desgaste.map((x, j) => (j === i ? { ...x, valor: v ?? 0 } : x)) })} />
              <EntradaNumero rotulo={`A cada quantos km: ${d.nome}`} inteiro valor={d.cadaKm} sufixo="km" aoMudar={(v) => v && mudar({ desgaste: p.desgaste.map((x, j) => (j === i ? { ...x, cadaKm: v } : x)) })} />
            </div>
          </div>
        ))}
        <button type="button" onClick={() => mudar({ desgaste: [...p.desgaste, { nome: "Novo item", valor: 0, cadaKm: 10000 }] })} className="inline-flex h-9 items-center gap-1 self-start rounded-full border border-dashed border-borda-forte px-3 text-xs font-semibold text-suave hover:text-texto"><Plus size={14} /> Adicionar item</button>
        <p className="text-xs text-suave">Desgaste: {formatarBRL(Math.round(t.desgastePorKm))} por km.</p>
      </Cartao>

      <Cartao className="flex flex-col gap-3">
        <Rotulo texto="Meta de ganho por dia" dica="Aparece no plantão, com quanto falta e em quantas horas chega."><EntradaReais rotulo="Meta diária" valor={meta} aoMudar={setMeta} placeholder="Ex.: 300" /></Rotulo>
        <Link href="/m/plantao/regua" className="flex items-center justify-between rounded-xl bg-marca-suave px-3 py-3 text-sm font-semibold text-marca">Régua do Copiloto: o que é corrida boa <ChevronRight size={16} /></Link>
      </Cartao>

      {estado.erro && <Aviso tom="perigo">{estado.erro}</Aviso>}
      {estado.ok && <Aviso tom="ok">Custos salvos. O lucro, a calculadora e o Copiloto já usam os valores novos.</Aviso>}
      <Botao
        tamanho="lg"
        icone={Save}
        disabled={salvando}
        onClick={() =>
          iniciar(async () => {
            const r = await acaoSegura(() => salvarCustos({ perfil: p, meta: meta ?? 0 }));
            setEstado(r);
            if ("ok" in r && r.ok) {
              avisar("Custos do carro salvos");
              router.refresh();
            } else if (r.erro) avisar(r.erro, "erro");
          })
        }
        className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] w-full"
      >
        {salvando ? "Salvando…" : "Salvar custos"}
      </Botao>
    </div>
  );
}

