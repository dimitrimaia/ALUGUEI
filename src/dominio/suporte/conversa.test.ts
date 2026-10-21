import { describe, expect, it } from "vitest";
import { historicoParaModelo, humanoAssumiu } from "./conversa";

describe("historicoParaModelo", () => {
  it("junta mensagens seguidas e ignora avisos do sistema", () => {
    const h = historicoParaModelo([
      { autor: "usuario", texto: "Oi" },
      { autor: "usuario", texto: "Meu Pix não baixou" },
      { autor: "sistema", texto: "Recebemos a sua mensagem" },
      { autor: "agente", texto: "Vou verificar." },
      { autor: "equipe", texto: "Já resolvemos." },
      { autor: "usuario", texto: "Obrigado" },
    ]);
    expect(h).toEqual([
      { role: "user", content: "Oi\n\nMeu Pix não baixou" },
      { role: "assistant", content: "Vou verificar.\n\n[Resposta de uma pessoa da equipe] Já resolvemos." },
      { role: "user", content: "Obrigado" },
    ]);
  });
  it("sempre começa pela pessoa", () => {
    expect(historicoParaModelo([{ autor: "agente", texto: "Olá" }, { autor: "usuario", texto: "Oi" }])[0]!.role).toBe("user");
  });
});

describe("humanoAssumiu", () => {
  it("depois da equipe ou de uma transferência, o assistente para", () => {
    expect(humanoAssumiu([{ autor: "usuario", texto: "a" }, { autor: "agente", texto: "b" }])).toBe(false);
    expect(humanoAssumiu([{ autor: "equipe", texto: "b" }])).toBe(true);
    expect(humanoAssumiu([{ autor: "sistema", texto: "Transferido para a equipe: cobrança contestada." }])).toBe(true);
  });
});
