import { describe, expect, it } from "vitest";
import { avaliarCorrida, precoIdeal } from "./corrida";
import { bateLista, CRITERIOS_PADRAO, type Criterios, criteriosNoHorario, normalizarCriterios, type PerfilCusto, taxas } from "./custos";

// Mesmo perfil redondo de ganhos.test.ts: 60 c/km de variável e R$ 10/h de fixo.
const perfil: PerfilCusto = { combustivel: "gasolina", consumo: 12, precoCombustivel: 600, desgaste: [{ nome: "Manutenção", valor: 100000, cadaKm: 10000 }], fixosMensais: [{ nome: "Aluguel", valor: 260000 }], diasPorMes: 26, horasPorDia: 10 };
const t = taxas(perfil);
const c = (x: Partial<Criterios>): Criterios => ({ ...CRITERIOS_PADRAO, ...x });
// R$ 20, 6 km + 1 km de busca, 15 + 3 min: R$ 2,86/km, R$ 66,67/h, lucro R$ 12,80.
const base = { valor: 2000, kmCorrida: 6, minutosCorrida: 15, kmBusca: 1, minutosBusca: 3 };

describe("régua de duas faixas", () => {
  it("abaixo do mínimo é vermelho, entre o mínimo e o bom é amarelo, acima do bom é verde", () => {
    expect(avaliarCorrida(base, t, c({ minimoPorKm: 300, bomPorKm: 400 })).sinal).toBe("vermelho");
    expect(avaliarCorrida(base, t, c({ minimoPorKm: 250, bomPorKm: 300 })).sinal).toBe("amarelo");
    expect(avaliarCorrida(base, t, c({ minimoPorKm: 200, bomPorKm: 280 })).sinal).toBe("verde");
  });
  it("valor mínimo, lucro mínimo e margem", () => {
    expect(avaliarCorrida(base, t, c({ valorMinimo: 2500 })).motivos).toContain("Abaixo do seu valor mínimo");
    expect(avaliarCorrida(base, t, c({ lucroMinimo: 1500 })).sinal).toBe("amarelo");
    expect(avaliarCorrida(base, t, c({ lucroMinimoBps: 7000 })).motivos).toContain("Margem de lucro baixa"); // 64% < 70%
  });
  it("tempo de embarque, viagem longa, nota, passageiro novo e paradas", () => {
    expect(avaliarCorrida(base, t, c({ buscaMaximaMin: 2 })).sinal).toBe("amarelo");
    expect(avaliarCorrida(base, t, c({ buscaMaximaMin: 1 })).sinal).toBe("vermelho");
    expect(avaliarCorrida(base, t, c({ viagemMaximaKm: 5 })).motivos).toContain("Viagem longa");
    expect(avaliarCorrida({ ...base, nota: 4.3 }, t, c({ notaMinima: 4.5 })).motivos).toContain("Nota baixa");
    expect(avaliarCorrida({ ...base, corridasPassageiro: 2 }, t, c({ alertaPassageiroNovo: true })).motivos).toContain("Passageiro novo");
    expect(avaliarCorrida({ ...base, paradas: 1 }, t, c({ alertaParadas: true })).sinal).toBe("amarelo");
  });
  it("lugar evitado é vermelho; destino desejado é destaque", () => {
    const a = avaliarCorrida({ ...base, destino: "Rua F, 70 (Vila Nova Esperança, Contagem - MG)" }, t, c({ evitar: ["vila nova esperanca"], destinosDesejados: ["Contagem"] }));
    expect(a.sinal).toBe("vermelho");
    expect(a.motivos).toContain("Lugar que você evita: vila nova esperanca");
    expect(a.destaques).toEqual(["Destino desejado: Contagem"]);
  });
  it("a volta para a base entra no lucro só quando a régua conta a volta", () => {
    expect(avaliarCorrida({ ...base, kmVolta: 10, minutosVolta: 25 }, t, c({})).custoVolta).toBe(0);
    const a = avaliarCorrida({ ...base, kmVolta: 10, minutosVolta: 25 }, t, c({ contarVolta: true }));
    expect(a.custoVolta).toBe(600 + 417); // 10 km × 60 c + 25 min de R$ 10/h
    expect(a.lucro).toBe(2000 - 720 - 1017);
  });
});

describe("horário e listas", () => {
  const r = c({ porHorario: [{ nome: "Madrugada", de: "22:00", ate: "05:00", minimoPorKm: 300, minimoPorHora: 5000, bomPorKm: 0, bomPorHora: 0 }] });
  it("faixa que vira a meia-noite", () => {
    expect(criteriosNoHorario(r, 23 * 60).faixa).toBe("Madrugada");
    expect(criteriosNoHorario(r, 3 * 60).minimoPorKm).toBe(300);
    expect(criteriosNoHorario(r, 12 * 60).faixa).toBeNull();
  });
  it("lista sem acento e sem maiúscula", () => {
    expect(bateLista("Morro do PAPAGAIO, BH", ["morro do papagaio"])).toBe("morro do papagaio");
    expect(bateLista(null, ["x"])).toBeNull();
  });
  it("critérios antigos continuam valendo", () => {
    expect(normalizarCriterios({ minimoPorKm: 250, minimoPorHora: 4500, buscaMaximaKm: 3 })).toMatchObject({ minimoPorKm: 250, bomPorKm: 0, porHorario: [], contarVolta: false });
  });
});

describe("contraproposta", () => {
  it("menor valor em reais que fica verde, até o dobro", () => {
    const regua = c({ minimoPorKm: 300 });
    const ideal = precoIdeal(base, t, regua);
    expect(ideal).toBe(2100); // R$ 21 / 7 km = R$ 3,00/km
    expect(precoIdeal(base, t, c({ minimoPorKm: 700 }))).toBeNull(); // nem R$ 40 dá R$ 7/km
    expect(precoIdeal(base, t, c({}))).toBe(2000); // já é verde
  });
});

import { montarMensagem, normalizarPreferenciasCopiloto, PREFERENCIAS_PADRAO } from "./copiloto";
describe("preferências do Copiloto", () => {
  it("padrão, campos sem repetir e limites", () => {
    expect(normalizarPreferenciasCopiloto(null)).toEqual(PREFERENCIAS_PADRAO);
    const p = normalizarPreferenciasCopiloto({ campos: ["lucro", "lucro", "porKm", "x"], segundosCartao: 999 });
    expect(p.campos).toEqual(PREFERENCIAS_PADRAO.campos); // campo inválido: volta ao padrão
    expect(p.segundosCartao).toBe(12);
    expect(normalizarPreferenciasCopiloto({ campos: ["lucro", "lucro", "porKm"] }).campos).toEqual(["lucro", "porKm"]);
  });
  it("mensagem pronta para o passageiro", () => {
    expect(montarMensagem("{saudacao}, {nome}! Chego em {tempo}.", { hora: 15, nome: "Filipe", minutos: 4 })).toBe("Boa tarde, Filipe! Chego em 4 min.");
    expect(montarMensagem("{saudacao}, {nome}! Chego em {tempo}.", { hora: 2 })).toBe("Boa noite, tudo bem? Chego em poucos minutos.");
  });
});
