import { describe, expect, it } from "vitest";
import { normalizarCelular } from "./telefone";

describe("normalizarCelular", () => {
  it.each([
    ["(31) 99876-5432", "+5531998765432"],
    ["31998765432", "+5531998765432"],
    ["+55 31 99876-5432", "+5531998765432"],
    ["031998765432", "+5531998765432"],
  ])("%s → %s", (entrada, esperado) => {
    expect(normalizarCelular(entrada)).toBe(esperado);
  });

  it.each(["3133334444", "(31) 8876-5432", "12345", "(01) 99876-5432"])("rejeita %s", (entrada) => {
    expect(normalizarCelular(entrada)).toBeNull();
  });
});
