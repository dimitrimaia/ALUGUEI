import { describe, expect, it } from "vitest";
import { PREFERENCIAS_PADRAO, iniciais, nomeDeExibicao, normalizarPreferencias } from "./preferencias";

describe("normalizarPreferencias", () => {
  it("sem nada salvo, usa o padrão (tema claro)", () => {
    expect(normalizarPreferencias(undefined)).toEqual(PREFERENCIAS_PADRAO);
    expect(normalizarPreferencias("lixo").tema).toBe("claro");
  });

  it("mantém o que é válido e ignora o resto", () => {
    const p = normalizarPreferencias({ tema: "escuro", canais: { whatsapp: false, sms: true }, assuntos: { novidades: "sim", mensagens: false } });
    expect(p.tema).toBe("escuro");
    expect(p.canais).toEqual({ whatsapp: false, email: true, push: true });
    expect(p.assuntos).toEqual({ lembretes: true, mensagens: false, novidades: false });
    expect("sms" in p.canais).toBe(false);
  });

  it("não deixa todos os canais desligados", () => {
    const p = normalizarPreferencias({ canais: { whatsapp: false, email: false, push: false } });
    expect(p.canais.email).toBe(true);
  });

  it("recusa tema desconhecido", () => {
    expect(normalizarPreferencias({ tema: "roxo" }).tema).toBe("claro");
  });
});

describe("nome e iniciais", () => {
  it("usa o nome informado, sem espaços sobrando", () => {
    expect(nomeDeExibicao("  João   da Silva ", "j@x.com", null)).toBe("João da Silva");
  });
  it("sem nome, usa o e-mail ou o final do celular", () => {
    expect(nomeDeExibicao("", "dimitri@exemplo.com", null)).toBe("dimitri");
    expect(nomeDeExibicao(undefined, null, "5537998293020")).toBe("Celular final 3020");
  });
  it("iniciais do primeiro e do último nome", () => {
    expect(iniciais("João da Silva")).toBe("JS");
    expect(iniciais("dimitri")).toBe("DI");
  });
});
