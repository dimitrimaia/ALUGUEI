import { describe, expect, it } from "vitest";
import { PARAMETROS_CONTRATO_REFERENCIA, type ParametrosContrato } from "../contrato/parametros";
import { data } from "../datas/data";
import { gerarAgenda } from "./gerar-agenda";

const ref = PARAMETROS_CONTRATO_REFERENCIA;

describe("gerarAgenda", () => {
  it("gera as obrigações do contrato analisado", () => {
    const agenda = gerarAgenda("c1", ref);
    const alugueis = agenda.filter((o) => o.tipo === "aluguel");
    const checkins = agenda.filter((o) => o.tipo === "checkin");

    expect(alugueis).toHaveLength(13);
    expect(alugueis[0]).toMatchObject({ vencimento: "2026-04-21", valor: 60000 });
    expect(alugueis[1]?.vencimento).toBe("2026-04-28");
    expect(alugueis.at(-1)?.vencimento).toBe("2026-07-14");
    expect(alugueis.every((o) => o.valor === 60000)).toBe(true);

    expect(checkins).toHaveLength(13);
    expect(checkins[0]?.vencimento).toBe("2026-04-27");

    expect(agenda.filter((o) => o.tipo === "caucao_parcela").map((o) => o.vencimento)).toEqual([
      "2026-04-21",
      "2026-05-10",
    ]);
  });

  it("não repete chaves", () => {
    const chaves = gerarAgenda("c1", ref).map((o) => o.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it("cobra proporcional quando o início não cai no dia de vencimento", () => {
    const p: ParametrosContrato = { ...ref, inicio: data("2026-04-23"), fim: data("2026-05-05") }; // quinta
    const alugueis = gerarAgenda("c1", p).filter((o) => o.tipo === "aluguel");
    expect(alugueis.map((o) => [o.vencimento, o.valor])).toEqual([
      ["2026-04-23", 42857], // 5 dias até terça 28/04
      ["2026-04-28", 60000],
    ]);
  });

  it("pode empurrar parcela da caução para o próximo dia útil", () => {
    const p: ParametrosContrato = { ...ref, vencimentoEmDiaNaoUtil: "proximo_dia_util" };
    const parcelas = gerarAgenda("c1", p).filter((o) => o.tipo === "caucao_parcela");
    expect(parcelas.map((o) => o.vencimento)).toEqual(["2026-04-22", "2026-05-11"]);
  });
});
