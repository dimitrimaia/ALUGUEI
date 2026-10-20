import { describe, expect, it } from "vitest";
import { ehDiaUtil, pascoa, somarDiasUteis } from "./calendario";
import { data, diaDaSemana, hoje, mesesEntre, proximoDiaDaSemana, somarMeses } from "./data";

describe("data", () => {
  it("rejeita datas inexistentes", () => {
    expect(() => data("2026-02-30")).toThrow();
  });

  it("confere as datas do contrato analisado", () => {
    expect(diaDaSemana(data("2026-04-21"))).toBe(2); // início: terça (e feriado de Tiradentes)
    expect(diaDaSemana(data("2026-04-28"))).toBe(2); // "próximo pagamento 28/04": terça, bate com a 3.1
    expect(diaDaSemana(data("2026-05-10"))).toBe(0); // 2ª parcela da caução: domingo
  });

  it("acha o próximo dia da semana", () => {
    expect(proximoDiaDaSemana(data("2026-04-21"), 1)).toBe("2026-04-27");
    expect(proximoDiaDaSemana(data("2026-04-27"), 1)).toBe("2026-04-27");
  });

  it("soma meses sem pular para o mês seguinte", () => {
    expect(somarMeses(data("2026-01-31"), 1)).toBe("2026-02-28");
    expect(somarMeses(data("2026-04-21"), 3)).toBe("2026-07-21");
  });

  it("usa a data civil de São Paulo", () => {
    // 02:00 UTC de 21/04 ainda é 20/04 em São Paulo.
    expect(hoje(new Date("2026-04-21T02:00:00Z"))).toBe("2026-04-20");
  });
});

describe("calendário", () => {
  it("calcula a Páscoa", () => {
    expect(pascoa(2026)).toBe("2026-04-05");
    expect(pascoa(2027)).toBe("2027-03-28");
  });

  it("considera feriados nacionais", () => {
    expect(ehDiaUtil(data("2026-04-21"))).toBe(false); // Tiradentes
    expect(ehDiaUtil(data("2026-04-03"))).toBe(false); // Sexta-feira Santa
    expect(ehDiaUtil(data("2026-11-20"))).toBe(false); // Consciência Negra
    expect(ehDiaUtil(data("2026-02-16"))).toBe(true);
    expect(ehDiaUtil(data("2026-02-16"), { incluirBancarios: true })).toBe(false); // Carnaval
  });

  it("conta dias úteis pulando fim de semana e feriado", () => {
    // Sexta 30/10/2026 + 2 úteis: pula fim de semana e Finados (02/11).
    expect(somarDiasUteis(data("2026-10-30"), 2)).toBe("2026-11-04");
  });
});

describe("mesesEntre", () => {
  it("conta meses inteiros", () => {
    expect(mesesEntre(data("2026-04-21"), data("2026-07-21"))).toBe(3);
    expect(mesesEntre(data("2026-04-21"), data("2026-07-20"))).toBe(2);
    expect(mesesEntre(data("2026-01-31"), data("2026-02-28"))).toBe(1);
  });
});
