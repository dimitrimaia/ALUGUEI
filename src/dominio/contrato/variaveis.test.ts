import { describe, expect, it } from "vitest";
import { data } from "../datas/data";
import { MODELO_BASE } from "./modelo-base";
import { documentoEmTexto, renderizarModelo } from "./modelo";
import { PARAMETROS_CONTRATO_REFERENCIA } from "./parametros";
import { listaPtBr, percentualPorExtenso, variaveisDoContrato, type PartesContrato } from "./variaveis";

const partes: PartesContrato = {
  locador: { nome: "Locadora Exemplo", documento: "52998224725", cidade: "Sete Lagoas", uf: "MG" },
  locatario: { nome: "João da Silva", cpf: "11144477735", cnh: "12345678901", endereco: "Rua A, 10, Centro, Sete Lagoas/MG" },
  veiculo: { modelo: "Fiat Uno", placa: "RTA1B23", ano: "2021", cor: "branco", renavam: "", odometro: 84210 },
};

describe("contrato a partir do modelo-base", () => {
  const texto = documentoEmTexto(
    renderizarModelo(MODELO_BASE, variaveisDoContrato(PARAMETROS_CONTRATO_REFERENCIA, partes, data("2026-04-21"))),
  );

  it("escreve valor e extenso do mesmo número", () => {
    expect(texto).toContain("R$ 600,00 (seiscentos reais) por semana");
    expect(texto).toContain("caução de R$ 1.200,00 (mil e duzentos reais)");
    expect(texto).not.toContain("seiscentos e cinquenta");
  });

  it("usa o dia de vencimento coerente com o primeiro pagamento", () => {
    expect(texto).toContain("toda terça-feira");
    expect(texto).toContain("vence em 21/04/2026 (terça-feira)");
  });

  it("descreve prazos, franquia e encargos", () => {
    expect(texto).toContain("3 (três) meses, de 21/04/2026 a 21/07/2026");
    expect(texto).toContain("6.000 (seis mil) quilômetros por mês");
    expect(texto).toContain("multa de 5% (cinco por cento)");
    expect(texto).toContain("30 (trinta) dias úteis");
    expect(texto).toContain("CPF 529.982.247-25");
  });

  it("não tem cláusulas herdadas de contrato de empresa", () => {
    expect(texto).not.toMatch(/funcionários|minério|escolta/i);
  });
});

describe("formatação", () => {
  it("percentual", () => {
    expect(percentualPorExtenso(1000)).toBe("10% (dez por cento)");
    expect(percentualPorExtenso(250)).toBe("2,5%");
  });
  it("lista", () => {
    expect(listaPtBr(["a"])).toBe("a");
    expect(listaPtBr(["a", "b", "c"])).toBe("a; b e c");
  });
});
