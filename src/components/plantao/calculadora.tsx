"use client";

import { ClipboardPaste, Save, ThumbsDown, ThumbsUp } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Aviso, Botao, Cartao, DadoRotulado } from "@/components/ui";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { avaliarCorrida, precoIdeal } from "@/dominio/ganhos/corrida";
import { type Criterios, type PerfilCusto, taxas } from "@/dominio/ganhos/custos";
import { lerOferta } from "@/dominio/ganhos/oferta";
import { calcularViagem, compararCombustivel } from "@/dominio/ganhos/viagem";
import { contribuicaoMaxima } from "@/dominio/ganhos/carona";
import { CorridaParticular } from "./corrida-particular";
import { PlanejarViagem } from "./planejar-viagem";
import { registrarCorridas } from "@/lib/acoes-plantao";
import { EntradaNumero, EntradaReais, Rotulo } from "./entradas";
import { CartaoSemaforo } from "./semaforo-cartao";

const ABAS = { corrida: "Oferta", particular: "Particular", viagem: "Viagem", entrega: "Entrega", combustivel: "Combustível" } as const;
type Aba = keyof typeof ABAS;

export function Calculadora({ perfil, criterios, abaInicial = "corrida" }: { perfil: PerfilCusto; criterios: Criterios; abaInicial?: Aba }) {
  const [aba, setAba] = useState<Aba>(abaInicial);
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="grid grid-cols-5 gap-1 rounded-2xl bg-cartao-2 p-1">
        {(Object.keys(ABAS) as Aba[]).map((k) => (
          <button key={k} role="tab" aria-selected={aba === k} onClick={() => setAba(k)} className={`h-10 rounded-xl text-[0.72rem] font-semibold transition-colors ${aba === k ? "bg-cartao text-texto shadow-cartao" : "text-suave"}`}>
            {ABAS[k]}
          </button>
        ))}
      </div>
      {aba === "corrida" && <AbaCorrida perfil={perfil} criterios={criterios} />}
      {aba === "particular" && <CorridaParticular perfil={perfil} criterios={criterios} />}
      {aba === "entrega" && <AbaEntrega perfil={perfil} criterios={criterios} />}
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
  // Caixinha "Contar a volta": liga e desliga na hora, sem mexer na régua salva.
  const [comVolta, setComVolta] = useState(criterios.contarVolta);
  const [kmVolta, setKmVolta] = useState<number | null>(null);
  const regua = { ...criterios, contarVolta: comVolta && !!kmVolta };
  const oferta = valor && kmCorrida ? { valor, kmCorrida, minutosCorrida: minCorrida, kmBusca, minutosBusca: minBusca, kmVolta } : null;
  const a = oferta ? avaliarCorrida(oferta, t, regua) : null;
  const ideal = oferta && a && a.sinal !== "verde" ? precoIdeal(oferta, t, regua) : null;

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
        <div className="flex flex-col gap-2 rounded-xl bg-cartao-2 p-3">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold">
            Contar a volta para casa
            <input type="checkbox" checked={comVolta} onChange={(e) => setComVolta(e.target.checked)} className="size-5 accent-[var(--marca)]" />
          </label>
          {comVolta && <EntradaNumero rotulo="Km do destino até a sua casa" valor={kmVolta} sufixo="km volta" placeholder="Km do destino até casa" aoMudar={setKmVolta} />}
        </div>
        <button type="button" onClick={colar} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-marca"><ClipboardPaste size={16} /> Colar oferta copiada</button>
        {colado && <p className="text-xs text-suave">{colado}</p>}
      </Cartao>
      {a ? (
        <>
          <CartaoSemaforo a={a} kmBusca={kmBusca} />
          {a.custoVolta > 0 && <p className="-mt-2 text-center text-xs text-suave">Volta de {kmVolta?.toLocaleString("pt-BR")} km: {formatarBRL(a.custoVolta)} já descontados do lucro.</p>}
          {ideal !== null && ideal !== oferta!.valor && <Aviso tom="info">Para ficar verde{comVolta && kmVolta ? " contando a volta" : ""}: peça pelo menos <strong>{formatarBRL(ideal)}</strong>.</Aviso>}
          {ideal === null && a.sinal !== "verde" && <Aviso tom="perigo">Nem o dobro do valor deixa esta corrida verde.</Aviso>}
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

/**
 * Entrega (iFood, Lalamove, Loggi, Uber Flash...): a ida até a coleta, a espera
 * no restaurante ou na loja, as paradas e a volta vazia contam no R$/km, no
 * R$/h e no lucro, com a mesma régua das corridas.
 */
function AbaEntrega({ perfil, criterios }: { perfil: PerfilCusto; criterios: Criterios }) {
  const [valor, setValor] = useState<number | null>(null);
  const [kmColeta, setKmColeta] = useState<number | null>(null);
  const [kmEntrega, setKmEntrega] = useState<number | null>(null);
  const [minutos, setMinutos] = useState<number | null>(null);
  const [espera, setEspera] = useState<number | null>(10);
  const [paradas, setParadas] = useState(1);
  const [comVolta, setComVolta] = useState(false);
  const [kmVolta, setKmVolta] = useState<number | null>(null);
  const t = useMemo(() => taxas(perfil), [perfil]);
  // Cada parada a mais: uns 4 min de entrega (estacionar, subir, entregar).
  const minutosParadas = (espera ?? 0) + Math.max(0, paradas - 1) * 4;
  const minViagem = minutos ?? (kmEntrega ? (kmEntrega / 25) * 60 : null);
  const oferta = valor && kmEntrega ? { valor, kmCorrida: kmEntrega, minutosCorrida: minViagem !== null ? minViagem + minutosParadas : null, kmBusca: kmColeta, minutosBusca: null, kmVolta } : null;
  const regua = { ...criterios, contarVolta: comVolta && !!kmVolta };
  const a = oferta ? avaliarCorrida(oferta, t, regua) : null;
  const ideal = oferta && a && a.sinal !== "verde" ? precoIdeal(oferta, t, regua) : null;
  return (
    <>
      <Cartao className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Rotulo texto="Valor da entrega"><EntradaReais rotulo="Valor da entrega" valor={valor} aoMudar={setValor} /></Rotulo>
          <Rotulo texto="Até a coleta"><EntradaNumero rotulo="Km até a coleta" valor={kmColeta} sufixo="km" placeholder="Opcional" aoMudar={setKmColeta} /></Rotulo>
          <Rotulo texto="Coleta → entrega"><EntradaNumero rotulo="Km da coleta até a entrega" valor={kmEntrega} sufixo="km" aoMudar={setKmEntrega} /></Rotulo>
          <Rotulo texto="Tempo rodando"><EntradaNumero rotulo="Minutos rodando" inteiro valor={minutos} sufixo="min" placeholder="Auto" aoMudar={setMinutos} /></Rotulo>
          <Rotulo texto="Espera na coleta"><EntradaNumero rotulo="Minutos de espera na coleta" inteiro valor={espera} sufixo="min" aoMudar={setEspera} /></Rotulo>
          <Rotulo texto="Entregas na rota">
            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map((n) => (
                <button key={n} type="button" aria-pressed={paradas === n} onClick={() => setParadas(n)} className={`h-11 rounded-xl text-sm font-bold ${paradas === n ? "bg-marca text-white" : "bg-cartao-2 text-suave"}`}>{n}</button>
              ))}
            </div>
          </Rotulo>
        </div>
        <div className="flex flex-col gap-2 rounded-xl bg-cartao-2 p-3">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold">
            Contar a volta vazia
            <input type="checkbox" checked={comVolta} onChange={(e) => setComVolta(e.target.checked)} className="size-5 accent-[var(--marca)]" />
          </label>
          {comVolta && <EntradaNumero rotulo="Km da última entrega até onde você espera pedidos" valor={kmVolta} sufixo="km volta" placeholder="Km de volta até a sua área" aoMudar={setKmVolta} />}
        </div>
      </Cartao>
      {a ? (
        <>
          <CartaoSemaforo a={a} kmBusca={kmColeta} busca="coleta" />
          <p className="-mt-2 text-center text-xs text-suave">
            Conta {Math.round(minutosParadas)} min parado (espera{paradas > 1 ? ` e ${paradas - 1} parada${paradas > 2 ? "s" : ""} a mais` : ""}).{paradas > 1 && valor ? ` ${formatarBRL(Math.round(valor / paradas))} por entrega.` : ""}
          </p>
          {ideal !== null && ideal !== oferta!.valor && <Aviso tom="info">Para valer a pena pela sua régua: pelo menos <strong>{formatarBRL(ideal)}</strong>.</Aviso>}
          {ideal === null && a.sinal !== "verde" && <Aviso tom="perigo">Nem o dobro do valor deixa esta entrega verde.</Aviso>}
        </>
      ) : (
        <p className="text-center text-sm text-suave">Digite o valor e os km da coleta até a entrega para ver se vale a pena.</p>
      )}
    </>
  );
}

function AbaViagem({ perfil }: { perfil: PerfilCusto }) {
  // Da rota calculada (origem → destino): minutos e pedágio só da ida.
  const [rota, setRota] = useState<{ minutos: number; pedagioIda: number; pracas: number; semPreco: number } | null>(null);
  const [km, setKm] = useState<number | null>(null);
  const [idaEVolta, setIdaEVolta] = useState(true);
  const [horas, setHoras] = useState<number | null>(null);
  const [pedagios, setPedagios] = useState<number | null>(null);
  const [alimentacao, setAlimentacao] = useState<number | null>(null);
  const [hospedagem, setHospedagem] = useState<number | null>(null);
  const [receita, setReceita] = useState<number | null>(null);
  const [margem, setMargem] = useState<number | null>(30);
  // O campo de km guarda o próprio texto: trocar a chave mostra o km que veio da rota.
  const [versaoKm, setVersaoKm] = useState(0);
  const t = useMemo(() => taxas(perfil), [perfil]);
  const kmTotal = km ? (idaEVolta ? km * 2 : km) : 0;
  const vezes = idaEVolta ? 2 : 1;
  const pedagioRota = (rota?.pedagioIda ?? 0) * vezes;
  const pedagiosTotal = pedagioRota + (pedagios ?? 0);
  const horasAuto = rota ? Math.round(((rota.minutos * vezes) / 60) * 10) / 10 : kmTotal / 60;
  const r = km
    ? calcularViagem({ km, idaEVolta, horas: horas ?? horasAuto, pedagios: pedagiosTotal, alimentacao: alimentacao ?? 0, hospedagem: hospedagem ?? 0, outros: 0, receita, margemDesejada: Math.round((margem ?? 0) * 100) }, t)
    : null;
  return (
    <>
      <PlanejarViagem aoCalcular={(x) => (setKm(x.km), setRota(x), setVersaoKm((v) => v + 1))} />
      <Cartao className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Rotulo texto="Distância (ida)"><EntradaNumero key={versaoKm} rotulo="Distância da viagem" valor={km} sufixo="km" aoMudar={setKm} /></Rotulo>
          <Rotulo texto="Horas ao volante"><EntradaNumero rotulo="Horas ao volante" valor={horas} sufixo="h" placeholder={kmTotal ? horasAuto.toLocaleString("pt-BR") : "Auto"} aoMudar={setHoras} /></Rotulo>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-xl bg-cartao-2 px-3 py-2.5 text-sm font-medium">
          Ida e volta
          <input type="checkbox" checked={idaEVolta} onChange={(e) => setIdaEVolta(e.target.checked)} className="size-5 accent-[var(--marca)]" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Rotulo texto={rota?.pracas ? "Outros pedágios" : "Pedágios"}><EntradaReais rotulo="Pedágios" valor={pedagios} aoMudar={setPedagios} /></Rotulo>
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
            {pedagioRota > 0 && <DadoRotulado rotulo={`Pedágios da rota (${rota?.pracas} praça${(rota?.pracas ?? 0) > 1 ? "s" : ""}${idaEVolta ? " × 2" : ""})`}>{formatarBRL(pedagioRota)}</DadoRotulado>}
            {r.lucro !== null && <DadoRotulado rotulo="Lucro">{<span className={r.lucro < 0 ? "text-perigo" : "text-ok"}>{formatarBRL(r.lucro)} ({((r.margem ?? 0) / 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)</span>}</DadoRotulado>}
          </dl>
        </Cartao>
      )}
      {r && <PassageirosViagem total={r.total} sugerido={r.precoSugerido} soCombustivelEPedagio={(n) => contribuicaoMaxima(t, kmTotal, pedagiosTotal, n)} margem={margem ?? 0} />}
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

/**
 * Levar passageiros (BlaBlaCar, grupo, particular): o motorista escolhe quantos e
 * quanto cobra de cada um. Mostra o recomendado (custo + margem, dividido) e o
 * mínimo para só dividir os gastos, e o lucro com o preço escolhido.
 */
function PassageirosViagem({ total, sugerido, soCombustivelEPedagio, margem }: { total: number; sugerido: number; soCombustivelEPedagio: (n: number) => number; margem: number }) {
  const [passageiros, setPassageiros] = useState(3);
  const [preco, setPreco] = useState<number | null>(null);
  // O campo guarda o próprio texto: trocar a chave mostra o recomendado quando ele é tocado.
  const [versao, setVersao] = useState(0);
  const recomendado = Math.ceil(sugerido / passageiros / 100) * 100;
  const receita = (preco ?? 0) * passageiros;
  const lucro = receita - total;
  return (
    <Cartao className="flex flex-col gap-3">
      <h2 className="font-bold">Levar passageiros (BlaBlaCar)</h2>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Passageiros</span>
        <div className="grid grid-cols-6 gap-1">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button key={n} type="button" aria-pressed={passageiros === n} onClick={() => setPassageiros(n)} className={`h-10 rounded-xl text-sm font-bold ${passageiros === n ? "bg-marca text-white" : "bg-cartao-2 text-suave"}`}>{n}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => (setPreco(recomendado), setVersao((v) => v + 1))} className="rounded-xl bg-marca-suave p-3 text-left">
          <p className="text-xs text-suave">Recomendado por pessoa</p>
          <p className="text-xl font-extrabold text-marca tabular-nums">{formatarBRL(recomendado)}</p>
          <p className="text-[0.7rem] text-suave">custos + {margem}% de margem · toque para usar</p>
        </button>
        <div className="rounded-xl bg-cartao-2 p-3">
          <p className="text-xs text-suave">Só dividir os gastos</p>
          <p className="text-xl font-extrabold tabular-nums">{formatarBRL(soCombustivelEPedagio(passageiros))}</p>
          <p className="text-[0.7rem] text-suave">combustível e pedágio, contando você</p>
        </div>
      </div>
      <Rotulo texto="Quanto vai cobrar de cada um"><EntradaReais key={versao} rotulo="Preço por passageiro" valor={preco} placeholder={(recomendado / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} aoMudar={setPreco} /></Rotulo>
      {preco !== null && preco > 0 && (
        <dl className="divide-y divide-borda">
          <DadoRotulado rotulo={`Recebe (${passageiros} × ${formatarBRL(preco)})`}>{formatarBRL(receita)}</DadoRotulado>
          <DadoRotulado rotulo="Custo da viagem">{formatarBRL(total)}</DadoRotulado>
          <DadoRotulado rotulo="Lucro">{<span className={lucro < 0 ? "font-bold text-perigo" : "font-bold text-ok"}>{formatarBRL(lucro)}</span>}</DadoRotulado>
        </dl>
      )}
    </Cartao>
  );
}
