"use client";

import { ClipboardPaste, Save, ThumbsDown, ThumbsUp } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Aviso, Botao, Cartao, DadoRotulado } from "@/components/ui";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { avaliarCorrida } from "@/dominio/ganhos/corrida";
import { type Criterios, type PerfilCusto, taxas } from "@/dominio/ganhos/custos";
import { lerOferta } from "@/dominio/ganhos/oferta";
import { calcularViagem, compararCombustivel } from "@/dominio/ganhos/viagem";
import { registrarCorridas } from "@/lib/acoes-plantao";
import { EntradaNumero, EntradaReais, Rotulo } from "./entradas";
import { CartaoSemaforo } from "./semaforo-cartao";

const ABAS = { corrida: "Corrida", viagem: "Viagem", combustivel: "Etanol × gasolina" } as const;
type Aba = keyof typeof ABAS;

export function Calculadora({ perfil, criterios, abaInicial = "corrida" }: { perfil: PerfilCusto; criterios: Criterios; abaInicial?: Aba }) {
  const [aba, setAba] = useState<Aba>(abaInicial);
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-2xl bg-cartao-2 p-1">
        {(Object.keys(ABAS) as Aba[]).map((k) => (
          <button key={k} role="tab" aria-selected={aba === k} onClick={() => setAba(k)} className={`h-10 rounded-xl text-[0.8rem] font-semibold transition-colors ${aba === k ? "bg-cartao text-texto shadow-cartao" : "text-suave"}`}>
            {ABAS[k]}
          </button>
        ))}
      </div>
      {aba === "corrida" && <AbaCorrida perfil={perfil} criterios={criterios} />}
      {aba === "viagem" && <AbaViagem perfil={perfil} />}
      {aba === "combustivel" && <AbaCombustivel perfil={perfil} />}
    </div>
  );
}

function AbaCorrida({ perfil, criterios }: { perfil: PerfilCusto; criterios: Criterios }) {
  const [valor, setValor] = useState<number | null>(null);
  const [kmCorrida, setKmCorrida] = useState<number | null>(null);
  const [minCorrida, setMinCorrida] = useState<number | null>(null);
  const [kmBusca, setKmBusca] = useState<number | null>(null);
  const [minBusca, setMinBusca] = useState<number | null>(null);
  const [chave, setChave] = useState(0); // recria os campos ao colar uma oferta
  const [colado, setColado] = useState<string | null>(null);
  const [salvo, setSalvo] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();
  const t = useMemo(() => taxas(perfil), [perfil]);
  const a = valor && kmCorrida ? avaliarCorrida({ valor, kmCorrida, minutosCorrida: minCorrida, kmBusca, minutosBusca: minBusca }, t, criterios) : null;

  async function colar() {
    try {
      const texto = await navigator.clipboard.readText();
      const o = lerOferta(texto);
      if (!o) return setColado("Não achei valor e distância no texto copiado.");
      setValor(o.valor);
      setKmCorrida(o.kmCorrida);
      setMinCorrida(o.minutosCorrida ?? null);
      setKmBusca(o.kmBusca ?? null);
      setMinBusca(o.minutosBusca ?? null);
      setChave((n) => n + 1);
      setColado("Oferta lida do texto copiado.");
    } catch {
      setColado("O navegador não deixou ler a área de transferência.");
    }
  }

  function salvar(decisao: "aceitei" | "recusei") {
    if (!a || !valor || !kmCorrida) return;
    iniciar(async () => {
      await registrarCorridas([{ valor, kmCorrida, minutosCorrida: minCorrida, kmBusca, minutosBusca: minBusca, sinal: a.sinal, decisao, origem: "digitada", momento: new Date().toISOString() }]);
      setSalvo(decisao === "aceitei" ? "Guardada como corrida que você pegou." : "Guardada como corrida que você não pegou.");
    });
  }

  return (
    <>
      <Cartao key={chave} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Rotulo texto="Valor da corrida"><EntradaReais rotulo="Valor da corrida" valor={valor} aoMudar={(v) => (setValor(v), setSalvo(null))} /></Rotulo>
          <Rotulo texto="Km da viagem"><EntradaNumero rotulo="Km da viagem" valor={kmCorrida} sufixo="km" aoMudar={(v) => (setKmCorrida(v), setSalvo(null))} /></Rotulo>
          <Rotulo texto="Tempo da viagem"><EntradaNumero rotulo="Minutos da viagem" inteiro valor={minCorrida} sufixo="min" placeholder="Opcional" aoMudar={setMinCorrida} /></Rotulo>
          <Rotulo texto="Até o passageiro"><EntradaNumero rotulo="Km até o passageiro" valor={kmBusca} sufixo="km" placeholder="Opcional" aoMudar={setKmBusca} /></Rotulo>
        </div>
        <button type="button" onClick={colar} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-marca"><ClipboardPaste size={16} /> Colar oferta copiada</button>
        {colado && <p className="text-xs text-suave">{colado}</p>}
      </Cartao>
      {a ? (
        <>
          <CartaoSemaforo a={a} kmBusca={kmBusca} />
          <div className="grid grid-cols-2 gap-2">
            <Botao variante="secundario" icone={ThumbsDown} disabled={salvando} onClick={() => salvar("recusei")}>Não peguei</Botao>
            <Botao variante="secundario" icone={ThumbsUp} disabled={salvando} onClick={() => salvar("aceitei")}>Peguei</Botao>
          </div>
          <p className="-mt-2 text-center text-xs text-suave">Opcional: guarda esta oferta no histórico do Copiloto, para as suas estatísticas.</p>
          {salvo && <Aviso tom="ok">{salvo} Veja em Plantão › Ofertas.</Aviso>}
        </>
      ) : (
        <p className="text-center text-sm text-suave">Digite o valor e os km da oferta para ver se vale a pena.</p>
      )}
    </>
  );
}

