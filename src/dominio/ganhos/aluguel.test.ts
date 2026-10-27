import { describe, expect, it } from "vitest";
import { data } from "../datas/data";
import { cicloDoMes, custoParaSair, fimPrazoMinimo, kmDoCiclo, lembretesDoDia, normalizarAluguel, proximaVistoria, proximoPagamento, trocaDeOleo } from "./aluguel";

/** Condições de um contrato real de locadora: R$ 790/semana, 60 dias, 6.000 km/mês. */
const base = normalizarAluguel({
  locadora: "Locadora Teste",
  modelo: "Argo Drive 1.0",
  placa: "abc1d23",
  inicio: "2026-10-24",
  prazoMinimoDias: 60,
  valorSemanal: 79_000,
  multaRescisaoBps: 5_000,
  multaDescumprimento: 150_000,
  avisoSaidaDias: 7,
  kmLimiteMensal: 6_000,
  valorKmExcedente: 50,
  kmInicial: 20_000,
  caucao: 150_000,
  vistoriaCadaDias: 15,
  trocaOleoCadaKm: 10_000,
})!;

describe("aluguel fora do Aluguei", () => {
  it("normaliza e recusa sem o essencial", () => {
    expect(base.placa).toBe("ABC1D23");
    expect(base.devolucaoCaucaoDias).toBe(30);
    expect(normalizarAluguel({ locadora: "", inicio: "2026-10-24", valorSemanal: 1 })).toBeNull();
    expect(normalizarAluguel({ locadora: "X", inicio: "24/10/2026", valorSemanal: 1 })).toBeNull();
  });

  it("pagamento semanal no mesmo dia da semana do início", () => {
    expect(proximoPagamento(base, data("2026-10-20"))).toBe("2026-10-24");
    expect(proximoPagamento(base, data("2026-10-31"))).toBe("2026-10-31");
    expect(proximoPagamento(base, data("2026-11-01"))).toBe("2026-11-07");
  });

  it("vistoria a cada 15 dias desde a última", () => {
    expect(proximaVistoria(base)).toBe("2026-11-08");
    expect(proximaVistoria({ ...base, ultimaVistoria: data("2026-11-09") })).toBe("2026-11-24");
    expect(proximaVistoria({ ...base, vistoriaCadaDias: 0 })).toBeNull();
  });

  it("sair antes dos 60 dias custa 50% das semanas que faltam", () => {
    expect(fimPrazoMinimo(base)).toBe("2026-12-23");
    // 21/11 → 23/12: 32 dias = 5 semanas (a começada conta) × 790 × 50%.
    expect(custoParaSair(base, data("2026-11-21"))).toEqual({ multa: 197_500, semanasRestantes: 5, multaExtraPossivel: 150_000, dentroDoPrazo: true });
    expect(custoParaSair(base, data("2026-12-23")).multa).toBe(0);
  });

  it("ciclo mensal acompanha o dia do início, inclusive no fim do mês", () => {
    expect(cicloDoMes(base, data("2026-11-10"))).toEqual({ de: "2026-10-24", ate: "2026-11-23" });
    expect(cicloDoMes(base, data("2026-11-24"))).toEqual({ de: "2026-11-24", ate: "2026-12-23" });
    const dia31 = { ...base, inicio: data("2027-01-31") };
    expect(cicloDoMes(dia31, data("2027-03-01"))).toEqual({ de: "2027-02-28", ate: "2027-03-30" });
  });

  it("km do ciclo, projeção e custo do excedente", () => {
    const leituras = [{ dia: data("2026-11-02"), km: 23_000 }];
    const k = kmDoCiclo(base, leituras, data("2026-11-02"));
    // 3.000 km em 10 dias de um ciclo de 31: projeção 9.300, excedente 3.300 × R$ 0,50.
    expect(k).toMatchObject({ rodados: 3_000, projecao: 9_300, excedente: 0, custoExcedenteProjetado: 165_000, porDiaRestante: 136 });
    // No ciclo seguinte, a base é a última leitura do anterior.
    const k2 = kmDoCiclo(base, [...leituras, { dia: data("2026-11-23"), km: 26_000 }, { dia: data("2026-11-25"), km: 26_400 }], data("2026-11-25"));
    expect(k2).toMatchObject({ de: "2026-11-24", rodados: 400 });
  });

  it("troca de óleo pelo km da retirada ou da última troca", () => {
    expect(trocaDeOleo(base, 29_700)).toEqual({ proximaKm: 30_000, faltam: 300 });
    expect(trocaDeOleo({ ...base, ultimaTrocaOleoKm: 30_100 }, 31_000)).toEqual({ proximaKm: 40_100, faltam: 9_100 });
    expect(trocaDeOleo({ ...base, trocaOleoCadaKm: null }, 31_000)).toBeNull();
  });

  it("lembretes do dia com chave estável", () => {
    const chaves = (d: string, l = base.leituras) => lembretesDoDia(base, data(d), l).map((x) => x.chave);
    expect(chaves("2026-10-30")).toEqual(["pagamento:2026-10-31"]);
    expect(chaves("2026-11-07")).toEqual(["pagamento:2026-11-07", "vistoria:2026-11-08:1"]);
    expect(chaves("2026-11-10")).toContain("vistoria:2026-11-08:atrasada:2026-11-10");
    expect(chaves("2026-12-16")).toContain("prazo:2026-12-23:7");
    expect(chaves("2026-11-02", [{ dia: data("2026-11-02"), km: 29_800 }])).toEqual(expect.arrayContaining(["oleo:30000:perto", "km:2026-10-24:60"]));
  });

  it("depois da devolução só lembra da caução", () => {
    const devolvido = { ...base, devolucao: data("2027-01-05") };
    expect(lembretesDoDia(devolvido, data("2027-01-10"))).toEqual([]);
    expect(lembretesDoDia(devolvido, data("2027-02-04")).map((l) => l.chave)).toEqual(["caucao:2027-02-04"]);
  });
});
