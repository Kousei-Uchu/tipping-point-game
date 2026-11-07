import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../src/core/settings";
import { bandsCrossed, ease, MOVES, moveMs, shakeOffset, stampMs, tweenAt, type EasingName } from "../src/theme/motion";

const ALL: EasingName[] = ["out", "in", "inOut", "settle", "overshoot", "linear"];

describe("easing", () => {
  for (const e of ALL) it(`${e} starts at 0 and ends exactly on 1`, () => { expect(ease(e, 0)).toBeCloseTo(0, 6); expect(ease(e, 1)).toBeCloseTo(1, 6); });
  it("settle and overshoot pass the target a little before landing", () => {
    const peak = (e: EasingName) => Math.max(...Array.from({ length: 101 }, (_, i) => ease(e, i / 100)));
    expect(peak("settle")).toBeGreaterThan(1.001);
    expect(peak("settle")).toBeLessThan(1.15);
    expect(peak("overshoot")).toBeGreaterThan(1.001);
    expect(peak("overshoot")).toBeLessThan(1.1);
    expect(peak("out")).toBeLessThanOrEqual(1);
  });
  it("overshoot starts slowly", () => { expect(ease("overshoot", 0.1)).toBeLessThan(0.05); });
  it("clamps outside 0..1", () => { expect(ease("out", -1)).toBe(0); expect(ease("out", 2)).toBe(1); });
});

describe("tweens", () => {
  it("runs from the start to the end and stops exactly there", () => {
    expect(tweenAt(2, 10, 0, 100, "linear")).toBe(2);
    expect(tweenAt(2, 10, 50, 100, "linear")).toBeCloseTo(6, 6);
    expect(tweenAt(2, 10, 100, 100, "linear")).toBe(10);
    expect(tweenAt(2, 10, 500, 100, "overshoot")).toBe(10);
  });
  it("a zero duration jumps to the end", () => { expect(tweenAt(0, 1, 0, 0, "out")).toBe(1); });
});

describe("durations follow the settings", () => {
  const s = DEFAULT_SETTINGS;
  it("plan timings at default speed", () => {
    expect(moveMs(s, "keyPress")).toBe(80);
    expect(moveMs(s, "lift")).toBe(150);
    expect(moveMs(s, "place")).toBe(220);
    expect(moveMs(s, "cardFlip")).toBe(350);
    expect(moveMs(s, "cardSlide")).toBe(400);
    expect(moveMs(s, "scuff")).toBe(250);
    expect(moveMs(s, "drop")).toBe(450);
    expect(moveMs(s, "metre")).toBe(700);
    expect(moveMs(s, "shake")).toBe(300);
  });
  it("fast animations halve every move", () => { for (const k of Object.keys(MOVES) as (keyof typeof MOVES)[]) expect(moveMs({ ...s, fastAnimations: true }, k)).toBe(Math.round(MOVES[k].ms / 2)); });
  it("reduced motion zeroes every move except the crossfade, and fast does not bring it back", () => { for (const k of (Object.keys(MOVES) as (keyof typeof MOVES)[]).filter((m) => m !== "crossfade")) { expect(moveMs({ ...s, reducedMotion: true }, k)).toBe(0); expect(moveMs({ ...s, reducedMotion: true, fastAnimations: true }, k)).toBe(0); } });
  it("the crossfade is what reduced motion keeps", () => { expect(moveMs({ ...s, reducedMotion: true }, "crossfade")).toBe(150); expect(moveMs({ ...s, reducedMotion: true, fastAnimations: true }, "crossfade")).toBe(150); });
  it("the turn stamp stays up under reduced motion", () => { expect(stampMs({ ...s, reducedMotion: true })).toBeGreaterThan(0); expect(stampMs(s)).toBe(1000); expect(stampMs({ ...s, fastAnimations: true })).toBe(500); });
});

describe("shake", () => {
  it("dies away to nothing and moves both ways", () => {
    expect(shakeOffset(1)).toBeCloseTo(0, 6);
    expect(shakeOffset(0)).toBeCloseTo(0, 6);
    const v = Array.from({ length: 100 }, (_, i) => shakeOffset(i / 100));
    expect(Math.max(...v)).toBeGreaterThan(0.5);
    expect(Math.min(...v)).toBeLessThan(-0.5);
    expect(Math.max(...v.slice(70).map(Math.abs))).toBeLessThan(0.35);
  });
});

describe("Metre ticks", () => {
  it("counts band boundaries passed, either direction", () => {
    expect(bandsCrossed(5, 20, 8)).toBe(2);
    expect(bandsCrossed(20, 5, 8)).toBe(2);
    expect(bandsCrossed(9, 15, 8)).toBe(0);
    expect(bandsCrossed(7, 9, 8)).toBe(1);
    expect(bandsCrossed(16, 16, 8)).toBe(0);
  });
});
