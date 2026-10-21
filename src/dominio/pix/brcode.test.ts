import { describe, expect, it } from "vitest";
import { chaveDeCelular, crc16, gerarBRCode, normalizarChavePix } from "./brcode";

describe("gerarBRCode", () => {
  it("reproduz o exemplo do manual do Banco Central", () => {
    const codigo = gerarBRCode({ chave: "123e4567-e12b-12d1-a456-426655440000", nome: "Fulano de Tal", cidade: "BRASILIA" });
    expect(codigo).toBe("00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D");
  });

  it("inclui valor e identificador, e o CRC confere", () => {
    const codigo = gerarBRCode({ chave: "+5537998293020", nome: "João da Silva Locações Ltda ME", cidade: "Sete Lagoas", valorCentavos: 60000, txid: "ALG-7f3a-2026" });
    expect(codigo).toContain("5406600.00");
    expect(codigo).toContain("5925Joao da Silva Locacoes L");
    expect(codigo).toContain("6011Sete Lagoas");
    expect(codigo).toContain("0511ALG7f3a2026");
    expect(codigo.slice(-4)).toBe(crc16(codigo.slice(0, -4)));
  });
});

describe("normalizarChavePix", () => {
  it("reconhece os tipos de chave", () => {
    expect(normalizarChavePix("Dimitri@Exemplo.com")).toEqual({ chave: "dimitri@exemplo.com", tipo: "email" });
    expect(normalizarChavePix("123.456.789-09")).toEqual({ chave: "12345678909", tipo: "cpf" });
    expect(normalizarChavePix("12.345.678/0001-95")).toEqual({ chave: "12345678000195", tipo: "cnpj" });
    expect(normalizarChavePix("+55 37 99829-3020")).toEqual({ chave: "+5537998293020", tipo: "celular" });
    expect(normalizarChavePix("123E4567-E12B-12D1-A456-426655440000")?.tipo).toBe("aleatoria");
  });
  it("recusa o que não é chave", () => {
    expect(normalizarChavePix("abc")).toBeNull();
    expect(normalizarChavePix("123")).toBeNull();
  });
  it("monta a chave de celular", () => {
    expect(chaveDeCelular("(37) 99829-3020")).toBe("+5537998293020");
  });
});
