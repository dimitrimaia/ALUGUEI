import { describe, expect, it } from "vitest";
import { data } from "../datas/data";
import { conferirKm, diasDeAtraso, faltandoNoCheckin, situacaoCheckin } from "./checkin";

describe("situacaoCheckin", () => {
  const venc = data("2026-10-26"); // segunda
  it("abre na véspera e no dia", () => {
    expect(situacaoCheckin(venc, data("2026-10-24"), false)).toBe("futuro");
    expect(situacaoCheckin(venc, data("2026-10-25"), false)).toBe("aberto");
    expect(situacaoCheckin(venc, data("2026-10-26"), false)).toBe("aberto");
  });
  it("depois do dia fica atrasado, e conta os dias", () => {
    expect(situacaoCheckin(venc, data("2026-10-27"), false)).toBe("atrasado");
    expect(diasDeAtraso(venc, data("2026-10-31"))).toBe(5);
    expect(diasDeAtraso(venc, data("2026-10-20"))).toBe(0);
  });
  it("feito é feito, em qualquer dia", () => {
    expect(situacaoCheckin(venc, data("2026-11-10"), true)).toBe("feito");
  });
});

describe("conferirKm", () => {
  it("recusa km menor que o último ou vazio", () => {
    expect(conferirKm(41000, 41200).ok).toBe(false);
    expect(conferirKm(0, 0).ok).toBe(false);
  });
  it("aceita e alerta salto grande", () => {
    expect(conferirKm(42100, 41200)).toEqual({ ok: true });
    const r = conferirKm(48000, 41200);
    expect(r.ok && r.alerta).toBeTruthy();
  });
});

describe("faltandoNoCheckin", () => {
  it("lista o que falta enviar", () => {
    expect(faltandoNoCheckin({ painel: "a", video: "b" })).toEqual(["oleo", "arrefecimento"]);
    expect(faltandoNoCheckin({ painel: "a", oleo: "b", arrefecimento: "c", video: "d" })).toEqual([]);
  });
});
