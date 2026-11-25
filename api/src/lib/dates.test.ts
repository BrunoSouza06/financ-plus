import { describe, expect, it } from "vitest";
import { addMonth, dateFor, isRealDate, pendingOccurrences } from "./dates";

describe("isRealDate", () => {
  it("aceita datas que existem", () => {
    expect(isRealDate("2026-02-28")).toBe(true);
    expect(isRealDate("2028-02-29")).toBe(true);
  });

  it("recusa datas que não existem", () => {
    expect(isRealDate("2026-02-31")).toBe(false);
    expect(isRealDate("2026-02-29")).toBe(false);
    expect(isRealDate("2026-13-01")).toBe(false);
  });
});

describe("addMonth", () => {
  it("avança um mês", () => {
    expect(addMonth("2026-05")).toBe("2026-06");
  });

  it("vira o ano", () => {
    expect(addMonth("2026-12")).toBe("2027-01");
  });
});

describe("dateFor", () => {
  it("usa o dia pedido", () => {
    expect(dateFor("2026-11", 5)).toBe("2026-11-05");
  });

  it("ajusta o dia 31 para o último dia do mês", () => {
    expect(dateFor("2026-02", 31)).toBe("2026-02-28");
    expect(dateFor("2028-02", 31)).toBe("2028-02-29");
    expect(dateFor("2026-04", 31)).toBe("2026-04-30");
  });
});

describe("pendingOccurrences", () => {
  it("gera o mês atual quando o dia já passou", () => {
    expect(pendingOccurrences("2026-11", null, 1, "2026-11-24")).toEqual([
      { month: "2026-11", date: "2026-11-01" },
    ]);
  });

  it("gera no dia exato", () => {
    expect(pendingOccurrences("2026-11", null, 24, "2026-11-24")).toHaveLength(
      1,
    );
  });

  it("não gera quando o dia ainda não chegou", () => {
    expect(pendingOccurrences("2026-11", null, 25, "2026-11-24")).toEqual([]);
  });

  it("gera os meses retroativos desde o início", () => {
    const result = pendingOccurrences("2026-09", null, 10, "2026-11-24");
    expect(result.map((o) => o.date)).toEqual([
      "2026-09-10",
      "2026-10-10",
      "2026-11-10",
    ]);
  });

  it("continua a partir do último mês gerado", () => {
    const result = pendingOccurrences("2026-01", "2026-10", 10, "2026-11-24");
    expect(result.map((o) => o.month)).toEqual(["2026-11"]);
  });

  it("não gera nada quando já está em dia", () => {
    expect(pendingOccurrences("2026-01", "2026-11", 10, "2026-11-24")).toEqual(
      [],
    );
  });
});
