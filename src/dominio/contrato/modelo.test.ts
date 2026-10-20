import { describe, expect, it } from "vitest";
import { VariavelAusente, documentoEmTexto, letraAlinea, ordinalFeminino, renderizarModelo } from "./modelo";

const corpo = `
# CONTRATO DE TESTE
Entre {{locador}} e {{locatario}}.
## Do objeto
Texto livre da cláusula.
- Primeiro item, valor {{valor}}.
  - alínea um
  - alínea dois
- Segundo item.
## Do pagamento
- Item único.
`;

describe("renderizarModelo", () => {
  const doc = renderizarModelo(corpo, { locador: "Ana", locatario: "João", valor: "R$ 600,00" });

  it("numera cláusulas, itens e alíneas sem pular", () => {
    expect(doc.clausulas.map((c) => c.numero)).toEqual([1, 2]);
    expect(doc.clausulas[0]?.itens.map((i) => i.numero)).toEqual(["1.1", "1.2"]);
    expect(doc.clausulas[0]?.itens[0]?.alineas.map((a) => a.letra)).toEqual(["a", "b"]);
    expect(doc.clausulas[1]?.itens[0]?.numero).toBe("2.1");
  });

  it("substitui variáveis", () => {
    expect(doc.preambulo).toEqual(["Entre Ana e João."]);
    expect(documentoEmTexto(doc)).toContain("1.1. Primeiro item, valor R$ 600,00.");
    expect(documentoEmTexto(doc)).toContain("CLÁUSULA SEGUNDA – DO PAGAMENTO");
  });

  it("recusa variável sem valor", () => {
    expect(() => renderizarModelo(corpo, { locador: "Ana", locatario: "João" })).toThrow(VariavelAusente);
  });
});

describe("letraAlinea", () => {
  it("segue a…z e depois aa, bb", () => {
    expect([0, 1, 25, 26, 27, 52].map(letraAlinea)).toEqual(["a", "b", "z", "aa", "bb", "aaa"]);
  });
});

describe("ordinalFeminino", () => {
  it("escreve por extenso até 39", () => {
    expect([1, 10, 11, 13, 20, 21].map(ordinalFeminino)).toEqual([
      "PRIMEIRA", "DÉCIMA", "DÉCIMA PRIMEIRA", "DÉCIMA TERCEIRA", "VIGÉSIMA", "VIGÉSIMA PRIMEIRA",
    ]);
  });
});
