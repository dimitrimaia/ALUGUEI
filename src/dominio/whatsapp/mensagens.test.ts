import { describe, expect, it } from "vitest";
import { dentroDaJanela, lerWebhook, paraWhatsApp, variantesTelefoneBR } from "./mensagens";

const webhook = {
  object: "whatsapp_business_account",
  entry: [{ changes: [{ field: "messages", value: {
    contacts: [{ wa_id: "553798293020", profile: { name: "João" } }],
    messages: [
      { id: "wamid.1", from: "553798293020", type: "text", timestamp: "1761000000", text: { body: " Meu Pix não baixou " } },
      { id: "wamid.2", from: "553798293020", type: "audio", timestamp: "1761000001" },
    ],
  } }] }],
};

describe("lerWebhook", () => {
  it("lê texto, nome e tipo; áudio vem sem texto", () => {
    expect(lerWebhook(webhook)).toEqual([
      { id: "wamid.1", de: "553798293020", nome: "João", tipo: "text", texto: "Meu Pix não baixou", enviadaEm: 1761000000 },
      { id: "wamid.2", de: "553798293020", nome: "João", tipo: "audio", texto: null, enviadaEm: 1761000001 },
    ]);
  });
  it("ignora avisos de entrega e outros objetos", () => {
    expect(lerWebhook({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { statuses: [{}] } }] }] })).toEqual([]);
    expect(lerWebhook({ object: "page" })).toEqual([]);
  });
});

describe("variantesTelefoneBR", () => {
  it("gera a forma com e sem o 9", () => {
    expect(variantesTelefoneBR("553798293020")).toEqual(["553798293020", "5537998293020"]);
    expect(variantesTelefoneBR("+55 37 99829-3020")).toEqual(["5537998293020", "553798293020"]);
    expect(variantesTelefoneBR("14155550123")).toEqual(["14155550123"]);
  });
});

describe("janela e formatação", () => {
  it("24 h desde a última mensagem da pessoa", () => {
    const agora = new Date("2026-10-21T12:00:00Z");
    expect(dentroDaJanela(new Date("2026-10-20T13:00:00Z"), agora)).toBe(true);
    expect(dentroDaJanela(new Date("2026-10-20T11:00:00Z"), agora)).toBe(false);
  });
  it("converte negrito e remove títulos", () => {
    expect(paraWhatsApp("## Pagamento\n**Pago** em [extrato](https://aluguei.xyz/m/extrato)")).toBe("Pagamento\n*Pago* em extrato: https://aluguei.xyz/m/extrato");
  });
});
