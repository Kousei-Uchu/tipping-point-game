// The guided tutorial: scenario, step script and the rules that gate the player's actions.
//
// Pure logic, no React and no platform code, so it is unit-tested against the real engine.
//
// How it works:
//   * The tutorial is a normal LocalSession started from a FIXED seed. The seed was chosen by the scan
//     in apps/game/test/tutorial.test.ts (TUTORIAL_SCAN=1) so the first turn is a clean lesson:
//     Mia holds a Tool that matches a Vulnerable tile exactly 3 steps away, and the first card
//     she draws is a Ravage that both weakens a tile and destroys one.
//   * Nothing is faked. Every move, repair and draw goes through the real engine.
//   * Each step either waits for a button ("info") or waits for the player to do something ("action").
//     Action steps finish by looking at the game STATE, never at a click, so Undo just works.
//   * If the content changes (a card is edited), the tests in test/tutorial.test.ts fail and tell
//     you to re-run the seed scan.
import type { Action, GameEvent, NewGameOptions, State } from "@tipping-point/engine";
import { biomeName, cardById, content, roleByKey } from "./content";
import { bandOf } from "./selectors";
import { buildStory } from "./story";

// ---------------------------------------------------------------- scenario

/** Found by the seed scan. Do not change without re-running it (see the tests). */
export const TUTORIAL_SEED = 1035;

/** Mia is seat 0 and plays the whole tutorial. Raj only exists so the game has two Stewards. */
export const TUTORIAL_SEAT = 0;

/** The Vulnerable River tile, 3 steps from the Research Station, that Mia walks to and restores. */
export const TUTORIAL_TARGET = 36;

export const TUTORIAL_OPTIONS: NewGameOptions = {
  seed: TUTORIAL_SEED,
  difficulty: "easy",
  startSeat: TUTORIAL_SEAT,
  players: [{ id: "p0", name: "Mia" }, { id: "p1", name: "Raj" }],
};

// ---------------------------------------------------------------- facts used in the copy

export interface RavageFacts {
  card: string;
  biome: string;
  calls: number;
  /** Tiles that were already Vulnerable and are now Lost. */
  lost: number;
  /** Healthy tiles that became Vulnerable. */
  weakened: number;
}

export interface Facts {
  you: string;
  roles: string;
  biome: string;
  toolName: string;
  pressure: number;
  ticks: number;
  ravage: RavageFacts | null;
}

const list = (xs: string[]): string => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** Everything the step text needs from the live game, so the copy never goes out of date. */
export function factsOf(s: State, events: readonly GameEvent[]): Facts {
  const me = s.players[TUTORIAL_SEAT]!;
  const held = me.hand[0];
  const tool = held ? cardById(held.cardId) : undefined;

  let ravage: RavageFacts | null = null;
  const drawn = buildStory(content, events).steps.filter((st) => st.card.type === "ravage");
  const last = drawn[drawn.length - 1];
  if (last && last.card.type === "ravage") {
    ravage = {
      card: last.card.name,
      biome: biomeName(last.card.biome),
      calls: last.calls,
      lost: last.outcomes.filter((o) => o.outcome === "removed").length,
      weakened: last.outcomes.filter((o) => o.outcome === "vulnerable").length,
    };
  }
  return {
    you: me.name,
    roles: list(me.roles.map((r) => roleByKey(r).name)),
    biome: biomeName(s.tiles[TUTORIAL_TARGET]!.biome),
    toolName: tool ? tool.name : "Tool",
    pressure: bandOf(s.metreTicks),
    ticks: s.metreTicks,
    ravage,
  };
}

// ---------------------------------------------------------------- step model

/** Parts of the screen a step can draw a highlight frame around. */
export type SpotId = "metre" | "chips" | "hand" | "draw";

