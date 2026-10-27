"use client";

import { avisar } from "@/components/toast";
import { acaoSegura } from "@/lib/versao";
import { Check, PiggyBank, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Aviso, Botao, Cartao } from "@/components/ui";
import type { ConfigFinancas } from "@/dominio/ganhos/financas";
import { fecharDia, movimentarReserva, salvarFinancas } from "@/lib/acoes-plantao";
import { CampoReais } from "./formularios";
import { EntradaReais } from "./entradas";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Anel de progresso da meta (SVG; só o traço anima). */
export function AnelMeta({ percentual }: { percentual: number }) {
  const r = 34;
  const volta = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="size-24 shrink-0 -rotate-90" role="img" aria-label={`${percentual}% da meta`}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-white/20" />
      <circle cx="40" cy="40" r={r} fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeDasharray={volta} strokeDashoffset={volta * (1 - percentual / 100)} className="transition-[stroke-dashoffset] duration-700 ease-out" />
    </svg>
  );
}

export function ConfigurarFinancas({ inicial }: { inicial: ConfigFinancas }) {
  const router = useRouter();
  const [c, setC] = useState(inicial);
  const [ok, setOk] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();
  const mudar = (x: Partial<ConfigFinancas>) => (setOk(null), setC((a) => ({ ...a, ...x })));
  return (
    <Cartao className="flex flex-col gap-3">
      <h2 className="font-bold">Meta e dias de trabalho</h2>
      <label className="flex flex-col gap-1.5 text-sm font-medium">Meta de lucro do mês<EntradaReais rotulo="Meta de lucro do mês" valor={c.metaMensal || null} placeholder="Ex.: 4.000" aoMudar={(v) => mudar({ metaMensal: v ?? 0 })} /></label>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Dias que você trabalha</span>
        <div className="grid grid-cols-7 gap-1">
          {DIAS.map((d, i) => {
            const ativo = c.diasTrabalho.includes(i);
            return (
              <button key={d} type="button" aria-pressed={ativo} onClick={() => mudar({ diasTrabalho: ativo ? c.diasTrabalho.filter((x) => x !== i) : [...c.diasTrabalho, i] })} className={`h-10 rounded-xl text-xs font-bold ${ativo ? "bg-marca text-white" : "bg-cartao-2 text-suave"}`}>{d}</button>
            );
          })}
        </div>
        <span className="text-xs text-suave">A meta do mês é dividida só pelos dias de trabalho que faltam.</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">O dia vira</span>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-cartao-2 p-1">
          {([[0, "À meia-noite"], [4, "Às 4h (como a Uber)"]] as const).map(([v, r]) => (
            <button key={v} type="button" aria-pressed={c.virada === v} onClick={() => mudar({ virada: v })} className={`h-9 rounded-lg text-sm font-semibold ${c.virada === v ? "bg-cartao shadow-cartao" : "text-suave"}`}>{r}</button>
          ))}
        </div>
        <span className="text-xs text-suave">Com a virada às 4h, o que você lança de madrugada conta no dia anterior.</span>
      </div>
      {ok && <Aviso tom="ok">{ok}</Aviso>}
      <Botao icone={Save} disabled={salvando} onClick={() => iniciar(async () => { const r = await acaoSegura(() => salvarFinancas(c)); setOk("ok" in r && r.ok ? "Salvo." : (r.erro ?? null)); if ("ok" in r && r.ok) { avisar("Finanças salvas"); router.refresh(); } else if (r.erro) avisar(r.erro, "erro"); })}>{salvando ? "Salvando…" : "Salvar"}</Botao>
    </Cartao>
  );
}

