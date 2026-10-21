import { describe, expect, it } from "vitest";
import { cpfValido, renavamValido, formatarCpf, formatarPlaca, normalizarPlaca } from "./documentos";

describe("cpfValido", () => {
  it.each(["529.982.247-25", "52998224725", "111.444.777-35"])("aceita %s", (cpf) => {
    expect(cpfValido(cpf)).toBe(true);
  });
  it.each(["529.982.247-24", "111.111.111-11", "123"])("rejeita %s", (cpf) => {
    expect(cpfValido(cpf)).toBe(false);
  });
  it("formata", () => {
    expect(formatarCpf("52998224725")).toBe("529.982.247-25");
  });
});

describe("placa", () => {
  it("normaliza placa antiga e Mercosul", () => {
    expect(normalizarPlaca("abc-1234")).toBe("ABC1234");
    expect(normalizarPlaca("RTA 1B23")).toBe("RTA1B23");
    expect(normalizarPlaca("AB12345")).toBeNull();
  });
  it("formata a antiga com traço", () => {
    expect(formatarPlaca("ABC1234")).toBe("ABC-1234");
    expect(formatarPlaca("RTA1B23")).toBe("RTA1B23");
  });
});

describe("renavamValido", () => {
  it("aceita RENAVAM com dígito certo, com ou sem máscara", () => {
    expect(renavamValido("00639884962")).toBe(true);
    expect(renavamValido("639884962")).toBe(true); // 9 dígitos antigos
    expect(renavamValido("0063.988.496-2")).toBe(true);
  });
  it("recusa dígito errado, tamanho errado e repetidos", () => {
    expect(renavamValido("00639884963")).toBe(false);
    expect(renavamValido("1234")).toBe(false);
    expect(renavamValido("11111111111")).toBe(false);
  });
});
