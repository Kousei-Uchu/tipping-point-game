// What the table sounds like: the cue list, how loud each is, which haptic goes with it, and which
// game events ask for which cue. Pure data and small functions, so it is unit tested.
// Plan: quiet by default, loud for big moments. Nothing is louder than the Surge.

export type SoundName =
  | "keyPress" | "lift" | "place" | "cardDraw" | "cardFlip" | "cardSlide" | "restore"
  | "shieldOn" | "shieldOff" | "scuff" | "drop" | "metreTick" | "handoff" | "surge" | "trophy" | "collapse";
export type Level = "quiet" | "medium" | "loud";
export type Haptic = "tap" | "confirm" | "warn";
/** A cue is a sound (with its haptic) or a bare haptic. */
export type Cue = SoundName | Haptic;

export const SOUNDS: Record<SoundName, { level: Level; haptic: Haptic | null; note: string }> = {
  keyPress: { level: "quiet", haptic: "tap", note: "Soft cardboard tap" },
  lift: { level: "quiet", haptic: "tap", note: "Wood on felt, picked up" },
  place: { level: "quiet", haptic: "tap", note: "Wood on felt, set down" },
  cardDraw: { level: "quiet", haptic: null, note: "Paper snap" },
  cardFlip: { level: "quiet", haptic: null, note: "Two paper snaps" },
  cardSlide: { level: "quiet", haptic: null, note: "Paper slide" },
  restore: { level: "quiet", haptic: "confirm", note: "A small, satisfying thunk" },
  shieldOn: { level: "medium", haptic: "confirm", note: "Click, then a ping" },
  shieldOff: { level: "medium", haptic: null, note: "Crack, then a pop" },
  scuff: { level: "medium", haptic: null, note: "Dry scrape" },
  drop: { level: "medium", haptic: null, note: "Hollow knock" },
  metreTick: { level: "medium", haptic: null, note: "Brass tick per band" },
  handoff: { level: "quiet", haptic: "tap", note: "Wooden disc set down" },
  surge: { level: "loud", haptic: "warn", note: "Low rumble, the loudest cue" },
  trophy: { level: "loud", haptic: "confirm", note: "Short cup chime" },
  collapse: { level: "loud", haptic: "warn", note: "Long low note" },
};

export const LEVEL_GAIN: Record<Level, number> = { quiet: 0.35, medium: 0.65, loud: 1 };
const RANK: Record<Level, number> = { quiet: 0, medium: 1, loud: 2 };
export const isSound = (c: Cue): c is SoundName => c in SOUNDS;

/** What a successful action sounds like. */
export function cueForAction(a: { type: string; kind?: string }): SoundName | Haptic {
  switch (a.type) {
    case "Move": return "place";
    case "UseTool": return a.kind === "restore" ? "restore" : "shieldOn";
    case "Stabilise": return "place";
    case "Gift": return "place";
    case "Draw": return "cardDraw";
    default: return "confirm";
  }
}

/** What a Ravage hit sounds like when its tile is revealed. */
export function soundForOutcome(outcome: "vulnerable" | "shield_lost" | "marker_lost" | "removed"): SoundName {
  switch (outcome) {
    case "vulnerable": return "scuff";
    case "shield_lost": return "shieldOff";
    case "marker_lost": return "shieldOff";
    case "removed": return "drop";
  }
}

/** The big moment: a Surge, Cascade or extinction is the loudest thing in the game. */
export function isBigMoment(step: { surge: string; cascade: readonly string[]; extinct: readonly string[] }): boolean {
  return step.surge === "fired" || step.cascade.length > 0 || step.extinct.length > 0;
}

export interface MixResult { gain: number; duck: SoundName[] }

/**
 * Decides loudness when cues land together. Inside `windowMs`, the louder cue wins: a quieter one that
 * arrives after it plays ducked, and a louder one that arrives after quieter ones asks for them to be ducked.
 */
export function createMixer(windowMs = 160, duckTo = 0.35) {
  let recent: { name: SoundName; at: number }[] = [];
  return {
    request(name: SoundName, now: number): MixResult {
      recent = recent.filter((r) => now - r.at < windowMs);
      const mine = RANK[SOUNDS[name].level];
      const loudest = recent.reduce((m, r) => Math.max(m, RANK[SOUNDS[r.name].level]), -1);
      const duck = recent.filter((r) => RANK[SOUNDS[r.name].level] < mine).map((r) => r.name);
      const ducked = loudest > mine;
      recent.push({ name, at: now });
      return { gain: LEVEL_GAIN[SOUNDS[name].level] * (ducked ? duckTo : 1), duck: [...new Set(duck)] };
    },
  };
}
