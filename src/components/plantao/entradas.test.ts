import { describe, expect, it } from "vitest";
import { lerNumero } from "./entradas";

describe("lerNumero", () => {
  it("entende milhar com ponto e decimal com vírgula ou ponto", () => {
    expect(lerNumero("1.200")).toBe(1200);
    expect(lerNumero("10.000")).toBe(10000);
    expect(lerNumero("9,5")).toBe(9.5);
    expect(lerNumero("9.5")).toBe(9.5);
    expect(lerNumero("1.234,5")).toBe(1234.5);
    expect(lerNumero("")).toBeNull();
    expect(lerNumero("abc")).toBeNull();
  });
});
