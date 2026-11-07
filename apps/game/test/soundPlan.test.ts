import { describe, expect, it } from "vitest";
import { createMixer, cueForAction, isBigMoment, LEVEL_GAIN, SOUNDS, soundForOutcome, type SoundName } from "../src/core/soundPlan";

const names = Object.keys(SOUNDS) as SoundName[];

describe("cue list", () => {
  it("has about fifteen effects, as budgeted", () => { expect(names.length).toBeGreaterThanOrEqual(14); expect(names.length).toBeLessThanOrEqual(18); });
  it("nothing is louder than the Surge, and only big moments are loud", () => {
    expect(SOUNDS.surge.level).toBe("loud");
    expect(names.filter((n) => SOUNDS[n].level === "loud").sort()).toEqual(["collapse", "surge", "trophy"]);
    expect(Math.max(...names.map((n) => LEVEL_GAIN[SOUNDS[n].level]))).toBe(LEVEL_GAIN[SOUNDS.surge.level]);
  });
  it("Restore, Key, lift and place are quiet", () => { for (const n of ["restore", "keyPress", "lift", "place"] as const) expect(SOUNDS[n].level).toBe("quiet"); });
  it("haptics follow the plan: tap for lift and place, confirm for Restore, warn for a Surge", () => {
    expect(SOUNDS.lift.haptic).toBe("tap"); expect(SOUNDS.place.haptic).toBe("tap");
    expect(SOUNDS.restore.haptic).toBe("confirm"); expect(SOUNDS.surge.haptic).toBe("warn");
  });
});

describe("what an action sounds like", () => {
  it("maps moves, tools and the draw", () => {
    expect(cueForAction({ type: "Move" })).toBe("place");
    expect(cueForAction({ type: "UseTool", kind: "restore" })).toBe("restore");
    expect(cueForAction({ type: "UseTool", kind: "fortify" })).toBe("shieldOn");
    expect(cueForAction({ type: "Draw" })).toBe("cardDraw");
    expect(cueForAction({ type: "Resolve" })).toBe("confirm");
  });
  it("maps every Ravage outcome to its own cue", () => {
    expect(soundForOutcome("vulnerable")).toBe("scuff");
    expect(soundForOutcome("shield_lost")).toBe("shieldOff");
    expect(soundForOutcome("removed")).toBe("drop");
  });
  it("a Surge, Cascade or extinction is a big moment; an ordinary Ravage is not", () => {
    expect(isBigMoment({ surge: "fired", cascade: [], extinct: [] })).toBe(true);
    expect(isBigMoment({ surge: "none", cascade: ["forest"], extinct: [] })).toBe(true);
    expect(isBigMoment({ surge: "none", cascade: [], extinct: ["coral"] })).toBe(true);
    expect(isBigMoment({ surge: "skipped", cascade: [], extinct: [] })).toBe(false);
  });
});

describe("mixer", () => {
  it("plays a lone cue at its own level", () => { expect(createMixer().request("restore", 0)).toEqual({ gain: LEVEL_GAIN.quiet, duck: [] }); });
  it("a quieter cue landing with a louder one plays ducked", () => {
    const m = createMixer(); m.request("surge", 1000);
    const r = m.request("place", 1050);
    expect(r.gain).toBeLessThan(LEVEL_GAIN.quiet);
    expect(r.duck).toEqual([]);
  });
  it("a louder cue landing after quieter ones asks for them to be ducked", () => {
    const m = createMixer(); m.request("cardDraw", 1000); m.request("scuff", 1020);
    const r = m.request("surge", 1060);
    expect(r.gain).toBe(LEVEL_GAIN.loud);
    expect(r.duck.sort()).toEqual(["cardDraw", "scuff"]);
  });
  it("cues far apart do not affect each other", () => {
    const m = createMixer(); m.request("surge", 0);
    expect(m.request("place", 2000)).toEqual({ gain: LEVEL_GAIN.quiet, duck: [] });
  });
  it("equal levels do not duck each other", () => {
    const m = createMixer(); m.request("place", 0);
    expect(m.request("lift", 10)).toEqual({ gain: LEVEL_GAIN.quiet, duck: [] });
  });
});