export function FormReserva() {
  const [estado, despachar, pendente] = useActionState(movimentarReserva, {});
  const [tipo, setTipo] = useState<"guardar" | "usar">("guardar");
  const [chave, setChave] = useState(0);
  useEffect(() => { if (estado.ok) { setChave((k) => k + 1); avisar("Lançado na reserva"); } }, [estado]);
  return (
    <form key={chave} action={despachar} className="flex flex-col gap-2">
      <input type="hidden" name="tipo" value={tipo} />
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-cartao-2 p-1">
        {([["guardar", "Guardei"], ["usar", "Usei"]] as const).map(([v, r]) => (
          <button key={v} type="button" aria-pressed={tipo === v} onClick={() => setTipo(v)} className={`h-9 rounded-lg text-sm font-semibold ${tipo === v ? "bg-cartao shadow-cartao" : "text-suave"}`}>{r}</button>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <CampoReais nome="valor" rotulo="" obrigatorio />
        <Botao icone={PiggyBank} disabled={pendente} className="mt-auto h-11">{pendente ? "…" : "Lançar"}</Botao>
      </div>
      {tipo === "usar" && <input name="descricao" placeholder="Com o quê? (ex.: troca de óleo)" maxLength={80} className="h-10 rounded-xl border border-borda bg-cartao px-3 text-sm" />}
      {estado.erro && <Aviso tom="perigo">{estado.erro}</Aviso>}
      {estado.ok && <p className="flex items-center gap-1 text-sm text-ok"><Check size={15} /> Lançado na reserva.</p>}
    </form>
  );
}

const APPS = [["uber", "Uber"], ["99", "99"], ["indrive", "inDrive"], ["particular", "Particular"], ["outra", "Outra"]] as const;

/** Fechar o dia em 1 minuto: tudo numa tela só. */
export function FormFecharDia({ sugestao }: { sugestao: Record<string, { valor: number; corridas: number }> }) {
  const router = useRouter();
  const [estado, despachar, pendente] = useActionState(fecharDia, {});
  useEffect(() => { if (estado.ok) router.push("/m/plantao/extrato?periodo=hoje"); }, [estado, router]);
  const reais = (c: number) => (c / 100).toFixed(2).replace(".", ",");
  return (
    <form action={despachar} className="flex flex-col gap-4">
      <Cartao className="flex flex-col gap-3">
        <h2 className="font-bold">Quanto entrou hoje</h2>
        {APPS.map(([id, nome]) => (
          <div key={id} className="grid grid-cols-[6rem_1fr_5.5rem] items-center gap-2">
            <span className="text-sm font-semibold">{nome}</span>
            <span className="relative block">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-suave">R$</span>
              <input name={`ganho_${id}`} inputMode="decimal" defaultValue={sugestao[id] ? reais(sugestao[id].valor) : ""} placeholder="0,00" aria-label={`Ganho ${nome}`} className="h-11 w-full rounded-xl border border-borda bg-cartao pr-2 pl-10 font-semibold tabular-nums outline-none focus:border-marca" />
            </span>
            <input name={`corridas_${id}`} type="number" inputMode="numeric" min={1} defaultValue={sugestao[id]?.corridas ?? ""} placeholder="corridas" aria-label={`Corridas ${nome}`} className="h-11 w-full rounded-xl border border-borda bg-cartao px-2 text-center text-sm outline-none focus:border-marca" />
          </div>
        ))}
        {Object.keys(sugestao).length > 0 && <p className="text-xs text-suave">Preenchido com as corridas que você aceitou hoje no Copiloto. Confira os valores finais de cada app.</p>}
      </Cartao>
      <Cartao className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-1 text-xs font-semibold">Km rodados<input name="km" inputMode="numeric" placeholder="Ex.: 180" className="h-11 rounded-xl border border-borda bg-cartao px-3 text-base font-semibold outline-none focus:border-marca" /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold">Horas<input name="horas" inputMode="decimal" placeholder="Ex.: 9" className="h-11 rounded-xl border border-borda bg-cartao px-3 text-base font-semibold outline-none focus:border-marca" /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold">Combustível<input name="combustivel" inputMode="decimal" placeholder="R$" className="h-11 rounded-xl border border-borda bg-cartao px-3 text-base font-semibold outline-none focus:border-marca" /></label>
      </Cartao>
      {estado.erro && <Aviso tom="perigo">{estado.erro}</Aviso>}
      <Botao tamanho="lg" icone={Check} disabled={pendente} className="w-full">{pendente ? "Fechando…" : "Fechar o dia"}</Botao>
    </form>
  );
}
