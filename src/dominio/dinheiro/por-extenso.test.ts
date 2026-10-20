import { describe, expect, it } from "vitest";
import { reaisPorExtenso } from "./por-extenso";

describe("reaisPorExtenso", () => {
  it.each([
    [60000, "seiscentos reais"],
    [65000, "seiscentos e cinquenta reais"],
    [120000, "mil e duzentos reais"],
    [500000, "cinco mil reais"],
    [47, "quarenta e sete centavos"],
    [100, "um real"],
    [101, "um real e um centavo"],
    [10000, "cem reais"],
    [10100, "cento e um reais"],
    [123456, "mil duzentos e trinta e quatro reais e cinquenta e seis centavos"],
    [100005000, "um milhão e cinquenta reais"],
    [105000000, "um milhão e cinquenta mil reais"],
    [100000000, "um milhão de reais"],
    [250000000, "dois milhões e quinhentos mil reais"],
    [0, "zero real"],
  ])("%i centavos → %s", (valor, esperado) => {
    expect(reaisPorExtenso(valor)).toBe(esperado);
  });
});
