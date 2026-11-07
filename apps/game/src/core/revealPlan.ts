// The Ravage reveal as a small state machine (Phase 4). Pure: no React, no platform code, so it is unit tested.
//
// One drawn card plays through these beats, in order. Every auto beat can be skipped with a tap, and
// "rest" waits for the player (the real-world fact is worth reading), so nothing here ever traps anyone.
//
//   draw   the card lifts off the deck, flips and slides to the centre
//   read   it rests there so its name and cause can be read
//   dock   it settles into its slot in the notebook panel
//   pulse  tiles of the named biome pulse once                         (Ravage with called tiles only)
//   tiles  each called tile is stamped with its number and its hit resolves, one at a time
//   beat   a breath before the Metre moves                             (only when the Metre moves)
//   metre  the slider moves; a Surge, Cascade or extinction also shakes the frame and flashes red
//   rest   the card waits; the player reads and presses Continue
//   away   the card slides to the discard pile
import type { Settings } from "./settings";
import { motionMs } from "./settings";
import { isBigMoment } from "./soundPlan";
import type { Story, StoryStep } from "./story";
import { MOVES, REVEAL } from "../theme/motion";

export type Phase = "draw" | "read" | "dock" | "pulse" | "tiles" | "beat" | "metre" | "rest" | "away";

export interface RevealState { step: number; phase: Phase; /** Called tiles whose number has been stamped so far. */ shown: number }

type Beat = Pick<StoryStep, "card" | "called" | "metreMoves" | "surge" | "cascade" | "extinct">

/** Does the Metre move during this card? A Surge, Cascade or extinction always counts, even if no move was recorded. */
export function movesMetre(st: Beat): boolean {
  return st.metreMoves.length > 0 || isBigMoment(st);
}

/** The beats this card plays, in order. */
export function phasesFor(st: Beat): Phase[] {
  const out: Phase[] = ["draw", "read", "dock"];
  if (st.card.type === "ravage" && st.called.length > 0) out.push("pulse", "tiles");
  if (movesMetre(st)) out.push("beat", "metre");
  out.push("rest", "away");
  return out;
}

export function startReveal(): RevealState { return { step: 0, phase: "draw", shown: 0 }; }

/** How long a beat lasts before moving on by itself. null = waits for the player. 0 = no motion, move on at once. */
export function phaseMs(settings: Settings, phase: Phase): number | null {
  switch (phase) {
    case "draw": return motionMs(settings, MOVES.cardSlide.ms + 50); // the flip starts 50 ms in and ends with the slide
    case "read": return motionMs(settings, REVEAL.read);
    case "dock": return motionMs(settings, MOVES.cardSlide.ms);
    case "pulse": return motionMs(settings, REVEAL.pulse);
    case "tiles": return motionMs(settings, REVEAL.perTile);
    case "beat": return motionMs(settings, REVEAL.beat);
    case "metre": return motionMs(settings, REVEAL.metre);
    case "rest": return null;
    case "away": return motionMs(settings, MOVES.cardSlide.ms);
  }
}

/** Total time the beats take on their own, from the draw to the rest. About six seconds for a typical Surge card. */
export function autoMs(settings: Settings, st: Beat): number {
  let t = 0;
  for (const p of phasesFor(st)) {
    if (p === "rest" || p === "away") continue;
    const ms = phaseMs(settings, p) ?? 0;
    t += p === "tiles" ? ms * st.called.length : ms;
  }
  return t;
}

function after(st: Beat, phase: Phase): Phase {
  const list = phasesFor(st);
  return list[Math.min(list.length - 1, list.indexOf(phase) + 1)]!;
}

function enter(settings: Settings, st: Beat, s: RevealState, phase: Phase): RevealState {
  if (phase === "tiles") return { ...s, phase, shown: motionMs(settings, REVEAL.perTile) > 0 ? Math.min(1, st.called.length) : st.called.length };
  return { ...s, phase };
}

/**
 * The beat's time is up (or the player tapped to skip it): move to the next. Tiles advance one at a time.
 * Returns the same object when there is nowhere to go ("rest" waits for the player; "away" is handled by `afterAway`).
 */
export function advance(story: Story, s: RevealState, settings: Settings, skip = false): RevealState {
  const st = story.steps[s.step];
  if (!st || s.phase === "rest" || s.phase === "away") return s;
  if (s.phase === "tiles") {
    if (!skip && s.shown < st.called.length) return { ...s, shown: s.shown + 1 };
    return enter(settings, st, { ...s, shown: st.called.length }, after(st, "tiles"));
  }
  return enter(settings, st, s, after(st, s.phase));
}

/**
 * Beats with no duration (reduced motion) are passed through at once, so the reveal opens already at its rest:
 * nothing ever shows its starting position, not even for a frame.
 */
export function settle(story: Story, s: RevealState, settings: Settings): RevealState {
  let cur = s;
  for (let n = 0; n < 40; n++) {
    if (cur.phase === "rest" || cur.phase === "away" || phaseMs(settings, cur.phase) !== 0) break;
    const next = advance(story, cur, settings, true);
    if (next === cur) break;
    cur = next;
  }
  return cur;
}

/** The player pressed Continue. Only counts once the beats are done, so a stray tap cannot cut a hit short. */
export function leave(s: RevealState): RevealState {
  return s.phase === "rest" ? { ...s, phase: "away" } : s;
}

/** The card has reached the discard pile: the next card of this draw, or null when the story is over. */
export function afterAway(story: Story, s: RevealState): RevealState | null {
  return s.step < story.steps.length - 1 ? { step: s.step + 1, phase: "draw", shown: 0 } : null;
}

const ORDER: Phase[] = ["draw", "read", "dock", "pulse", "tiles", "beat", "metre", "rest", "away"];
/** Has the reveal reached `q` (or gone past it)? Lets the panel hold back a line until its beat. */
export const phaseAtLeast = (p: Phase, q: Phase): boolean => ORDER.indexOf(p) >= ORDER.indexOf(q);
const atLeast = phaseAtLeast;

/**
 * What the Metre should show right now. The engine's state already has the final reading, so during the reveal the slider
 * stays where it was until its own beat, then moves. `final` is the engine's real reading.
 */
export function metreDisplay(story: Story, step: number, phase: Phase, final: number): number {
  for (let i = step; i < story.steps.length; i++) {
    if (i === step && atLeast(phase, "metre")) continue; // this card's move has already happened
    const first = story.steps[i]!.metreMoves[0];
    if (first) return first.from;
  }
  return final;
}

/** Which biome pulses right now, if any. */
export function pulsingBiome(story: Story, s: RevealState): string | null {
  const st = story.steps[s.step];
  return st && s.phase === "pulse" && st.card.type === "ravage" ? st.card.biome : null;
}

/** Is this the moment of a Surge, Cascade or extinction: the beat where the frame shakes and the table flashes? */
export function isSurgeBeat(story: Story, s: RevealState): boolean {
  const st = story.steps[s.step];
  return !!st && s.phase === "metre" && isBigMoment(st);
}
