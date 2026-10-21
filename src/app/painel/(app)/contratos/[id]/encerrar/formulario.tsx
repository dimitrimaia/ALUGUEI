"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Aviso, Botao, Cartao, Campo, DadoRotulado, classeEntrada } from "@/components/ui";
import type { ParametrosContrato } from "@/dominio/contrato/parametros";
import { data } from "@/dominio/datas/data";
import { formatarBRL, lerReais } from "@/dominio/dinheiro/centavos";
import { MOTIVOS_ENCERRAMENTO, type MotivoEncerramento, type Pendencia, calcularEncerramento } from "@/dominio/encerramento/demonstrativo";
import { concluirEncerramento } from "./acoes";

type Linha = { tipo: Exclude<Pendencia["tipo"], "km_excedente">; descricao: string; valor: string };

/** Demonstrativo da devolução, calculado na tela com a mesma regra do servidor. */
export function FormularioEncerramento({
  contratoId,
  parametros,
  hoje,
  kmEntrega,
  kmDevolucao,
  saldoAberto,
  caucaoLancada,
  caucaoPaga,
  sugestoes,
  combustivelFaltando,
}: {
  contratoId: string;
  parametros: Pick<ParametrosContrato, "inicio" | "km" | "prazos" | "fim">;
  hoje: string;
  kmEntrega: number;
  kmDevolucao: number;
  saldoAberto: number;
  caucaoLancada: number;
  caucaoPaga: number;
  sugestoes: { descricao: string }[];
  combustivelFaltando: string | null;
}) {
  const [motivo, setMotivo] = useState<MotivoEncerramento>(hoje >= parametros.fim ? "fim_do_prazo" : "acordo");
  const [devolucao, setDevolucao] = useState(hoje);
  const [linhas, setLinhas] = useState<Linha[]>(() => [
    ...sugestoes.map((s) => ({ tipo: "avaria" as const, descricao: s.descricao, valor: "" })),
    ...(combustivelFaltando ? [{ tipo: "combustivel" as const, descricao: combustivelFaltando, valor: "" }] : []),
  ]);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, iniciar] = useTransition();
  const rescisao = MOTIVOS_ENCERRAMENTO[motivo].rescisao;

  const outras = linhas.map((l) => ({ tipo: l.tipo, descricao: l.descricao.trim(), valor: lerReais(l.valor) ?? 0 }));
  const dem = useMemo(
    () => calcularEncerramento({ parametros, devolucao: data(devolucao), kmEntrega, kmDevolucao, saldoAberto, caucaoLancada, caucaoPaga, outras, calendario: { incluirBancarios: true } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [devolucao, JSON.stringify(outras)],
  );

  function enviar() {
    setErro(null);
    if (outras.some((o) => o.valor > 0 && o.descricao.length < 3)) return setErro("Descreva cada pendência com valor.");
    iniciar(async () => {
      const r = await concluirEncerramento(contratoId, { motivo, devolucao, outras: outras.filter((o) => o.valor > 0) });
      if (r?.erro) {
        setErro(r.erro);
        setConfirmar(false);
      }
    });
  }

  const mudar = (i: number, campo: keyof Linha, v: string) => setLinhas((a) => a.map((l, j) => (j === i ? { ...l, [campo]: v } : l)));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-4">
        <Cartao className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Motivo">
            <select className={classeEntrada} value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoEncerramento)}>
              {Object.entries(MOTIVOS_ENCERRAMENTO).map(([id, m]) => <option key={id} value={id}>{m.rotulo}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Dia da devolução do carro">
            <input type="date" className={classeEntrada} value={devolucao} max={hoje} min={parametros.inicio} onChange={(e) => e.target.value && setDevolucao(e.target.value)} />
          </Campo>
        </Cartao>

        <Cartao>
          <p className="font-semibold">Pendências</p>
          <p className="mt-1 mb-3 text-sm text-suave">O km excedente é calculado sozinho. Avarias e combustível já vêm da comparação entre as vistorias: informe o valor de cada uma (deixe vazio o que não vai cobrar).</p>
          <div className="flex flex-col gap-3">
            {linhas.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_7rem_auto] items-end gap-2">
                <Campo rotulo={l.tipo === "avaria" ? "Avaria" : l.tipo === "combustivel" ? "Combustível" : l.tipo === "multa_rescisoria" ? "Multa rescisória" : "Outra pendência"}>
                  <input className={classeEntrada} value={l.descricao} onChange={(e) => mudar(i, "descricao", e.target.value)} />
                </Campo>
                <Campo rotulo="Valor (R$)">
                  <input inputMode="decimal" className={classeEntrada} value={l.valor} placeholder="0,00" onChange={(e) => mudar(i, "valor", e.target.value)} />
                </Campo>
                <button type="button" onClick={() => setLinhas((a) => a.filter((_, j) => j !== i))} className="mb-1 grid size-10 place-items-center rounded-xl text-suave hover:bg-cartao-2" aria-label="Remover"><Trash2 size={17} /></button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Botao type="button" variante="secundario" tamanho="sm" icone={Plus} onClick={() => setLinhas((a) => [...a, { tipo: "outro", descricao: "", valor: "" }])}>Outra pendência</Botao>
              {rescisao && !linhas.some((l) => l.tipo === "multa_rescisoria") && (
                <Botao type="button" variante="secundario" tamanho="sm" icone={Plus} onClick={() => setLinhas((a) => [...a, { tipo: "multa_rescisoria", descricao: "Multa por encerramento antes do prazo (cláusula de rescisão)", valor: "" }])}>Multa rescisória</Botao>
              )}
            </div>
            {rescisao && <Aviso tom="neutro">A fórmula da multa rescisória ainda está com o advogado. Informe o valor combinado ou previsto no contrato; ele fica registrado com a descrição.</Aviso>}
          </div>
        </Cartao>
      </div>

      <Cartao className="h-fit lg:sticky lg:top-24">
        <p className="mb-2 font-semibold">Demonstrativo</p>
        <dl className="divide-y divide-borda">
          <DadoRotulado rotulo="Km rodados">{dem.kmRodados.toLocaleString("pt-BR")} km</DadoRotulado>
          <DadoRotulado rotulo={`Franquia (${dem.dias} dias)`}>{dem.franquiaKm.toLocaleString("pt-BR")} km</DadoRotulado>
          {dem.pendencias.map((p, i) => <DadoRotulado key={i} rotulo={p.tipo === "km_excedente" ? "Km excedente" : p.descricao}>{formatarBRL(p.valor)}</DadoRotulado>)}
          <DadoRotulado rotulo="Em aberto no extrato">{formatarBRL(Math.max(0, saldoAberto - dem.estornoCaucaoNaoPaga))}</DadoRotulado>
          <DadoRotulado rotulo="Total devido">{formatarBRL(dem.totalDevido)}</DadoRotulado>
          <DadoRotulado rotulo="Caução paga">{formatarBRL(caucaoPaga)}</DadoRotulado>
          <DadoRotulado rotulo="Usado da caução">− {formatarBRL(dem.usoCaucao)}</DadoRotulado>
        </dl>
        <div className="mt-3 rounded-xl bg-ok-suave p-3">
          <p className="text-xs font-semibold text-ok">Devolver ao motorista</p>
          <p className="text-xl font-bold tabular-nums">{formatarBRL(dem.devolverAoMotorista)}</p>
          <p className="text-xs text-suave">Até {dem.devolverAte.split("-").reverse().join("/")} ({parametros.prazos.diasUteisDevolucaoCaucao} dias úteis)</p>
        </div>
        {dem.saldoFinal > 0 && <div className="mt-2 rounded-xl bg-perigo-suave p-3"><p className="text-xs font-semibold text-perigo">Saldo devedor do motorista</p><p className="text-xl font-bold tabular-nums">{formatarBRL(dem.saldoFinal)}</p></div>}
        {erro && <div className="mt-3"><Aviso tom="perigo">{erro}</Aviso></div>}
        {confirmar ? (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-sm">Encerrar o contrato com este demonstrativo? Os lançamentos não podem ser apagados depois.</p>
            <Botao variante={rescisao ? "perigo" : "primario"} disabled={enviando} onClick={enviar}>{enviando ? "Encerrando…" : rescisao ? "Confirmar rescisão" : "Confirmar encerramento"}</Botao>
            <Botao variante="fantasma" onClick={() => setConfirmar(false)}>Voltar</Botao>
          </div>
        ) : (
          <Botao className="mt-4 w-full" tamanho="lg" onClick={() => setConfirmar(true)}>{rescisao ? "Rescindir contrato" : "Encerrar contrato"}</Botao>
        )}
      </Cartao>
    </div>
  );
}
