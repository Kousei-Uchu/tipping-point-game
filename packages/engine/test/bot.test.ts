import { describe, expect, it } from "vitest";
import { apply, chooseAction, createGame } from "../src";
import { C } from "./helpers";

/** Plays a whole table of bots. Fails if a bot ever picks an illegal action or a game does not finish. */
function botGame(seed: number, n: number, diff: "easy" | "normal" | "hard", level: "easy" | "normal" | "hard") {
  let s = createGame(C, {
    seed, difficulty: diff,
    players: Array.from({ length: n }, (_, i) => ({ id: `b${i}`, name: `B${i}`, isBot: true, botLevel: level })),
  }).state;
  for (let i = 0; i < 6000 && s.phase !== "over"; i++) {
    const who = s.players[s.pending ? s.pending.seat : s.activeSeat]!.id;
    const a = chooseAction(C, s, who);
    const r = apply(C, s, a, who);
    if (!r.ok) throw new Error(`seed ${seed}: bot chose ${JSON.stringify(a)} -> ${r.error}`);
    s = r.state;
  }
  return s;
}

describe("bots", () => {
  it("never choose an illegal action and always finish the game", () => {
    for (let g = 0; g < 60; g++) {
      const s = botGame(500 + g, 2 + (g % 4), (["easy", "normal", "hard"] as const)[g % 3]!, (["easy", "normal", "hard"] as const)[(g >> 1) % 3]!);
      expect(s.phase).toBe("over");
    }
  });
  it("are deterministic for the same state", () => {
    const s = createGame(C, { seed: 9, difficulty: "normal", players: [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "c", name: "C" }] }).state;
    expect(JSON.stringify(chooseAction(C, s))).toBe(JSON.stringify(chooseAction(C, s)));
  });
  it("expert bots win some Easy games (sanity, not a balance test)", () => {
    let wins = 0;
    for (let g = 0; g < 40; g++) if (botGame(900 + g, 3, "easy", "hard").result?.kind === "trophy") wins++;
    expect(wins).toBeGreaterThan(0);
  });
});
