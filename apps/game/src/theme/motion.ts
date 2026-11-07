// Every duration and easing in the app lives here, so no screen invents its own timing (docs/STYLE_GUIDE.md).
// Pure: no React, no platform code. Durations go through motionMs() (core/settings.ts), which returns 0
// for reduced motion and halves them for fast animations.
import { motionMs, type Settings } from "../core/settings";

export type EasingName = "out" | "in" | "inOut" | "settle" | "overshoot" | "linear";

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** 0..1 in, 0..1 out (settle and overshoot may pass 1 on the way, and end exactly on 1). */
export function ease(name: EasingName, t: number): number {
  const x = clamp01(t);
  switch (name) {
    case "linear": return x;
    case "out": return 1 - Math.pow(1 - x, 3);
    case "in": return x * x * x;
    case "inOut": return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    // A piece landing: drops, dips a little past, settles.
    case "settle": { const c1 = 1.2, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
    // The Metre slider: slow start, a slight overshoot, settles.
    case "overshoot": { const e = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; return e + 0.12 * Math.sin(Math.PI * x) * e; }
  }
}

export type MoveName = "keyPress" | "lift" | "place" | "cardFlip" | "cardSlide" | "scuff" | "drop" | "metre" | "shake" | "discSlide" | "flash" | "crossfade";

export const MOVES: Record<MoveName, { ms: number; easing: EasingName }> = {
  keyPress: { ms: 80, easing: "out" },       // sinks 2 px, springs back
  lift: { ms: 150, easing: "out" },          // rises 2 to 4 px, shadow grows
  place: { ms: 220, easing: "settle" },      // drops from a little above, small settle
  cardFlip: { ms: 350, easing: "inOut" },    // scale across the middle, the face swaps at the half
  cardSlide: { ms: 400, easing: "out" },     // deck to centre, centre to the notebook slot, slot to discard
  scuff: { ms: 250, easing: "inOut" },       // face crossfades to the worn version, or back
  drop: { ms: 450, easing: "in" },           // tile sinks and fades, the hole fades in
  metre: { ms: 700, easing: "overshoot" },
  shake: { ms: 300, easing: "linear" },      // Surge, Cascade and extinction only
  discSlide: { ms: 400, easing: "out" },     // the turn disc
  flash: { ms: 350, easing: "out" },         // the red wash of a Surge; absent under reduced motion
  crossfade: { ms: 150, easing: "inOut" },   // what reduced motion uses instead of a move: opacity only
};

/** Beats of the Ravage reveal that are pauses rather than moves (Phase 4). They go through motionMs() too. */
export const REVEAL = {
  /** The drawn card rests at the centre so its name and cause can be read. */
  read: 700,
  /** Tiles of the named biome pulse once before the numbers are stamped. */
  pulse: 400,
  /** Each called tile: its number is stamped and its hit resolves. */
  perTile: 650,
  /** A breath between the last tile and the Metre moving, so the Surge lands as its own moment. */
  beat: 300,
  /** The slider, the shake and the flash. Covers the slider's glide plus a settle. */
  metre: 900,
} as const;

/** How long the YOUR TURN stamp stays up. Reduced motion keeps it, static, so the information is never lost. */
export const STAMP_MS = 1000;
export const STAMP_MS_REDUCED = 800;
export function stampMs(s: Settings): number { return s.reducedMotion ? STAMP_MS_REDUCED : motionMs(s, STAMP_MS); }

/** Duration of a named move for the current settings. 0 means: no animation, jump to the end. */
export function moveMs(s: Settings, move: MoveName): number {
  // A crossfade is how reduced motion shows a change, so it is the one move that does not go to 0.
  if (move === "crossfade") return s.fastAnimations && !s.reducedMotion ? Math.round(MOVES.crossfade.ms / 2) : MOVES.crossfade.ms;
  return motionMs(s, MOVES[move].ms);
}

/** Value `elapsed` ms into a tween from `from` to `to` over `dur` ms. Ends exactly on `to`. */
export function tweenAt(from: number, to: number, elapsed: number, dur: number, easing: EasingName): number {
  if (dur <= 0 || elapsed >= dur) return to;
  return from + (to - from) * ease(easing, elapsed / dur);
}

/** Three quick offsets that die away. `t` is 0..1 through the move; returns -1..1 (multiply by a distance). */
export function shakeOffset(t: number): number {
  const x = clamp01(t);
  return Math.sin(x * 3 * 2 * Math.PI) * (1 - x);
}

/** Band boundaries a slider passes between two readings: one brass tick each. */
export function bandsCrossed(prev: number, next: number, perBand: number): number {
  if (perBand <= 0 || prev === next) return 0;
  const lo = Math.min(prev, next), hi = Math.max(prev, next);
  return Math.max(0, Math.floor(hi / perBand) - Math.floor(lo / perBand));
}
