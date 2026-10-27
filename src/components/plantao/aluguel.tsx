"use client";

import { Check, ClipboardCheck, Droplets, Gauge, KeyRound, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { avisar } from "@/components/toast";
import { Botao, Cartao } from "@/components/ui";
import type { DataISO } from "@/dominio/datas/data";
import { type AluguelExterno, PERGUNTAS_SUGERIDAS, type Pergunta } from "@/dominio/ganhos/aluguel";
import { anotarKm, apagarAluguel, marcarVistoria, registrarDevolucao, registrarTrocaOleo, salvarAluguel, salvarPerguntas } from "@/lib/acoes-aluguel";
import { acaoSegura } from "@/lib/versao";
import { EntradaNumero, EntradaReais, Rotulo } from "./entradas";

/** Roda a ação, mostra o aviso e atualiza a tela. */
function useAcao() {
  const router = useRouter();
  const [ocupado, iniciar] = useTransition();
  const rodar = (f: () => Promise<{ ok?: boolean; erro?: string }>, sucesso: string, depois?: () => void) =>
    iniciar(async () => {
      const r = await acaoSegura(f);
      if ("ok" in r && r.ok) {
        avisar(sucesso);
        depois?.();
        router.refresh();
      } else avisar(r.erro ?? "Não deu certo.", "erro");
    });
  return { ocupado, rodar };
}

type Form = Omit<AluguelExterno, "leituras" | "perguntas" | "inicio" | "ultimaVistoria" | "devolucao"> & { inicio: string; ultimaVistoria: string | null };

const VAZIO: Form = {
  locadora: "", telefoneLocadora: "", numeroContrato: "", modelo: "", placa: "", inicio: "", prazoMinimoDias: 0, valorSemanal: 0, multaRescisaoBps: 0, multaDescumprimento: 0, avisoSaidaDias: 7,
  kmLimiteMensal: 0, valorKmExcedente: 0, kmInicial: null, caucao: 0, devolucaoCaucaoDias: 30, vistoriaCadaDias: 0, ultimaVistoria: null, trocaOleoCadaKm: null, ultimaTrocaOleoKm: null,
  franquiaRoubo: 0, franquiaColisao: 0, franquiaTerceiros: 0, acrescimoMultaBps: 0, valorPromissoria: null, observacoes: "",
};

const campo = "h-11 w-full rounded-xl border border-borda bg-cartao px-3 text-sm outline-none focus:border-marca";

function Secao({ titulo, texto, children }: { titulo: string; texto?: string; children: React.ReactNode }) {
  return (
    <Cartao className="flex flex-col gap-3">
      <div><h2 className="font-bold">{titulo}</h2>{texto && <p className="text-xs text-suave">{texto}</p>}</div>
      {children}
    </Cartao>
  );
}

/** Condições do contrato da locadora, copiadas pelo motorista. */
export function EditorAluguel({ inicial, aoSalvar }: { inicial: AluguelExterno | null; aoSalvar: string }) {
  const router = useRouter();
  const [f, setF] = useState<Form>(inicial ? { ...VAZIO, ...inicial } : VAZIO);
  const { ocupado, rodar } = useAcao();
  const m = (x: Partial<Form>) => setF((a) => ({ ...a, ...x }));
  const num = (k: keyof Form, rotulo: string, sufixo?: string, dica?: string) => (
    <Rotulo texto={rotulo} dica={dica}><EntradaNumero inteiro rotulo={rotulo} sufixo={sufixo} valor={(f[k] as number | null) || null} aoMudar={(v) => m({ [k]: v ?? (k === "kmInicial" || k === "trocaOleoCadaKm" || k === "ultimaTrocaOleoKm" ? null : 0) } as Partial<Form>)} /></Rotulo>
  );
  const din = (k: keyof Form, rotulo: string, dica?: string) => (
    <Rotulo texto={rotulo} dica={dica}><EntradaReais rotulo={rotulo} valor={(f[k] as number | null) || null} aoMudar={(v) => m({ [k]: v ?? (k === "valorPromissoria" ? null : 0) } as Partial<Form>)} /></Rotulo>
  );
  const pct = (k: "multaRescisaoBps" | "acrescimoMultaBps", rotulo: string, dica?: string) => (
    <Rotulo texto={rotulo} dica={dica}><EntradaNumero inteiro rotulo={rotulo} sufixo="%" valor={f[k] ? f[k] / 100 : null} aoMudar={(v) => m({ [k]: Math.round((v ?? 0) * 100) })} /></Rotulo>
  );
  return (
    <div className="flex flex-col gap-4">
      <Secao titulo="Locadora e carro">
        <Rotulo texto="Locadora"><input className={campo} value={f.locadora} onChange={(e) => m({ locadora: e.target.value })} placeholder="Nome da locadora" /></Rotulo>
        <div className="grid grid-cols-2 gap-2">
          <Rotulo texto="Telefone"><input className={campo} inputMode="tel" value={f.telefoneLocadora} onChange={(e) => m({ telefoneLocadora: e.target.value })} placeholder="(31) 9…" /></Rotulo>
          <Rotulo texto="Nº do contrato"><input className={campo} value={f.numeroContrato} onChange={(e) => m({ numeroContrato: e.target.value })} /></Rotulo>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Rotulo texto="Carro"><input className={campo} value={f.modelo} onChange={(e) => m({ modelo: e.target.value })} placeholder="Modelo" /></Rotulo>
          <Rotulo texto="Placa"><input className={`${campo} uppercase`} value={f.placa} onChange={(e) => m({ placa: e.target.value })} /></Rotulo>
        </div>
      </Secao>
      <Secao titulo="Prazo e pagamento">
        <div className="grid grid-cols-2 gap-2">
          <Rotulo texto="Pegou o carro em"><input type="date" className={campo} value={f.inicio} onChange={(e) => m({ inicio: e.target.value })} /></Rotulo>
          {din("valorSemanal", "Aluguel por semana")}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {num("prazoMinimoDias", "Prazo mínimo", "dias")}
          {num("avisoSaidaDias", "Aviso para sair", "dias")}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {pct("multaRescisaoBps", "Multa se sair antes", "Sobre as semanas que faltam.")}
          {din("multaDescumprimento", "Multa por descumprir", "Fixa, se o contrato tiver.")}
        </div>
      </Secao>
      <Secao titulo="Quilometragem e manutenção">
        <div className="grid grid-cols-2 gap-2">
          {num("kmLimiteMensal", "Limite por mês", "km", "0 = livre")}
          {din("valorKmExcedente", "Cada km a mais")}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {num("kmInicial", "Km na retirada", "km", "Do painel, no check list.")}
          {num("trocaOleoCadaKm", "Troca de óleo a cada", "km")}
        </div>
        {num("vistoriaCadaDias", "Vistoria obrigatória a cada", "dias", "0 = não tem")}
        {f.vistoriaCadaDias > 0 && <Rotulo texto="Última vistoria"><input type="date" className={campo} value={f.ultimaVistoria ?? ""} onChange={(e) => m({ ultimaVistoria: e.target.value || null })} /></Rotulo>}
      </Secao>
      <Secao titulo="Garantias e proteção">
        <div className="grid grid-cols-2 gap-2">
          {din("caucao", "Caução")}
          {num("devolucaoCaucaoDias", "Devolve a caução em", "dias")}
        </div>
        {din("valorPromissoria", "Valor da nota promissória", "Vazio se ela está em branco.")}
        <div className="grid grid-cols-3 gap-2">
          {din("franquiaRoubo", "Franquia roubo")}
          {din("franquiaColisao", "Franquia batida")}
          {din("franquiaTerceiros", "Terceiros")}
        </div>
        {pct("acrescimoMultaBps", "Acréscimo nas multas de trânsito")}
        <Rotulo texto="Anotações"><textarea className={`${campo} h-24 py-2`} value={f.observacoes} onChange={(e) => m({ observacoes: e.target.value })} placeholder="Ex.: proibido outro motorista; tanque na reserva tira a proteção." /></Rotulo>
      </Secao>
      <Botao icone={Save} disabled={ocupado} onClick={() => rodar(() => salvarAluguel(f), "Aluguel salvo", () => router.push(aoSalvar as never))}>{ocupado ? "Salvando…" : "Salvar"}</Botao>
      {inicial && (
        <button type="button" className="mx-auto flex items-center gap-1.5 text-sm font-semibold text-perigo" onClick={() => confirm("Apagar os dados deste aluguel?") && rodar(apagarAluguel, "Aluguel apagado", () => router.push("/m/plantao" as never))}>
          <Trash2 size={15} /> Apagar este aluguel
        </button>
      )}
    </div>
  );
}

/** Ações rápidas do painel: vistoria feita, km do painel, troca de óleo, devolução. */
export function AcoesAluguel({ devolvido, temVistoria, temOleo }: { devolvido: DataISO | null; temVistoria: boolean; temOleo: boolean }) {
  const [km, setKm] = useState<number | null>(null);
  // O campo guarda o próprio texto: trocar a chave o limpa depois de anotar.
  const [versao, setVersao] = useState(0);
  const limpar = () => (setKm(null), setVersao((v) => v + 1));
  const { ocupado, rodar } = useAcao();
  if (devolvido) return <Botao variante="secundario" icone={KeyRound} disabled={ocupado} onClick={() => rodar(() => registrarDevolucao(true), "Devolução desfeita")}>Desfazer a devolução</Botao>;
  return (
    <Cartao className="flex flex-col gap-3">
      <h2 className="font-bold">Anotar agora</h2>
      <div className="flex gap-2">
        <EntradaNumero key={versao} inteiro rotulo="Km do painel" sufixo="km" placeholder="Km do painel" valor={km} aoMudar={setKm} className="flex-1" />
        <Botao icone={Gauge} disabled={ocupado || !km} onClick={() => rodar(() => anotarKm(km ?? 0), "Km anotado", limpar)}>Anotar</Botao>
      </div>
      <p className="-mt-1 text-xs text-suave">O km do início e do fim do plantão e dos abastecimentos entra sozinho.</p>
      <div className="grid grid-cols-2 gap-2">
        {temVistoria && <Botao variante="secundario" icone={ClipboardCheck} disabled={ocupado} onClick={() => rodar(marcarVistoria, "Vistoria marcada")}>Fiz a vistoria</Botao>}
        {temOleo && <Botao variante="secundario" icone={Droplets} disabled={ocupado || !km} onClick={() => rodar(() => registrarTrocaOleo(km ?? 0), "Troca de óleo anotada", limpar)}>Troquei o óleo</Botao>}
      </div>
      {temOleo && <p className="-mt-1 text-xs text-suave">Para a troca de óleo, digite o km acima antes.</p>}
      <button type="button" className="text-left text-sm font-semibold text-suave" onClick={() => confirm("Devolveu o carro hoje? Os lembretes param e o app conta o prazo da caução.") && rodar(() => registrarDevolucao(), "Devolução anotada")}>
        <KeyRound size={14} className="mr-1 inline" /> Devolvi o carro
      </button>
    </Cartao>
  );
}

/** Perguntas para a locadora, com a resposta anotada (guarde também o print da conversa). */
export function PerguntasLocadora({ inicial }: { inicial: Pergunta[] }) {
  const [lista, setLista] = useState<Pergunta[]>(inicial.length ? inicial : PERGUNTAS_SUGERIDAS.map((texto) => ({ texto, resposta: "" })));
  const [nova, setNova] = useState("");
  const { ocupado, rodar } = useAcao();
  const mudar = (i: number, resposta: string) => setLista((l) => l.map((p, j) => (j === i ? { ...p, resposta } : p)));
  return (
    <Cartao className="flex flex-col gap-3">
      <div><h2 className="font-bold">Perguntas para a locadora</h2><p className="text-xs text-suave">Pergunte por WhatsApp, anote a resposta aqui e guarde o print.</p></div>
      {lista.map((p, i) => (
        <div key={p.texto} className="flex flex-col gap-1.5">
          <span className="flex items-start gap-2 text-sm font-medium">{p.resposta.trim() ? <Check size={16} className="mt-0.5 shrink-0 text-ok" /> : <span className="mt-1.5 size-2 shrink-0 rounded-full bg-alerta" />}{p.texto}</span>
          <input className={campo} value={p.resposta} onChange={(e) => mudar(i, e.target.value)} placeholder="Resposta da locadora" />
        </div>
      ))}
      <div className="flex gap-2">
        <input className={campo} value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Outra pergunta" />
        <Botao variante="secundario" icone={Plus} disabled={!nova.trim()} onClick={() => (setLista((l) => [...l, { texto: nova.trim(), resposta: "" }]), setNova(""))}>Pôr</Botao>
      </div>
      <Botao icone={Save} disabled={ocupado} onClick={() => rodar(() => salvarPerguntas(lista), "Respostas salvas")}>Salvar respostas</Botao>
    </Cartao>
  );
}
