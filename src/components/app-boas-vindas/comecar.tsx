"use client";

import { ArrowLeft, Building2, Car, CarFront, Check, Repeat, Search, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import { EntradaNumero, EntradaReais } from "@/components/plantao/entradas";
import { Aviso, Botao } from "@/components/ui";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { COMBUSTIVEIS, type Combustivel, UNIDADE_COMBUSTIVEL } from "@/dominio/ganhos/custos";
import { concluirComeco } from "@/lib/acoes-comecar";

type Uso = "motorista" | "locador" | "ambos";
type Carro = "proprio" | "alugado" | "aluguei" | "nenhum";
const NOME_COMBUSTIVEL: Record<Combustivel, string> = { gasolina: "Gasolina", etanol: "Etanol", gnv: "GNV", diesel: "Diesel", eletrico: "Elétrico" };

function Opcao({ ativo, aoTocar, icone: Icone, titulo, texto }: { ativo: boolean; aoTocar: () => void; icone: typeof Car; titulo: string; texto: string }) {
  return (
    <button type="button" onClick={aoTocar} aria-pressed={ativo} className={`flex w-full items-center gap-3.5 rounded-2xl border-2 bg-cartao p-4 text-left transition-colors ${ativo ? "border-marca bg-marca-suave" : "border-borda"}`}>
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${ativo ? "bg-marca text-white" : "bg-cartao-2 text-suave"}`}><Icone size={21} /></span>
      <span className="min-w-0 flex-1"><span className="block font-bold">{titulo}</span><span className="block text-sm text-suave">{texto}</span></span>
      {ativo && <Check size={20} className="shrink-0 text-marca" />}
    </button>
  );
}

/**
 * Configuração inicial em poucos passos: como vai usar, o carro, o combustível e
 * a meta. No fim, calculadora e semáforo já funcionam com os números da pessoa.
 */
export function Comecar({ nome, temContrato }: { nome: string; temContrato: boolean }) {
  const router = useRouter();
  const [passo, setPasso] = useState(0);
  const [uso, setUso] = useState<Uso | null>(null);
  const [carro, setCarro] = useState<Carro | null>(temContrato ? "aluguei" : null);
  const [aluguel, setAluguel] = useState<number | null>(null);
  const [combustivel, setCombustivel] = useState<Combustivel>("gasolina");
  const [preco, setPreco] = useState<number | null>(619);
  const [consumo, setConsumo] = useState<number | null>(11);
  const [meta, setMeta] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  // Locador puro não precisa dos passos do carro; quem ainda não tem carro pula combustível.
  const passos = uso === "locador" ? ["uso"] : carro === "nenhum" ? ["uso", "carro"] : ["uso", "carro", "combustivel", "meta"];
  const ultimo = passo === passos.length - 1;
  const etapa = passos[passo];
  const pode = etapa === "uso" ? !!uso : etapa === "carro" ? !!carro && (carro !== "alugado" || !!aluguel) : true;

  const terminar = (metaFinal: number | null = meta) =>
    iniciar(async () => {
      const r = await concluirComeco({ uso: uso!, carro, aluguelSemanal: aluguel, combustivel, preco, consumo, meta: metaFinal });
      if (r.erro) return setErro(r.erro);
      router.replace(r.destino as never);
    });

  let conteudo: ReactNode = null;
  if (etapa === "uso") {
    conteudo = (
      <>
        <Cabecalho titulo={`${nome ? `${nome}, como` : "Como"} você vai usar o Aluguei?`} texto="Escolha o principal. Dá para mudar depois." />
        <div className="flex flex-col gap-2.5">
          <Opcao ativo={uso === "motorista"} aoTocar={() => setUso("motorista")} icone={Car} titulo="Sou motorista" texto="Rodo no Uber, 99 ou inDrive" />
          <Opcao ativo={uso === "locador"} aoTocar={() => setUso("locador")} icone={Building2} titulo="Alugo carros" texto="Tenho carro para alugar a motoristas" />
          <Opcao ativo={uso === "ambos"} aoTocar={() => setUso("ambos")} icone={Repeat} titulo="Os dois" texto="Rodo e também alugo carros" />
        </div>
        <p className="mt-4 text-center text-sm text-suave">Com a mesma conta você pode ativar o outro modo quando quiser, no menu ☰.</p>
      </>
    );
  } else if (etapa === "carro") {
    conteudo = (
      <>
        <Cabecalho titulo="E o carro com que você roda?" texto="Para calcular o seu lucro de verdade." />
        <div className="flex flex-col gap-2.5">
          {temContrato && <Opcao ativo={carro === "aluguei"} aoTocar={() => setCarro("aluguei")} icone={Wallet} titulo="Alugado pelo Aluguei" texto="O aluguel do contrato entra sozinho" />}
          <Opcao ativo={carro === "proprio"} aoTocar={() => setCarro("proprio")} icone={CarFront} titulo="Carro próprio" texto="Conto o desgaste: óleo, pneus e revisão" />
          <Opcao ativo={carro === "alugado"} aoTocar={() => setCarro("alugado")} icone={Car} titulo="Alugado de outra locadora" texto="Informe o aluguel da semana" />
          {carro === "alugado" && (
            <div className="rounded-2xl bg-cartao-2 p-3">
              <p className="mb-1.5 text-sm font-medium">Aluguel por semana</p>
              <EntradaReais rotulo="Aluguel por semana" valor={aluguel} aoMudar={setAluguel} placeholder="Ex.: 600" />
            </div>
          )}
          <Opcao ativo={carro === "nenhum"} aoTocar={() => setCarro("nenhum")} icone={Search} titulo="Ainda não tenho carro" texto="Quero encontrar um para alugar" />
        </div>
      </>
    );
  } else if (etapa === "combustivel") {
    const u = UNIDADE_COMBUSTIVEL[combustivel];
    conteudo = (
      <>
        <Cabecalho titulo="Combustível e média" texto="Pode deixar o padrão e ajustar depois em Custos do carro." />
        <div className="flex flex-wrap gap-2">
          {COMBUSTIVEIS.map((k) => (
            <button key={k} type="button" onClick={() => setCombustivel(k)} aria-pressed={combustivel === k} className={`h-10 rounded-full border px-4 text-sm font-semibold ${combustivel === k ? "border-marca bg-marca text-white" : "border-borda bg-cartao text-suave"}`}>{NOME_COMBUSTIVEL[k]}</button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5"><span className="text-sm font-medium">Preço por {u.unidade}</span><EntradaReais rotulo="Preço do combustível" valor={preco} aoMudar={setPreco} /></label>
          <label className="flex flex-col gap-1.5"><span className="text-sm font-medium">Média do carro</span><EntradaNumero rotulo="Média" valor={consumo} sufixo={u.consumo} aoMudar={setConsumo} /></label>
        </div>
        {preco && consumo ? <p className="mt-3 text-sm text-suave">Cada km custa {formatarBRL(Math.round(preco / consumo))} só de combustível.</p> : null}
      </>
    );
  } else {
    conteudo = (
      <>
        <Cabecalho titulo="Quanto quer fazer por dia?" texto="O Plantão mostra quanto falta e em quantas horas chega, no seu ritmo." />
        <div className="grid grid-cols-2 gap-2.5">
          {[20000, 30000, 40000, 50000].map((v) => (
            <button key={v} type="button" onClick={() => setMeta(v)} aria-pressed={meta === v} className={`h-14 rounded-2xl border-2 text-lg font-bold ${meta === v ? "border-marca bg-marca-suave text-marca" : "border-borda bg-cartao"}`}>{formatarBRL(v).replace(",00", "")}</button>
          ))}
        </div>
        <div className="mt-3"><EntradaReais rotulo="Outra meta" valor={meta && ![20000, 30000, 40000, 50000].includes(meta) ? meta : null} aoMudar={setMeta} placeholder="Outro valor" /></div>
      </>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-fundo px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
      <div className="flex h-11 items-center gap-3">
        {passo > 0 ? (
          <button type="button" onClick={() => setPasso((p) => p - 1)} aria-label="Voltar" className="grid size-10 place-items-center rounded-full hover:bg-cartao-2"><ArrowLeft size={21} /></button>
        ) : (
          <span className="size-10" />
        )}
        <div className="flex flex-1 gap-1.5" aria-label={`Passo ${passo + 1} de ${passos.length}`}>
          {passos.map((p, i) => <span key={p} className={`h-1.5 flex-1 rounded-full ${i <= passo ? "bg-marca" : "bg-borda"}`} />)}
        </div>
        <span className="size-10" />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col pt-6">{conteudo}</div>
      <div className="mx-auto flex w-full max-w-md flex-col gap-2 pt-4">
        {erro && <Aviso tom="perigo">{erro}</Aviso>}
        <Botao tamanho="lg" disabled={!pode || salvando} onClick={() => (ultimo ? terminar() : setPasso((p) => p + 1))} className="h-13 w-full rounded-2xl text-base">
          {salvando ? "Preparando…" : ultimo ? "Começar" : "Continuar"}
        </Botao>
        {etapa === "meta" && <button type="button" onClick={() => terminar(null)} className="h-10 text-sm font-semibold text-suave">Pular, defino depois</button>}
      </div>
    </main>
  );
}

function Cabecalho({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-[1.6rem] leading-tight font-extrabold tracking-tight text-balance">{titulo}</h1>
      <p className="mt-2 text-suave">{texto}</p>
    </div>
  );
}