export interface TutorialStep {
  id: string;
  /** "coach" is a tip card above the board. "modal" covers the screen (welcome, primer pages, finish). */
  presentation: "coach" | "modal";
  /** "info" waits for the Next button. "action" waits for the player to do the thing. */
  kind: "info" | "action";
  title: string;
  /** Small label above a modal title, e.g. "Good to know". */
  eyebrow?: string;
  body: (f: Facts) => string[];
  nextLabel?: string;
  spot?: SpotId;
  /** Ring every Vulnerable tile on the board. */
  ringVulnerable?: boolean;
  /** Ring the target tile and keep the reach highlights on. */
  ringTarget?: boolean;
  // ---- action steps only ----
  /** True when this action is the one the step is waiting for. */
  allows?: (a: Action, s: State) => boolean;
  /** What to tell the player when they try something else. */
  blocked?: string;
  /** True once the game state shows the step's goal has been met. */
  done?: (s: State) => boolean;
}

const { metre, limits, legacy, tiles, difficulty } = content.rules;
const evacuation = `${difficulty.easy.evacuation_rounds} on Easy, ${difficulty.normal.evacuation_rounds} on Normal and ${difficulty.hard.evacuation_rounds} on Hard`;

const lastOf = (xs: number[]): number | undefined => xs[xs.length - 1];

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: "welcome", presentation: "modal", kind: "info",
    title: "Welcome, Steward",
    nextLabel: "Start the tutorial",
    body: () => [
      "Tipping Point is a team game about saving the planet's wild places. You and the other Stewards are racing to cool the Pressure Metre before nature tips over.",
      "This guided turn takes about three minutes. You will walk across the board, repair a damaged tile and see what happens when the Ravage deck strikes. Nothing here is saved, so feel free to look around.",
    ],
  },
  {
    id: "metre", presentation: "coach", kind: "info", spot: "metre",
    title: "The Pressure Metre",
    body: (f) => [
      `This bar is the heart of the game. The marker sits in band ${f.pressure} of 5, and that number is the Pressure: every Ravage card hits that many tiles.`,
      "Repairs push the marker down towards the Trophy. Bad cards push it up towards Collapse. Reach the Trophy to start the final lap. If it climbs to Collapse, everyone loses.",
    ],
  },
  {
    id: "board", presentation: "coach", kind: "info", ringVulnerable: true,
    title: "The board",
    body: () => [
      "Six biomes make up the board. Each has its own colour, symbol and edge pattern. The pale tile in the middle is the Research Station, where every Steward starts.",
      "Solid tiles are Healthy. The gold rings mark the Vulnerable ones, drawn with dashed edges and a red flag. If a Vulnerable tile is hit again, it is Lost for good.",
    ],
  },
  {
    id: "turn", presentation: "coach", kind: "info", spot: "chips",
    title: "Your turn",
    body: () => [
      `These chips show what you can still do this turn: Move up to ${content.rules.turn.move} tiles, use 1 Tool, use 1 Ability and give 1 Gift. You can do them in any order.`,
      "Every turn ends with Draw, which reveals the next card. That is why it always comes last.",
    ],
  },
  {
    id: "role", presentation: "coach", kind: "info",
    title: "Your role",
    body: (f) => [
      `You are ${f.you}, and your roles are ${f.roles}. A role is a special power. Some work all the time, others give you an Ability button to press once a turn.`,
      "Your role cards sit beside the board, or behind the Role button on a phone. We will not need them for this first turn.",
    ],
  },
  {
    id: "move", presentation: "coach", kind: "action", ringTarget: true,
    title: "Walk to the damaged tile",
    body: (f) => [
      `The gold tile is a Vulnerable ${f.biome} tile, 3 steps from the Research Station. The teal tiles show everywhere you can reach this turn.`,
      "Tap the gold tile, then press Move here.",
    ],
    blocked: "Tap the gold tile, then press Move here.",
    allows: (a) => a.type === "Move" && lastOf(a.path) === TUTORIAL_TARGET,
    done: (s) => s.players[TUTORIAL_SEAT]!.pos === TUTORIAL_TARGET,
  },
  {
    id: "tool", presentation: "coach", kind: "action", spot: "hand",
    title: "Repair it with a Tool",
    body: (f) => [
      `You are holding a ${f.toolName}. A Tool only works on its own biome, and this one is a ${f.biome} Tool, so it matches the tile under your feet.`,
      "Tap the Tool card and press Restore. You can also tap your own tile and choose Restore there.",
    ],
    blocked: "Tap your Tool card, then press Restore.",
    allows: (a) => a.type === "UseTool" && a.kind === "restore" && a.handIndex === 0,
    done: (s) => { const t = s.tiles[TUTORIAL_TARGET]!; return t.status === "healthy" && t.owner === s.players[TUTORIAL_SEAT]!.id; },
  },
  {
    id: "restored", presentation: "coach", kind: "info", spot: "metre",
    title: "Restored",
    body: (f) => [
      "The tile is Healthy again and now carries your token. At the end of the game, each of your tokens on a Healthy tile scores a Legacy point. The Tool is spent and goes back into the deck.",
      `Restoring also pushed the Metre down ${metre.restore_ticks_down} ticks, to ${f.ticks}. Watch the marker, it is your scoreboard against nature.`,
    ],
  },
  {
    id: "draw", presentation: "coach", kind: "action", spot: "draw",
    title: "End your turn with Draw",
    body: () => [
      "You have used your Move and your Tool, so it is time to draw. The top card of the deck is revealed and does exactly what it says.",
      "Most cards are Ravage cards, where nature fights back. Press Draw.",
    ],
    blocked: "Press Draw to finish your turn.",
    allows: (a) => a.type === "Draw",
    done: (s) => s.activeSeat !== TUTORIAL_SEAT || s.phase !== "turn",
  },
  {
    id: "ravage", presentation: "coach", kind: "info",
    title: "What just happened",
    nextLabel: "Good to know",
    body: (f) => {
      const r = f.ravage;
      if (!r) return ["A Ravage card calls tiles of one biome. Each called tile steps down one level, and the Pressure on the Metre decides how many are called."];
      const out: string[] = [`The ${r.card} card hit the ${r.biome} biome. The Metre was at Pressure ${f.pressure}, so it called ${r.calls} ${r.biome} tiles.`];
      const results: string[] = [];
      if (r.lost > 0) results.push(r.lost === 1 ? "One of them was already Vulnerable, so it is now Lost for good." : `${r.lost} of them were already Vulnerable, so they are now Lost for good.`);
      if (r.weakened > 0) results.push(r.weakened === 1 ? "Another was Healthy and became Vulnerable." : `${r.weakened} others were Healthy and became Vulnerable.`);
      if (results.length) out.push(results.join(" "));
      out.push("That is the rhythm of the game: repair Vulnerable tiles before the cards find them twice. Lost tiles cannot be walked over or restored. The turn now passes to the next Steward.");
      return out;
    },
  },

  // ---- primer pages: things the guided turn did not cover ----
  {
    id: "primer-protect", presentation: "modal", kind: "info", eyebrow: "Good to know 1 of 5",
    title: "Protecting tiles",
    body: () => [
      `Fortify: a Healthy tile that matches your Tool can take a Shield. The Shield soaks up the next hit, and the Metre goes down ${metre.fortify_ticks_down}.`,
      "Stabilise: no Tool? Stand on a Vulnerable tile and Stabilise it for free. A marker absorbs the next hit.",
      `Restore, Fortify and Stabilise all share your one Tool action each turn. There are only ${limits.shield_tokens} Shields and ${limits.stabilise_markers} markers for the whole table, so spend them where they matter.`,
    ],
  },
  {
    id: "primer-team", presentation: "modal", kind: "info", eyebrow: "Good to know 2 of 5",
    title: "Working together",
    body: () => [
      `Gift: give a Tool to a Steward standing on your tile. You get one Gift a turn, but at the Research Station you can trade as often as you like. A hand holds up to ${limits.hand} Tools.`,
      "Roles: Ranger and Engineer work all the time. Ecologist, Courier, Pilot and Activist each have an Ability button you can press once a turn.",
      "Talk it through. Everyone can see the board, and the best plans are shared.",
    ],
  },
  {
    id: "primer-trouble", presentation: "modal", kind: "info", eyebrow: "Good to know 3 of 5",
    title: "When things go wrong",
    body: () => [
      `A Steward standing on a tile when it is Lost is evacuated. They sit out some rounds (${evacuation}) and then return to the Research Station.`,
      `Cascade: when a biome loses its 5th tile, the Metre jumps up a band. Extinction: when all ${tiles.per_biome} tiles of a biome are Lost, it goes extinct and the Metre jumps again. A second extinction means collapse.`,
      "Surge: a few Ravage cards carry a Surge, which also pushes the Metre up a band.",
    ],
  },
  {
    id: "primer-events", presentation: "modal", kind: "info", eyebrow: "Good to know 4 of 5",
    title: "Event and Tool cards",
    body: () => [
      "Not every card is a Ravage. When you draw a Tool, you keep it, up to your hand limit. When you draw an Event, it does what it says straight away.",
      "Citizen Science lets you reorder the top 5 cards. Volunteer Day lets every Steward move 2 tiles for free. Industrial Lobby makes the next 2 Ravage cards call one extra tile. Heat Dome draws two more cards at once.",
    ],
  },
  {
    id: "primer-win", presentation: "modal", kind: "info", eyebrow: "Good to know 5 of 5",
    title: "How the game is won",
    nextLabel: "Finish",
    body: () => [
      "Pull the Metre down to the Trophy and the game moves to a final lap: every Steward, including the one who got there, plays one last turn. There are no draws in the final lap, so use it to repair and score.",
      `Legacy: each of your tokens on a Healthy tile is worth ${legacy.healthy_token} point, plus ${legacy.guardian_bonus} for each biome where you hold more than half the tokens on standing tiles. The highest Legacy wins. Ties go to the Steward with the most different biomes, then the most tokens.`,
      "If the Metre reaches Collapse first, or a second biome goes extinct, nobody wins.",
    ],
  },
  {
    id: "finish", presentation: "modal", kind: "info",
    title: "You are ready",
    body: () => [
      "That is everything you need to start playing. You can read the short rules at any time from How to play on the title screen.",
    ],
  },
];

