import { describe, expect, it } from "vitest";
import { PARAMETROS_CONTRATO_REFERENCIA } from "../contrato/parametros";
import { data } from "../datas/data";
import { saldo, separarEncargos, situacao } from "./extrato";

const enc = PARAMETROS_CONTRATO_REFERENCIA.encargos;
const hoje = data("2026-10-20");

describe("situacao", () => {
  it.each([
    [{ vencimento: data("2026-10-19"), status: "pendente" }, "atrasada"],
    [{ vencimento: data("2026-10-20"), status: "pendente" }, "vence_hoje"],
    [{ vencimento: data("2026-10-27"), status: "pendente" }, "a_vencer"],
    [{ vencimento: data("2026-10-01"), status: "cumprida" }, "paga"],
  ] as const)("%o → %s", (o, esperado) => {
    expect(situacao(o, hoje)).toBe(esperado);
  });
});

describe("separarEncargos", () => {
  it("separa multa de 5% e juros pro rata", () => {
    // R$ 600 pagos 10 dias depois: 30,00 de multa + 2,00 de juros = 632,00
    expect(separarEncargos(60000, 63200, data("2026-10-20"), data("2026-10-30"), enc)).toEqual({ multa: 3000, juros: 200 });
  });

  it("pagamento em dia não tem encargos", () => {
    expect(separarEncargos(60000, 60000, data("2026-10-20"), data("2026-10-20"), enc)).toEqual({ multa: 0, juros: 0 });
  });

  it("multa nunca passa do excedente", () => {
    expect(separarEncargos(60000, 61000, data("2026-10-20"), data("2026-10-25"), enc)).toEqual({ multa: 1000, juros: 0 });
  });
});

describe("saldo", () => {
  it("soma débitos e créditos", () => {
    expect(saldo([{ valor: 60000 }, { valor: 60000 }, { valor: -60000 }])).toBe(60000);
  });
});