function AbaViagem({ perfil }: { perfil: PerfilCusto }) {
  const [km, setKm] = useState<number | null>(null);
  const [idaEVolta, setIdaEVolta] = useState(true);
  const [horas, setHoras] = useState<number | null>(null);
  const [pedagios, setPedagios] = useState<number | null>(null);
  const [alimentacao, setAlimentacao] = useState<number | null>(null);
  const [hospedagem, setHospedagem] = useState<number | null>(null);
  const [receita, setReceita] = useState<number | null>(null);
  const [margem, setMargem] = useState<number | null>(30);
  const t = useMemo(() => taxas(perfil), [perfil]);
  const kmTotal = km ? (idaEVolta ? km * 2 : km) : 0;
  const r = km
    ? calcularViagem({ km, idaEVolta, horas: horas ?? kmTotal / 60, pedagios: pedagios ?? 0, alimentacao: alimentacao ?? 0, hospedagem: hospedagem ?? 0, outros: 0, receita, margemDesejada: Math.round((margem ?? 0) * 100) }, t)
    : null;
  return (
    <>
      <Cartao className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Rotulo texto="Distância"><EntradaNumero rotulo="Distância da viagem" valor={km} sufixo="km" aoMudar={setKm} /></Rotulo>
          <Rotulo texto="Horas ao volante"><EntradaNumero rotulo="Horas ao volante" valor={horas} sufixo="h" placeholder={kmTotal ? String(Math.round(kmTotal / 60)) : "Auto"} aoMudar={setHoras} /></Rotulo>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-xl bg-cartao-2 px-3 py-2.5 text-sm font-medium">
          Ida e volta
          <input type="checkbox" checked={idaEVolta} onChange={(e) => setIdaEVolta(e.target.checked)} className="size-5 accent-[var(--marca)]" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Rotulo texto="Pedágios"><EntradaReais rotulo="Pedágios" valor={pedagios} aoMudar={setPedagios} /></Rotulo>
          <Rotulo texto="Alimentação"><EntradaReais rotulo="Alimentação" valor={alimentacao} aoMudar={setAlimentacao} /></Rotulo>
          <Rotulo texto="Hospedagem"><EntradaReais rotulo="Hospedagem" valor={hospedagem} aoMudar={setHospedagem} /></Rotulo>
          <Rotulo texto="Vai receber"><EntradaReais rotulo="Quanto vai receber" valor={receita} placeholder="Opcional" aoMudar={setReceita} /></Rotulo>
        </div>
        <Rotulo texto="Margem de lucro desejada"><EntradaNumero rotulo="Margem de lucro" inteiro valor={margem} sufixo="%" aoMudar={(v) => setMargem(v === null ? null : Math.min(90, v))} /></Rotulo>
      </Cartao>
      {r && (
        <Cartao>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-cartao-2 p-3"><p className="text-xs text-suave">Custo total</p><p className="text-xl font-extrabold tabular-nums">{formatarBRL(r.total)}</p></div>
            <div className="rounded-xl bg-marca-suave p-3"><p className="text-xs text-suave">Cobre pelo menos</p><p className="text-xl font-extrabold text-marca tabular-nums">{formatarBRL(r.precoSugerido)}</p></div>
          </div>
          <dl className="divide-y divide-borda">
            <DadoRotulado rotulo={`Combustível (${r.kmTotal.toLocaleString("pt-BR")} km)`}>{formatarBRL(r.combustivel)}</DadoRotulado>
            <DadoRotulado rotulo="Desgaste do carro">{formatarBRL(r.desgaste)}</DadoRotulado>
            <DadoRotulado rotulo="Fixos (aluguel, seguro) pelo tempo">{formatarBRL(r.fixos)}</DadoRotulado>
            <DadoRotulado rotulo="Pedágio, comida e hospedagem">{formatarBRL(r.extras)}</DadoRotulado>
            <DadoRotulado rotulo="Custo por km">{formatarBRL(r.custoPorKm)}</DadoRotulado>
            <DadoRotulado rotulo="Ponto de equilíbrio">{formatarBRL(r.equilibrio)}</DadoRotulado>
            {r.lucro !== null && <DadoRotulado rotulo="Lucro">{<span className={r.lucro < 0 ? "text-perigo" : "text-ok"}>{formatarBRL(r.lucro)} ({((r.margem ?? 0) / 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)</span>}</DadoRotulado>}
          </dl>
        </Cartao>
      )}
    </>
  );
}

function AbaCombustivel({ perfil }: { perfil: PerfilCusto }) {
  const [etanol, setEtanol] = useState<number | null>(perfil.combustivel === "etanol" ? perfil.precoCombustivel : null);
  const [gasolina, setGasolina] = useState<number | null>(perfil.combustivel === "gasolina" ? perfil.precoCombustivel : null);
  const [consumoE, setConsumoE] = useState<number | null>(perfil.combustivel === "etanol" ? perfil.consumo : null);
  const [consumoG, setConsumoG] = useState<number | null>(perfil.combustivel === "gasolina" ? perfil.consumo : null);
  // Sem a média do etanol, usa a regra comum: rende 70% da gasolina.
  const ce = consumoE ?? (consumoG ? Math.round(consumoG * 0.7 * 10) / 10 : null);
  const r = etanol && gasolina && ce && consumoG ? compararCombustivel({ preco: etanol, consumo: ce }, { preco: gasolina, consumo: consumoG }) : null;
  return (
    <>
      <Cartao className="grid grid-cols-2 gap-3">
        <Rotulo texto="Etanol (litro)"><EntradaReais rotulo="Preço do etanol" valor={etanol} aoMudar={setEtanol} /></Rotulo>
        <Rotulo texto="Gasolina (litro)"><EntradaReais rotulo="Preço da gasolina" valor={gasolina} aoMudar={setGasolina} /></Rotulo>
        <Rotulo texto="Média com etanol" dica={consumoE ? undefined : "Sem ela, uso 70% da gasolina"}><EntradaNumero rotulo="Média com etanol" valor={consumoE} sufixo="km/l" placeholder={ce ? String(ce).replace(".", ",") : ""} aoMudar={setConsumoE} /></Rotulo>
        <Rotulo texto="Média com gasolina"><EntradaNumero rotulo="Média com gasolina" valor={consumoG} sufixo="km/l" aoMudar={setConsumoG} /></Rotulo>
      </Cartao>
      {r && (
        <div className={`rounded-[1.3rem] p-5 text-white shadow-flutuante ${r.melhor === "etanol" ? "bg-[#16a34a]" : r.melhor === "gasolina" ? "bg-[#d97706]" : "bg-[#475569]"}`}>
          <p className="text-sm text-white/85">Abasteça com</p>
          <p className="text-3xl font-extrabold">{r.melhor === "etanol" ? "Etanol" : r.melhor === "gasolina" ? "Gasolina" : "Tanto faz"}</p>
          <p className="mt-2 text-sm">
            Etanol {formatarBRL(Math.round(r.porKmEtanol))}/km × gasolina {formatarBRL(Math.round(r.porKmGasolina))}/km. Economia de {formatarBRL(r.economiaPor1000Km)} a cada 1.000 km.
          </p>
          <p className="mt-1 text-xs text-white/85">Relação de preço: {(r.relacaoPreco / 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% · com as suas médias, o etanol compensa até {formatarBRL(r.etanolCompensaAte)}.</p>
        </div>
      )}
    </>
  );
}