export const FINISH_INDEX = TUTORIAL_STEPS.length - 1;

// ---------------------------------------------------------------- rules for stepping and gating

/**
 * Works out which step to show.
 *
 * `index` is where the player was. The game state can move that in two ways:
 *   * Forwards: an action step whose goal is already met is skipped.
 *   * Backwards: Undo can un-finish an action step. The earliest un-finished one wins.
 * Info steps only ever move on with the Next button.
 */
export function settle(steps: readonly TutorialStep[], index: number, s: State): number {
  let i = Math.min(Math.max(index, 0), steps.length - 1);
  for (let k = 0; k < i; k++) {
    const st = steps[k]!;
    if (st.kind === "action" && st.done && !st.done(s)) { i = k; break; }
  }
  while (i < steps.length - 1) {
    const st = steps[i]!;
    if (st.kind === "action" && st.done && st.done(s)) i++;
    else break;
  }
  return i;
}

/** Why the player may not do `a` right now, or null if it is the step's own action. */
export function blockReason(step: TutorialStep, a: Action, s: State): string | null {
  if (step.kind === "action") return step.allows && step.allows(a, s) ? null : step.blocked ?? "Follow the tip first.";
  return "Read the tip first, then press Next.";
}

/** "Step 3 of 10" for coach steps. Modal pages label themselves. Returns null for modals. */
export function coachProgress(steps: readonly TutorialStep[], index: number): { n: number; total: number } | null {
  const step = steps[index];
  if (!step || step.presentation !== "coach") return null;
  const coach = steps.filter((st) => st.presentation === "coach");
  return { n: coach.indexOf(step) + 1, total: coach.length };
}
