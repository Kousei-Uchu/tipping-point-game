import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../src/core/settings";
import { advance, afterAway, autoMs, isSurgeBeat, leave, metreDisplay, phaseAtLeast, phaseMs, phasesFor, pulsingBiome, settle, startReveal, type Phase, type RevealState } from "../src/core/revealPlan";

const ravage = { type: "ravage", biome: "forest", id: "R", name: "x" } as any;
const tool = { type: "tool", biome: "forest", id: "T", name: "x" } as any;
const step = (o: any = {}) => ({ card: ravage, called: [1, 2, 3], outcomes: [], surge: "none", cascade: [], extinct: [], metreMoves: [], evacuated: [], ...o }) as any;
const story = (...steps: any[]) => ({ steps, trophy: false, gameOver: false }) as any;
const fast = { ...DEFAULT_SETTINGS, fastAnimations: true };
const reduced = { ...DEFAULT_SETTINGS, reducedMotion: true };
const surge = () => step({ surge: "fired", metreMoves: [{ from: 12, to: 20, why: "surge" }] });

/** Plays a story with no skipping and returns the phases visited. */
function run(s0: any, settings = DEFAULT_SETTINGS) {
  const st = story(s0);
  let s: RevealState = startReveal();
  const seen: Phase[] = [s.phase];
  for (let n = 0; n < 60 && s.phase !== "rest"; n++) { s = advance(st, s, settings); if (seen[seen.length - 1] !== s.phase) seen.push(s.phase); }
  return { seen, s };
}

describe("which beats a card plays", () => {
  it("a Surge Ravage plays all five parts of the plan, then waits, then leaves", () => {
    expect(phasesFor(surge())).toEqual(["draw", "read", "dock", "pulse", "tiles", "beat", "metre", "rest", "away"]);
  });
  it("a plain Ravage has no Metre beats", () => { expect(phasesFor(step())).toEqual(["draw", "read", "dock", "pulse", "tiles", "rest", "away"]); });
  it("an extinct biome calls nothing, so there is nothing to pulse or stamp", () => { expect(phasesFor(step({ called: [] }))).toEqual(["draw", "read", "dock", "rest", "away"]); });
  it("a Tool card is drawn and read, with no tiles", () => { expect(phasesFor(step({ card: tool, called: [] }))).toEqual(["draw", "read", "dock", "rest", "away"]); });
  it("a Cascade or extinction moves the Metre even if no move was recorded", () => {
    expect(phasesFor(step({ cascade: ["forest"] }))).toContain("metre");
    expect(phasesFor(step({ extinct: ["forest"], called: [] }))).toContain("metre");
  });
});

describe("the beats play in order and stop at rest", () => {
  it("visits every beat once, in the plan's order", () => { expect(run(surge()).seen).toEqual(["draw", "read", "dock", "pulse", "tiles", "beat", "metre", "rest"]); });
  it("stamps tiles one at a time, starting with the first as the tiles beat opens", () => {
    const st = story(surge());
    let s = advance(st, advance(st, advance(st, advance(st, startReveal(), DEFAULT_SETTINGS), DEFAULT_SETTINGS), DEFAULT_SETTINGS), DEFAULT_SETTINGS); // draw, read, dock, pulse
    expect(s.phase).toBe("tiles");
    expect(s.shown).toBe(1);
    s = advance(st, s, DEFAULT_SETTINGS); expect(s.shown).toBe(2);
    s = advance(st, s, DEFAULT_SETTINGS); expect(s.shown).toBe(3);
    s = advance(st, s, DEFAULT_SETTINGS); expect(s.phase).toBe("beat");
    expect(s.shown).toBe(3);
  });
  it("rest and away do not advance on their own", () => {
    const st = story(step());
    const r: RevealState = { step: 0, phase: "rest", shown: 3 };
    expect(advance(st, r, DEFAULT_SETTINGS)).toBe(r);
    const a: RevealState = { step: 0, phase: "away", shown: 3 };
    expect(advance(st, a, DEFAULT_SETTINGS)).toBe(a);
  });
});

describe("every step can be skipped", () => {
  it("a tap during the tiles beat stamps every remaining tile and moves on", () => {
    const st = story(surge());
    const s = advance(st, { step: 0, phase: "tiles", shown: 1 }, DEFAULT_SETTINGS, true);
    expect(s.phase).toBe("beat");
    expect(s.shown).toBe(3);
  });
  it("tapping through from the start reaches rest without waiting", () => {
    const st = story(surge());
    let s = startReveal();
    for (let n = 0; n < 20 && s.phase !== "rest"; n++) s = advance(st, s, DEFAULT_SETTINGS, true);
    expect(s.phase).toBe("rest");
    expect(s.shown).toBe(3);
  });
  it("every beat has a way forward", () => {
    const st = story(surge());
    for (const p of phasesFor(surge()).filter((q) => q !== "rest" && q !== "away")) {
      const s = advance(st, { step: 0, phase: p, shown: 1 }, DEFAULT_SETTINGS, true);
      expect(s.phase).not.toBe(p);
    }
  });
});

