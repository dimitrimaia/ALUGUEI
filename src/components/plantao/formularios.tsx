"use client";

import { Check, Play, Plus, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Aviso, Botao, Campo, classeEntrada } from "@/components/ui";
import { CATEGORIAS_DESPESA, NOME_DESPESA, NOME_PLATAFORMA, PLATAFORMAS } from "@/dominio/ganhos/plantao";
import { encerrarJornada, type EstadoForm, excluirLancamento, iniciarJornada, lancarDespesa, lancarGanho } from "@/lib/acoes-plantao";

/** Campo de dinheiro: teclado numérico, "R$" fixo à esquerda. */
export function CampoReais({ nome, rotulo, dica, obrigatorio, padrao, autoFoco }: { nome: string; rotulo: string; dica?: ReactNode; obrigatorio?: boolean; padrao?: string; autoFoco?: boolean }) {
  return (
    <Campo rotulo={rotulo} dica={dica}>
      <span className="relative block">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-suave">R$</span>
        <input name={nome} inputMode="decimal" autoComplete="off" placeholder="0,00" required={obrigatorio} defaultValue={padrao} autoFocus={autoFoco} className={`${classeEntrada} pl-10 font-semibold tabular-nums`} />
      </span>
    </Campo>
  );
}

/** Escolha em pílulas (rádio), boa para o polegar. */
export function Pilulas<T extends string>({ nome, opcoes, rotulos, padrao }: { nome: string; opcoes: readonly T[]; rotulos: Record<T, string>; padrao?: T }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((o) => (
        <label key={o} className="cursor-pointer">
          <input type="radio" name={nome} value={o} defaultChecked={o === padrao} className="peer sr-only" required />
          <span className="inline-flex h-10 items-center rounded-full border border-borda bg-cartao px-4 text-sm font-semibold text-suave transition-colors peer-checked:border-marca peer-checked:bg-marca peer-checked:text-white peer-focus-visible:ring-3 peer-focus-visible:ring-marca/30">
            {rotulos[o]}
          </span>
        </label>
      ))}
    </div>
  );
}

function useFormulario(acao: (e: EstadoForm, f: FormData) => Promise<EstadoForm>, aoConcluir?: () => void) {
  const [estado, despachar, pendente] = useActionState(acao, {});
  const form = useRef<HTMLFormElement>(null);
  const feito = useRef(aoConcluir);
  feito.current = aoConcluir;
  useEffect(() => {
    if (estado.ok) {
      form.current?.reset();
      feito.current?.();
    }
  }, [estado]);
  return { estado, despachar, pendente, form };
}

export function FormIniciar({ metaPadrao }: { metaPadrao: string }) {
  const { estado, despachar, pendente } = useFormulario(iniciarJornada);
  return (
    <form action={despachar} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-white/80">
          Km do painel <span className="font-normal text-white/60">(opcional)</span>
          <input name="km" inputMode="numeric" placeholder="Ex.: 84.250" className="h-11 rounded-xl bg-white px-3 text-base font-semibold text-[#0b1630] outline-none placeholder:font-normal placeholder:text-[#5b6880]" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-white/80">
          Meta de hoje <span className="font-normal text-white/60">(R$)</span>
          <input name="meta" inputMode="decimal" defaultValue={metaPadrao} placeholder="Ex.: 300" className="h-11 rounded-xl bg-white px-3 text-base font-semibold text-[#0b1630] outline-none placeholder:font-normal placeholder:text-[#5b6880]" />
        </label>
      </div>
      {estado.erro && <p className="rounded-lg bg-white/15 px-3 py-2 text-sm">{estado.erro}</p>}
      <Botao variante="claro" tamanho="lg" icone={Play} disabled={pendente} className="w-full">{pendente ? "Iniciando…" : "Iniciar plantão"}</Botao>
    </form>
  );
}

