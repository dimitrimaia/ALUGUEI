import { describe, expect, it } from "vitest";
import { contribuicaoMaxima, validarContribuicao } from "./carona";
import { avaliarCorrida } from "./corrida";
import { aluguelMensal, CRITERIOS_PADRAO, normalizarCriterios, normalizarPerfil, PERFIL_PADRAO, type PerfilCusto, taxas } from "./custos";
import { lerOferta } from "./oferta";
import { distanciaReta, estimarParticular, paraSlug, rotaEstimada, TABELA_PADRAO } from "./particular";
import { progressoMeta, resumir } from "./plantao";
import { calcularViagem, compararCombustivel } from "./viagem";

// Perfil redondo para conferir à mão: gasolina R$ 6,00 a 12 km/l = 50 c/km;
// desgaste R$ 1.000 a cada 10.000 km = 10 c/km; aluguel R$ 2.600/mês em 26 dias × 10 h = R$ 10/h.
const perfil: PerfilCusto = {
  combustivel: "gasolina",
  consumo: 12,
  precoCombustivel: 600,
  desgaste: [{ nome: "Manutenção", valor: 100000, cadaKm: 10000 }],
  fixosMensais: [{ nome: "Aluguel", valor: 260000 }],
  diasPorMes: 26,
  horasPorDia: 10,
};
const t = taxas(perfil);

describe("taxas", () => {
  it("custo por km e por hora", () => {
    expect(t.combustivelPorKm).toBe(50);
    expect(t.desgastePorKm).toBe(10);
    expect(t.variavelPorKm).toBe(60);
    expect(t.fixoPorHora).toBe(1000);
  });
  it("aluguel semanal vira mensal pela média de 52 semanas", () => {
    expect(aluguelMensal(60000)).toBe(260000);
  });
  it("normaliza o que vem do banco e volta ao padrão no inválido", () => {
    expect(normalizarPerfil(null)).toEqual(PERFIL_PADRAO);
    expect(normalizarPerfil({ ...perfil, consumo: "-3", combustivel: "agua" }).consumo).toBe(PERFIL_PADRAO.consumo);
    expect(normalizarPerfil({ ...perfil, consumo: "9.5" }).consumo).toBe(9.5);
  });
  it("critérios antigos ganham nota mínima e lista de lugares a evitar, sem repetir", () => {
    expect(normalizarCriterios({ minimoPorKm: 250 })).toMatchObject({ minimoPorKm: 250, notaMinima: 0, evitar: [] });
    expect(normalizarCriterios({ evitar: [" Morro  do Papagaio ", "Morro do Papagaio", "ab"] }).evitar).toEqual(["Morro do Papagaio"]);
  });
});

describe("semáforo da corrida", () => {
  it("corrida boa é verde, com custo e lucro certos", () => {
    // R$ 20 por 6 km de viagem + 1 km de busca, 15 + 3 min.
    const a = avaliarCorrida({ valor: 2000, kmCorrida: 6, minutosCorrida: 15, kmBusca: 1, minutosBusca: 3 }, t, CRITERIOS_PADRAO);
    expect(a.kmTotal).toBe(7);
    expect(a.minutosTotal).toBe(18);
    expect(a.porKm).toBe(286);
    expect(a.porHora).toBe(6667);
    expect(a.custo).toBe(7 * 60 + 300); // 420 de km + 18 min de R$ 10/h
    expect(a.lucro).toBe(2000 - 720);
    expect(a.sinal).toBe("verde");
  });
  it("um pouco abaixo do mínimo é amarelo; bem abaixo, vermelho", () => {
    const amarelo = avaliarCorrida({ valor: 1300, kmCorrida: 6, minutosCorrida: 12, kmBusca: 1, minutosBusca: 2 }, t, CRITERIOS_PADRAO);
    expect(amarelo.porKm).toBe(186);
    expect(amarelo.sinal).toBe("amarelo");
    const vermelho = avaliarCorrida({ valor: 900, kmCorrida: 6, minutosCorrida: 12, kmBusca: 1, minutosBusca: 2 }, t, CRITERIOS_PADRAO);
    expect(vermelho.sinal).toBe("vermelho");
  });
  it("busca longe pesa, e prejuízo é sempre vermelho", () => {
    expect(avaliarCorrida({ valor: 4000, kmCorrida: 10, minutosCorrida: 20, kmBusca: 5, minutosBusca: 6 }, t, CRITERIOS_PADRAO).motivos).toContain("Passageiro longe");
    expect(avaliarCorrida({ valor: 500, kmCorrida: 10, minutosCorrida: 20 }, t, { ...CRITERIOS_PADRAO, minimoPorKm: 0, minimoPorHora: 0 }).sinal).toBe("vermelho");
  });
  it("sem tempo, estima pela velocidade média e avisa", () => {
    const a = avaliarCorrida({ valor: 2000, kmCorrida: 8 }, t, CRITERIOS_PADRAO);
    expect(a.tempoEstimado).toBe(true);
    expect(a.minutosTotal).toBe(20);
  });
});

