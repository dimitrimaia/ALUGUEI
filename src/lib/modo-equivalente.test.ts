import { describe, expect, it } from "vitest";
import { telaNoOutroModo } from "./modo-equivalente";

describe("telaNoOutroModo", () => {
  it("mantém a tela equivalente", () => {
    expect(telaNoOutroModo("/m/conta", "locador")).toBe("/painel/conta");
    expect(telaNoOutroModo("/painel/conta/aparencia", "motorista")).toBe("/m/conta/aparencia");
    expect(telaNoOutroModo("/painel/conta/locadora", "motorista")).toBe("/m/conta");
    expect(telaNoOutroModo("/m/conversas/abc", "locador")).toBe("/painel/conversas");
    expect(telaNoOutroModo("/m/carros", "locador")).toBe("/painel/veiculos");
    expect(telaNoOutroModo("/painel/veiculos/123", "motorista")).toBe("/m/carros?aba=anunciados");
  });
  it("sem equivalente, vai para o início do modo", () => {
    expect(telaNoOutroModo("/m/extrato", "locador")).toBe("/painel");
    expect(telaNoOutroModo("/painel/financeiro", "motorista")).toBe("/m");
  });
});
