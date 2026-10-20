import { describe, expect, it } from "vitest";
import { normalizarCidade, placaParcial } from "./cidade";

describe("normalizarCidade", () => {
  it.each([
    ["Sete Lagoas", "sete lagoas"],
    ["  São João   del-Rei ", "sao joao del-rei"],
    ["BELO HORIZONTE", "belo horizonte"],
    ["Itaúna", "itauna"],
  ])("%s → %s", (e, s) => expect(normalizarCidade(e)).toBe(s));
});

describe("placaParcial", () => {
  it("esconde os números", () => expect(placaParcial("RTA1B23")).toBe("RTA-****"));
});
