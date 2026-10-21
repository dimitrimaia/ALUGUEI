import { describe, expect, it } from "vitest";
import { PARAMETROS_CONTRATO_REFERENCIA as ref } from "../contrato/parametros";
import { data } from "../datas/data";
import type { ChecklistVistoria } from "../vistoria/roteiro";
import { calcularEncerramento, franquiaDoPeriodo, itensQuePioraram } from "./demonstrativo";

const base = {
  parametros: ref,
  devolucao: data("2026-07-21"), // 91 dias depois de 21/04
  kmEntrega: 50_000,
  caucaoLancada: 120_000,
  caucaoPaga: 120_000,
  saldoAberto: 0,
  outras: [],
};

describe("calcularEncerramento", () => {
  it("sem pendências, devolve a caução inteira em até 30 dias úteis", () => {
    const d = calcularEncerramento({ ...base, kmDevolucao: 60_000 });
    expect(d.dias).toBe(91);
    expect(d.franquiaKm).toBe(18_200);
    expect(d.kmExcedente).toBe(0);
    expect(d.devolverAoMotorista).toBe(120_000);
    expect(d.saldoFinal).toBe(0);
    expect(d.devolverAte).toBe("2026-09-01"); // 30 dias úteis, com o 7 de setembro fora da conta
  });

  it("km excedente e avaria saem da caução", () => {
    const d = calcularEncerramento({ ...base, kmDevolucao: 70_000, outras: [{ tipo: "avaria", descricao: "Para-choque riscado", valor: 30_000 }] });
    expect(d.kmExcedente).toBe(1_800);
    expect(d.pendencias[0]!.valor).toBe(1_800 * 47); // R$ 846,00
    expect(d.totalDevido).toBe(84_600 + 30_000);
    expect(d.devolverAoMotorista).toBe(120_000 - 114_600);
  });

  it("dívida maior que a caução fica como saldo devedor", () => {
    const d = calcularEncerramento({ ...base, kmDevolucao: 60_000, saldoAberto: 150_000 });
    expect(d.usoCaucao).toBe(120_000);
    expect(d.devolverAoMotorista).toBe(0);
    expect(d.saldoFinal).toBe(30_000);
  });

  it("caução lançada e não paga não vira dívida no encerramento", () => {
    // Segunda parcela lançada (R$ 600) e não paga: aparece no saldo, mas é estornada.
    const d = calcularEncerramento({ ...base, kmDevolucao: 60_000, caucaoPaga: 60_000, saldoAberto: 60_000 });
    expect(d.estornoCaucaoNaoPaga).toBe(60_000);
    expect(d.totalDevido).toBe(0);
    expect(d.devolverAoMotorista).toBe(60_000);
  });

  it("franquia proporcional aos dias", () => {
    expect(franquiaDoPeriodo(6000, 30)).toBe(6000);
    expect(franquiaDoPeriodo(6000, 45)).toBe(9000);
  });
});

describe("itensQuePioraram", () => {
  const c = (itens: ChecklistVistoria["itens"]): ChecklistVistoria => ({ fotos: {}, fotosExtras: [], itens });
  it("lista só o que estava OK na entrega e voltou pior", () => {
    const entrega = c([{ item: "lataria", estado: "ok" }, { item: "estepe", estado: "ausente", observacao: "sem estepe" }, { item: "pneus", estado: "ok" }]);
    const devolucao = c([{ item: "lataria", estado: "avaria", observacao: "risco na porta" }, { item: "estepe", estado: "ausente" }, { item: "pneus", estado: "ok" }]);
    expect(itensQuePioraram(entrega, devolucao)).toEqual([{ item: "lataria", rotulo: "Lataria e pintura", estado: "avaria", observacao: "risco na porta" }]);
  });
  it("avaria já existente com descrição nova entra como possível avaria nova", () => {
    const entrega = c([{ item: "lataria", estado: "avaria", observacao: "Risco na porta direita" }]);
    expect(itensQuePioraram(entrega, c([{ item: "lataria", estado: "avaria", observacao: "risco na porta  direita" }]))).toEqual([]);
    expect(itensQuePioraram(entrega, c([{ item: "lataria", estado: "avaria", observacao: "Amassado no capô" }]))).toEqual([
      { item: "lataria", rotulo: "Lataria e pintura", estado: "avaria", observacao: "Amassado no capô", antes: "Risco na porta direita" },
    ]);
  });
});
