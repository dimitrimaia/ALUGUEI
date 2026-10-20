import { describe, expect, it } from "vitest";
import { gerarAgenda } from "../agenda/gerar-agenda";
import { PARAMETROS_CONTRATO_REFERENCIA } from "../contrato/parametros";
import { diasEntre } from "../datas/data";
import { taxaPlataformaDoPeriodo } from "./taxa";

describe("taxaPlataformaDoPeriodo", () => {
  it("cobra R$ 57,53 numa semana cheia com mensalidade de R$ 250", () => {
    expect(taxaPlataformaDoPeriodo(25000, 7)).toBe(5753);
  });

  it("é proporcional em semana incompleta e zero sem dias", () => {
    expect(taxaPlataformaDoPeriodo(25000, 5)).toBe(4110);
    expect(taxaPlataformaDoPeriodo(25000, 0)).toBe(0);
  });

  it("soma cerca de 3 meses de mensalidade no contrato de referência", () => {
    const total = gerarAgenda("c1", PARAMETROS_CONTRATO_REFERENCIA)
      .filter((o) => o.tipo === "aluguel" && o.periodo)
      .reduce((s, o) => s + taxaPlataformaDoPeriodo(25000, diasEntre(o.periodo!.inicio, o.periodo!.fim)), 0);
    expect(total).toBe(13 * 5753); // 91 dias ≈ R$ 747,89, perto de 3 × R$ 250
  });
});