describe("leaving", () => {
  it("Continue only counts at rest, so a stray tap cannot cut a hit short", () => {
    const mid: RevealState = { step: 0, phase: "tiles", shown: 1 };
    expect(leave(mid)).toBe(mid);
    expect(leave({ step: 0, phase: "rest", shown: 3 }).phase).toBe("away");
  });
  it("after the card is away: the next card of the draw, or the end", () => {
    const st = story(step(), step({ card: tool, called: [] }));
    expect(afterAway(st, { step: 0, phase: "away", shown: 3 })).toEqual({ step: 1, phase: "draw", shown: 0 });
    expect(afterAway(st, { step: 1, phase: "away", shown: 0 })).toBeNull();
  });
});

describe("timing", () => {
  it("a typical Surge Ravage takes about six seconds at default speed", () => {
    for (const calls of [3, 4]) {
      const ms = autoMs(DEFAULT_SETTINGS, surge2(calls));
      expect(ms).toBeGreaterThan(4500);
      expect(ms).toBeLessThan(6500);
    }
  });
  it("fast animations halve it", () => { const full = autoMs(DEFAULT_SETTINGS, surge()); expect(Math.abs(autoMs(fast, surge()) - full / 2)).toBeLessThanOrEqual(4); });
  it("reduced motion takes no time at all and stamps every tile at once", () => {
    expect(autoMs(reduced, surge())).toBe(0);
    for (const p of phasesFor(surge())) if (p !== "rest") expect(phaseMs(reduced, p)).toBe(0);
    const { s, seen } = run(surge(), reduced);
    expect(s.shown).toBe(3);
    expect(seen).toContain("metre");
  });
  it("rest waits for the player", () => { expect(phaseMs(DEFAULT_SETTINGS, "rest")).toBeNull(); expect(phaseMs(reduced, "rest")).toBeNull(); });
});
function surge2(calls: number) { return step({ called: Array.from({ length: calls }, (_, i) => i + 1), surge: "fired", metreMoves: [{ from: 12, to: 20, why: "surge" }] }); }

describe("the Metre stays put until its own beat", () => {
  const s1 = step({ metreMoves: [{ from: 12, to: 20, why: "surge" }] });
  const s2 = step({ metreMoves: [{ from: 20, to: 28, why: "surge" }] });
  const st = story(s1, s2);
  it("before the beat it shows where the Metre was", () => { for (const p of ["draw", "read", "dock", "pulse", "tiles", "beat"] as Phase[]) expect(metreDisplay(st, 0, p, 28)).toBe(12); });
  it("from the beat on, it shows this card's result, which is where the next card starts", () => { for (const p of ["metre", "rest", "away"] as Phase[]) expect(metreDisplay(st, 0, p, 28)).toBe(20); });
  it("on the last card, after its beat, it is the engine's real reading", () => { expect(metreDisplay(st, 1, "metre", 28)).toBe(28); expect(metreDisplay(st, 1, "pulse", 28)).toBe(20); });
  it("a card that does not move the Metre leaves the engine reading alone", () => { expect(metreDisplay(story(step()), 0, "draw", 17)).toBe(17); });
});

describe("helpers for the table", () => {
  it("the biome pulses only during the pulse beat, and only for a Ravage", () => {
    const st = story(surge());
    expect(pulsingBiome(st, { step: 0, phase: "pulse", shown: 0 })).toBe("forest");
    expect(pulsingBiome(st, { step: 0, phase: "tiles", shown: 1 })).toBeNull();
    expect(pulsingBiome(story(step({ card: tool, called: [] })), { step: 0, phase: "pulse", shown: 0 })).toBeNull();
  });
  it("the Surge beat is the metre beat of a Surge, Cascade or extinction, and nothing else", () => {
    expect(isSurgeBeat(story(surge()), { step: 0, phase: "metre", shown: 3 })).toBe(true);
    expect(isSurgeBeat(story(surge()), { step: 0, phase: "tiles", shown: 3 })).toBe(false);
    expect(isSurgeBeat(story(step({ metreMoves: [{ from: 9, to: 8, why: "x" }] })), { step: 0, phase: "metre", shown: 3 })).toBe(false);
    expect(isSurgeBeat(story(step({ cascade: ["forest"] })), { step: 0, phase: "metre", shown: 3 })).toBe(true);
  });
});

describe("reduced motion opens the reveal already at rest", () => {
  it("settle passes every beat that has no duration, and stops at rest", () => {
    const st = story(surge());
    const s = settle(st, startReveal(), reduced);
    expect(s).toEqual({ step: 0, phase: "rest", shown: 3 });
  });
  it("at normal speed it does nothing, so the card really is drawn", () => {
    const st = story(surge());
    expect(settle(st, startReveal(), DEFAULT_SETTINGS)).toEqual(startReveal());
  });
  it("the Metre is at its final reading by the time the reveal rests", () => {
    const st = story(surge());
    const s = settle(st, startReveal(), reduced);
    expect(metreDisplay(st, s.step, s.phase, 20)).toBe(20);
  });
});

describe("reaching a beat", () => {
  it("is ordered", () => {
    expect(phaseAtLeast("rest", "metre")).toBe(true);
    expect(phaseAtLeast("tiles", "metre")).toBe(false);
    expect(phaseAtLeast("metre", "metre")).toBe(true);
    expect(phaseAtLeast("draw", "draw")).toBe(true);
  });
});
