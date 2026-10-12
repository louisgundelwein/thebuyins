import { describe, expect, it } from "vitest";
import { distributeDifference, settle, summarize, type PlayerResult } from "./settlement";

const result = (playerId: string, buyInCents: number, cashOutCents: number): PlayerResult => ({
  playerId,
  buyInCents,
  cashOutCents,
  netCents: cashOutCents - buyInCents,
});

describe("settle", () => {
  it("settles a two-player game with one transfer", () => {
    const { players, differenceCents } = summarize([
      { playerId: "ann", kind: "buy_in", amountCents: 1000 },
      { playerId: "ben", kind: "buy_in", amountCents: 1000 },
      { playerId: "ann", kind: "cash_out", amountCents: 1500 },
      { playerId: "ben", kind: "cash_out", amountCents: 500 },
    ]);

    expect(differenceCents).toBe(0);
    expect(players.map((p) => p.netCents)).toEqual([500, -500]);
    expect(settle(players)).toEqual([{ from: "ben", to: "ann", amountCents: 500 }]);
  });

  it("uses at most n-1 transfers and moves exactly the net amounts", () => {
    const players = [
      result("a", 0, 900),
      result("b", 0, 0),
      result("c", 1000, 200),
      result("d", 500, 0),
      result("e", 0, 400),
    ];
    const transfers = settle(players);

    expect(transfers.length).toBeLessThanOrEqual(players.length - 1);

    const balance = new Map(players.map((p) => [p.playerId, p.netCents]));
    for (const { from, to, amountCents } of transfers) {
      balance.set(from, (balance.get(from) ?? 0) + amountCents);
      balance.set(to, (balance.get(to) ?? 0) - amountCents);
    }
    expect([...balance.values()].every((b) => b === 0)).toBe(true);
  });

  it("throws when nets do not sum to zero", () => {
    expect(() => settle([result("a", 1000, 1500), result("b", 1000, 0)])).toThrow();
  });

  it("returns no transfers when everyone is at zero", () => {
    const players = [result("a", 1000, 1000), result("b", 0, 0)];
    expect(settle(players)).toEqual([]);
  });
});

describe("summarize", () => {
  it("accumulates rebuys into buy-ins", () => {
    const { players, potCents } = summarize([
      { playerId: "ann", kind: "buy_in", amountCents: 1000 },
      { playerId: "ann", kind: "buy_in", amountCents: 1000 },
      { playerId: "ann", kind: "cash_out", amountCents: 1500 },
    ]);

    expect(potCents).toBe(2000);
    expect(players).toEqual([result("ann", 2000, 1500)]);
  });
});

describe("distributeDifference", () => {
  it("splits a rounding remainder with largest remainder so shares are exact", () => {
    const players = [result("a", 0, 1), result("b", 0, 1), result("c", 0, 1)];
    const withNets = players.map((p, i) => ({ ...p, netCents: i < 2 ? 1 : 0 }));

    const adjusted = distributeDifference(withNets, 2);

    expect(adjusted.map((p) => p.netCents)).toEqual([0, 0, 0]);
    expect(adjusted.map((p) => p.cashOutCents)).toEqual([0, 0, 1]);
  });

  it("spreads the difference evenly when nobody cashed out", () => {
    const players = [result("a", 1000, 0), result("b", 1000, 0)];

    const adjusted = distributeDifference(players, -2000);

    expect(adjusted.map((p) => p.netCents)).toEqual([0, 0]);
    expect(adjusted.map((p) => p.cashOutCents)).toEqual([1000, 1000]);
  });
});
