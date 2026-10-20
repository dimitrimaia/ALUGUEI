import { describe, expect, it } from "vitest";
import { type ChecklistVistoria, FOTOS_VISTORIA, ITENS_CHECKLIST, combustivelPorExtenso, faltando } from "./roteiro";

const completo: ChecklistVistoria = {
  fotos: Object.fromEntries(FOTOS_VISTORIA.map((f) => [f.id, `ev-${f.id}`])),
  fotosExtras: [],
  itens: ITENS_CHECKLIST.map((i) => ({ item: i.id, estado: "ok" as const })),
};

describe("faltando", () => {
  it("vistoria completa não tem pendência", () => {
    expect(faltando(completo)).toEqual({ fotos: [], itens: [], observacoesObrigatorias: [] });
  });

  it("aponta foto, item e avaria sem descrição", () => {
    const c: ChecklistVistoria = {
      ...completo,
      fotos: { ...completo.fotos, painel: undefined },
      itens: [...completo.itens.filter((i) => i.item !== "chave" && i.item !== "lataria"), { item: "lataria", estado: "avaria" }],
    };
    expect(faltando(c)).toEqual({ fotos: ["painel"], itens: ["chave"], observacoesObrigatorias: ["lataria"] });
  });
});

describe("combustivelPorExtenso", () => {
  it.each([[0, "Reserva"], [2, "1/4"], [4, "1/2"], [5, "5/8"], [8, "Cheio"]])("%i → %s", (o, t) => {
    expect(combustivelPorExtenso(o)).toBe(t);
  });
});
