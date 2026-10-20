import { describe, expect, it } from "vitest";
import { arredondar, centavos, deReais, percentual } from "./centavos";

describe("centavos", () => {
  it("rejeita valores fracionados", () => {
    expect(() => centavos(10.5)).toThrow();
  });

  it("converte reais sem erro de ponto flutuante", () => {
    expect(deReais(0.47)).toBe(47);
    expect(deReais(1200)).toBe(120000);
  });

  it("arredonda meio para cima, simétrico para negativos", () => {
    expect(arredondar(2.5)).toBe(3);
    expect(arredondar(-2.5)).toBe(-3);
    expect(arredondar(2.49)).toBe(2);
  });

  it("aplica percentual em bps", () => {
    expect(percentual(60000, 500)).toBe(3000); // multa de 5% sobre R$ 600
    expect(percentual(12345, 1000)).toBe(1235); // 10% de R$ 123,45, arredondado
  });
});
