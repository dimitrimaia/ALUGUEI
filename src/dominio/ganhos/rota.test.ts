import { describe, expect, it } from "vitest";
import { distanciaARota, lerPreco, pracasNaRota } from "./rota";

// Uma reta BH → oeste (≈ 0,1° de longitude ≈ 10,5 km).
const linha = [{ lat: -19.92, lon: -43.94 }, { lat: -19.92, lon: -44.04 }, { lat: -19.92, lon: -44.14 }];

describe("rota", () => {
  it("distância de um ponto à rota", () => {
    expect(distanciaARota({ lat: -19.921, lon: -44.0 }, linha).metros).toBeCloseTo(110.6, 0);
    expect(distanciaARota({ lat: -19.92, lon: -44.1 }, linha).trecho).toBe(1);
  });

  it("praças no caminho, em ordem, juntando cabines da mesma praça", () => {
    const pracas = [
      { nome: "Praça 2", lat: -19.92, lon: -44.1, preco: null },
      { nome: "Praça 1", lat: -19.9201, lon: -44.0, preco: null },
      { nome: "Praça 1 (sentido BH)", lat: -19.9198, lon: -44.003, preco: 640 },
      { nome: "Longe", lat: -19.8, lon: -44.0, preco: 500 },
    ];
    expect(pracasNaRota(linha, pracas)).toEqual([
      { nome: "Praça 1", lat: -19.9201, lon: -44.0, preco: 640 },
      { nome: "Praça 2", lat: -19.92, lon: -44.1, preco: null },
    ]);
  });

  it("lê o preço do mapa", () => {
    expect(lerPreco("6.40 BRL")).toBe(640);
    expect(lerPreco("R$ 12,8")).toBe(1280);
    expect(lerPreco("7")).toBe(700);
    expect(lerPreco("2 USD")).toBeNull();
    expect(lerPreco(undefined)).toBeNull();
  });
});
