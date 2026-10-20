import { describe, expect, it } from "vitest";
import { data } from "../datas/data";
import { type DadosCandidato, preAnalisar } from "./elegibilidade";

const base: DadosCandidato = {
  dataNascimento: data("1995-06-10"),
  cnhPrimeiraHabilitacao: data("2018-03-01"),
  cnhValidade: data("2030-01-01"),
  cnhTemEar: true,
  enviouComprovanteApp: true,
};
const hoje = data("2026-10-20");

describe("preAnalisar", () => {
  it("não aponta pendências para um candidato regular", () => {
    expect(preAnalisar(base, hoje)).toEqual([]);
  });

  it("completa 25 anos exatamente no aniversário", () => {
    expect(preAnalisar({ ...base, dataNascimento: data("2001-10-20") }, hoje)).toEqual([]);
    expect(preAnalisar({ ...base, dataNascimento: data("2001-10-21") }, hoje)).toEqual(["idade_minima"]);
  });

  it("aponta CNH recente, vencida e sem EAR", () => {
    expect(
      preAnalisar(
        { ...base, cnhPrimeiraHabilitacao: data("2024-01-01"), cnhValidade: data("2026-10-19"), cnhTemEar: false },
        hoje,
      ),
    ).toEqual(["tempo_de_cnh", "cnh_vencida", "cnh_sem_ear"]);
  });
});
