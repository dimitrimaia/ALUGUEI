import { describe, expect, it } from "vitest";
import { agregarLugares, chaveLugar, periodoDaHora } from "./comunidade";

describe("lugares da comunidade", () => {
  it("normaliza como a lista evitar", () => {
    expect(chaveLugar("  Vila  Nova Esperança ")).toBe("vila nova esperanca");
  });

  it("noite das 19h às 5h", () => {
    expect([4, 5, 18, 19, 23].map(periodoDaHora)).toEqual(["noite", "dia", "dia", "noite", "noite"]);
  });

  it("conta cada motorista uma vez e só mostra a partir do mínimo", () => {
    const l = agregarLugares([
      { usuario: "a", lugar: "Vila Nova Esperança", periodo: "noite" },
      { usuario: "a", lugar: "vila nova esperanca", periodo: "noite" },
      { usuario: "b", lugar: "Vila Nova Esperança", periodo: "sempre" },
      { usuario: "c", lugar: "Vila Nova Esperança", periodo: "noite" },
      { usuario: "d", lugar: "Centro", periodo: "dia" },
      { usuario: "e", lugar: "Centro", periodo: "dia" },
    ]);
    expect(l).toEqual([{ nome: "Vila Nova Esperança", dia: 1, noite: 3 }]);
    expect(agregarLugares([{ usuario: "d", lugar: "Centro", periodo: "dia" }], 1)).toEqual([{ nome: "Centro", dia: 1, noite: 0 }]);
  });
});