describe("leitura da oferta", () => {
  it("Uber: dois pares tempo (distância)", () => {
    expect(lerOferta("UberX R$ 18,40 ★4,93 8 min (2,3 km) de distância Rua A Viagem de 15 min (7,4 km) Rua B")).toEqual({
      valor: 1840, kmBusca: 2.3, minutosBusca: 8, kmCorrida: 7.4, minutosCorrida: 15, completa: true,
    });
  });
  it("99: distância antes do tempo", () => {
    const o = lerOferta("Pop R$ 12,50 1,2 km · 4 min até o passageiro 6,8 km · 17 min de viagem");
    expect(o).toMatchObject({ valor: 1250, kmBusca: 1.2, minutosBusca: 4, kmCorrida: 6.8, minutosCorrida: 17 });
  });
  it("busca em metros e valor com milhar", () => {
    expect(lerOferta("R$ 1.020,00 a 800 m Viagem 48 min (52,1 km)")).toMatchObject({ valor: 102000, kmBusca: 0.8, kmCorrida: 52.1, minutosCorrida: 48 });
  });
  it("sem valor ou sem distância, não lê", () => {
    expect(lerOferta("Você está online")).toBeNull();
    expect(lerOferta("R$ 20,00 ganhos hoje")).toBeNull();
  });
});

describe("calculadora de viagem", () => {
  it("ida e volta, extras, preço sugerido e margem", () => {
    const r = calcularViagem({ km: 100, idaEVolta: true, horas: 4, pedagios: 2000, alimentacao: 3000, hospedagem: 0, outros: 0, receita: 30000, margemDesejada: 3000 }, t);
    expect(r.kmTotal).toBe(200);
    expect(r.combustivel).toBe(10000);
    expect(r.desgaste).toBe(2000);
    expect(r.fixos).toBe(4000);
    expect(r.total).toBe(21000);
    expect(r.custoPorKm).toBe(105);
    expect(r.precoSugerido).toBe(30000); // 21.000 ÷ 0,7
    expect(r.lucro).toBe(9000);
    expect(r.margem).toBe(3000);
  });
  it("etanol × gasolina pelo consumo real", () => {
    const c = compararCombustivel({ preco: 420, consumo: 8 }, { preco: 620, consumo: 11.5 });
    expect(c.melhor).toBe("etanol"); // 52,5 c/km × 53,9 c/km
    expect(c.relacaoPreco).toBe(6774);
    expect(c.etanolCompensaAte).toBe(431);
  });
});

describe("plantão", () => {
  it("resume o dia com fixos proporcionais e combustível estimado", () => {
    const agora = new Date("2026-10-26T20:00:00-03:00");
    const r = resumir(
      [
        { plataforma: "uber", valor: 18000, corridas: 9, dia: "2026-10-26" },
        { plataforma: "99", valor: 9000, corridas: 5, dia: "2026-10-26" },
        { plataforma: "uber", valor: 3000, corridas: 2, dia: "2026-10-26" },
      ],
      [{ categoria: "alimentacao", valor: 2500, dia: "2026-10-26" }],
      [{ inicio: "2026-10-26T10:00:00-03:00", fim: null, kmRodados: 200 }],
      t,
      1,
      agora,
    );
    expect(r.bruto).toBe(30000);
    expect(r.corridas).toBe(16);
    expect(r.porPlataforma[0]).toEqual({ plataforma: "uber", valor: 21000, corridas: 11 });
    expect(r.horas).toBe(10);
    expect(r.fixosDoPeriodo).toBe(8667); // R$ 2.600 ÷ 30
    expect(r.combustivelEstimado).toBe(10000);
    expect(r.lucro).toBe(30000 - 2500 - 8667 - 10000);
    expect(r.porHora).toBe(3000);
    expect(r.porKm).toBe(150);
  });
  it("meta do dia no ritmo atual", () => {
    expect(progressoMeta(30000, 15000, 300)).toEqual({ falta: 15000, percentual: 50, batida: false, minutosRestantes: 300 });
    expect(progressoMeta(30000, 31000, 300).batida).toBe(true);
  });
});

describe("carona e clientes particulares", () => {
  it("contribuição máxima divide o custo por todos, sem lucro", () => {
    // 300 km × 60 c/km + R$ 40 de pedágio = R$ 220, para 4 pessoas = R$ 55
    expect(contribuicaoMaxima(t, 300, 4000, 3)).toBe(5500);
    expect(validarContribuicao(6000, 5500)).toMatch(/ninguém lucra/);
    expect(validarContribuicao(5000, 5500)).toBeNull();
  });
  it("preço particular com mínimo e arredondado no real", () => {
    expect(estimarParticular(10, 20, TABELA_PADRAO)).toBe(3600); // 5 + 25 + 6 = R$ 36
    expect(estimarParticular(1, 2, TABELA_PADRAO)).toBe(1500);
  });
  it("distância e rota de reserva", () => {
    const d = distanciaReta({ lat: -23.5505, lon: -46.6333 }, { lat: -22.9068, lon: -43.1729 });
    expect(Math.round(d)).toBe(361);
    expect(rotaEstimada(10)).toEqual({ km: 13.5, minutos: 32 });
  });
  it("link público", () => {
    expect(paraSlug("  João da Silva! ")).toBe("joao-da-silva");
  });
});