export function FormEncerrar({ kmInicial }: { kmInicial: number | null }) {
  const [aberto, setAberto] = useState(false);
  const { estado, despachar, pendente } = useFormulario(encerrarJornada);
  if (!aberto) {
    return <Botao variante="vidro" icone={Square} onClick={() => setAberto(true)} className="h-11 w-full rounded-xl">Encerrar</Botao>;
  }
  return (
    <form action={despachar} className="col-span-2 flex flex-col gap-2 rounded-xl bg-white/10 p-3 ring-1 ring-white/20">
      <label className="flex flex-col gap-1 text-xs font-semibold text-white/80">
        Km do painel agora {kmInicial !== null && <span className="font-normal text-white/60">(começou com {kmInicial.toLocaleString("pt-BR")})</span>}
        <input name="km" inputMode="numeric" autoFocus placeholder="Opcional, para o R$/km" className="h-11 rounded-xl bg-white px-3 text-base font-semibold text-[#0b1630] outline-none placeholder:font-normal placeholder:text-[#5b6880]" />
      </label>
      {estado.erro && <p className="text-sm">{estado.erro}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Botao type="button" variante="vidro" onClick={() => setAberto(false)}>Voltar</Botao>
        <Botao variante="claro" icone={Check} disabled={pendente}>{pendente ? "Encerrando…" : "Encerrar"}</Botao>
      </div>
    </form>
  );
}

/** Confirmação com "Desfazer": apaga o último lançamento se foi engano. */
function Confirmacao({ texto, estado }: { texto: string; estado: EstadoForm }) {
  const [desfeito, setDesfeito] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  if (estado.id && desfeito === estado.id) return <Aviso tom="neutro">Lançamento desfeito.</Aviso>;
  return (
    <div role="status" className="flex items-center justify-between gap-3 rounded-xl bg-ok-suave px-3.5 py-2.5 text-[0.85rem] text-ok">
      <span className="font-semibold">{texto}</span>
      {estado.id && estado.tipo && (
        <button type="button" disabled={pendente} onClick={() => iniciar(async () => { await excluirLancamento(estado.tipo!, estado.id!); setDesfeito(estado.id!); })} className="shrink-0 rounded-lg px-2 py-1 font-bold underline-offset-2 hover:underline">
          {pendente ? "Desfazendo…" : "Desfazer"}
        </button>
      )}
    </div>
  );
}

export function FormGanho({ voltarPara }: { voltarPara?: string }) {
  const router = useRouter();
  const [salvos, setSalvos] = useState(0);
  const { estado, despachar, pendente, form } = useFormulario(lancarGanho, () => setSalvos((n) => n + 1));
  return (
    <form ref={form} action={despachar} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Plataforma</span>
        <Pilulas nome="plataforma" opcoes={PLATAFORMAS} rotulos={NOME_PLATAFORMA} padrao="uber" />
      </div>
      <CampoReais nome="valor" rotulo="Quanto entrou" dica="Pode lançar corrida por corrida ou o total do dia em cada app." obrigatorio autoFoco />
      <Campo rotulo="Quantas corridas">
        <input name="corridas" type="number" inputMode="numeric" min={1} max={200} defaultValue={1} className={classeEntrada} />
      </Campo>
      {estado.erro && <Aviso tom="perigo">{estado.erro}</Aviso>}
      {salvos > 0 && !pendente && <Confirmacao estado={estado} texto={salvos === 1 ? "Ganho lançado." : `${salvos} ganhos lançados.`} />}
      <div className="grid grid-cols-2 gap-2">
        <Botao type="button" variante="secundario" tamanho="lg" onClick={() => router.push((voltarPara ?? "/m/plantao") as never)}>Concluir</Botao>
        <Botao tamanho="lg" icone={Plus} disabled={pendente}>{pendente ? "Salvando…" : "Lançar"}</Botao>
      </div>
    </form>
  );
}

export function FormDespesa() {
  const router = useRouter();
  const [salvos, setSalvos] = useState(0);
  const [categoria, setCategoria] = useState<string>("combustivel");
  const { estado, despachar, pendente, form } = useFormulario(lancarDespesa, () => setSalvos((n) => n + 1));
  return (
    <form ref={form} action={despachar} className="flex flex-col gap-4" onChange={(e) => {
        const alvo = e.target as unknown as HTMLInputElement;
        if (alvo.name === "categoria") setCategoria(alvo.value);
      }}>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Tipo</span>
        <Pilulas nome="categoria" opcoes={CATEGORIAS_DESPESA} rotulos={NOME_DESPESA} padrao="combustivel" />
      </div>
      <CampoReais nome="valor" rotulo="Valor" obrigatorio />
      {categoria === "combustivel" && (
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Litros (ou m³, kWh)" dica="Para o consumo real">
            <input name="quantidade" inputMode="decimal" placeholder="Ex.: 35,2" className={classeEntrada} />
          </Campo>
          <Campo rotulo="Km do painel" dica="Opcional">
            <input name="km" inputMode="numeric" placeholder="Ex.: 84.250" className={classeEntrada} />
          </Campo>
        </div>
      )}
      <Campo rotulo="Descrição" dica="Opcional">
        <input name="descricao" maxLength={120} placeholder={categoria === "manutencao" ? "Ex.: troca de óleo" : "Ex.: posto da Av. Brasil"} className={classeEntrada} />
      </Campo>
      {estado.erro && <Aviso tom="perigo">{estado.erro}</Aviso>}
      {salvos > 0 && !pendente && <Confirmacao estado={estado} texto="Despesa lançada." />}
      <div className="grid grid-cols-2 gap-2">
        <Botao type="button" variante="secundario" tamanho="lg" onClick={() => router.push("/m/plantao")}>Concluir</Botao>
        <Botao tamanho="lg" icone={Plus} disabled={pendente}>{pendente ? "Salvando…" : "Lançar"}</Botao>
      </div>
    </form>
  );
}
