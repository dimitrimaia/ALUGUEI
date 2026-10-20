import { describe, expect, it } from "vitest";
import { data } from "../datas/data";
import { calcularEncargos } from "./encargos";
import { PARAMETROS_CONTRATO_REFERENCIA } from "./parametros";

const { encargos } = PARAMETROS_CONTRATO_REFERENCIA;

describe("calcularEncargos", () => {
  it("não cobra nada quando pago em dia ou adiantado", () => {
    expect(calcularEncargos(60000, data("2026-04-28"), data("2026-04-28"), encargos).total).toBe(0);
    expect(calcularEncargos(60000, data("2026-04-28"), data("2026-04-27"), encargos).total).toBe(0);
  });

  it("cobra multa de 5% e juros de 1% a.m. pro rata", () => {
    const r = calcularEncargos(60000, data("2026-04-28"), data("2026-05-08"), encargos);
    expect(r).toEqual({ diasAtraso: 10, multa: 3000, juros: 200, total: 3200 });
  });

  it("arredonda juros para o centavo", () => {
    // 600,00 × 1% × 1/30 = 0,20; 333,33 × 1% × 1/30 = 0,1111 → 0,11
    expect(calcularEncargos(33333, data("2026-04-28"), data("2026-04-29"), encargos).juros).toBe(11);
  });
});
