import { describe, expect, it } from "vitest";
import { clampStart, drawLots, lotsPath, nextSeatKind, seatLabel, type SeatKind } from "../src/core/lobby";

describe("setup mat helpers", () => {
  it("cycles Human, Easy, Normal, Hard, Human", () => {
    let k: SeatKind = null;
    const seen: SeatKind[] = [];
    for (let i = 0; i < 5; i++) { seen.push(k); k = nextSeatKind(k); }
    expect(seen).toEqual([null, "easy", "normal", "hard", null]);
  });

  it("labels seats in words", () => {
    expect(seatLabel(null)).toBe("Human");
    expect(seatLabel("hard")).toBe("Bot, hard");
  });

  it("draws every seat evenly and never out of range", () => {
    for (const seats of [2, 3, 4, 5]) {
      expect(drawLots(seats, () => 0)).toBe(0);
      expect(drawLots(seats, () => 0.999999)).toBe(seats - 1);
      expect(drawLots(seats, () => 1)).toBe(seats - 1);
      const counts = new Array(seats).fill(0) as number[];
      for (let i = 0; i < seats * 100; i++) counts[drawLots(seats, () => (i % (seats * 100)) / (seats * 100))]!++;
      for (const c of counts) expect(c).toBe(100);
    }
  });

  it("the lots marker goes round and always stops on the winner", () => {
    for (const seats of [2, 3, 5]) for (let w = 0; w < seats; w++) {
      const p = lotsPath(seats, w, 1);
      expect(p[p.length - 1]).toBe(w);
      expect(p.every((x) => x >= 0 && x < seats)).toBe(true);
      expect(p.length).toBe(seats + w + 1);
    }
  });

  it("keeps the first-player marker on a real seat", () => {
    expect(clampStart(4, 3)).toBe(2);
    expect(clampStart(-1, 3)).toBe(0);
    expect(clampStart(1, 3)).toBe(1);
  });
});
