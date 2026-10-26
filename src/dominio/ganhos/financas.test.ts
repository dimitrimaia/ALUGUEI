import { describe, expect, it } from "vitest";
import { data } from "../datas/data";
import { diaOperacional, diasDeTrabalho, FINANCAS_PADRAO, normalizarFinancas, progressoMetaMensal, sugestaoReserva } from "./financas";

describe("finanças", () => {
  it("configuração com padrão e dias sem repetir", () => {
    expect(normalizarFinancas(null)).toEqual(FINANCAS_PADRAO);
    expect(normalizarFinancas({ diasTrabalho: [5, 1, 1], virada: 4 })).toMatchObject({ diasTrabalho: [1, 5], virada: 4 });
    expect(normalizarFinancas({ virada: 3 }).virada).toBe(0);
  });
  it("virada às 4h: 2h da manhã ainda é o dia anterior", () => {
    const madrugada = new Date("2026-10-27T02:00:00-03:00");
    expect(diaOperacional(0, madrugada)).toBe("2026-10-27");
    expect(diaOperacional(4, madrugada)).toBe("2026-10-26");
  });
  it("dias de trabalho no período", () => {
    // 26/10/2026 é segunda; de segunda a domingo, trabalhando seg a sáb = 6
    expect(diasDeTrabalho(data("2026-10-26"), data("2026-11-01"), [1, 2, 3, 4, 5, 6])).toBe(6);
  });
  it("meta do mês e reserva", () => {
    expect(progressoMetaMensal(400000, 100000, 10)).toEqual({ falta: 300000, percentual: 25, batida: false, porDia: 30000 });
    expect(progressoMetaMensal(400000, 410000, 3).batida).toBe(true);
    expect(sugestaoReserva(15, 2000, 10000)).toEqual({ deveria: 30000, falta: 20000 });
  });
});
