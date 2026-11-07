// The play guide: turns the live game state into plain "whose turn is it, what should I do now, what just happened".
//
// Pure logic, no React and no platform code, so it is unit-tested against the real engine.
// It never decides anything for the player. It only reads the state and the engine's own legality checks
// (engine.check), so the advice can never disagree with the rules.
import type { GameEvent, Player, State } from "@tipping-point/engine";
import { biomeName, cardById, content, engine } from "./content";
import { narrate } from "./narrate";
import { bandOf, counters, isPlaying, stabiliseError, toolOptions } from "./selectors";

export interface GuideWho { name: string; colour: string; isBot: boolean }

export interface Guide {
  mode: "over" | "decision" | "away" | "bot" | "turn" | "finalLap";
  who: GuideWho;
  /** One line that says whose turn it is. */
  headline: string;
  /** True for the first moments of a turn, before anything has been done. Used to say "pass the device". */
  fresh: boolean;
  /** The single best thing to do right now. */
  now: string;
  /** Other things that are possible this turn, most useful first. */
  also: string[];
  /** How the turn ends. */
  then: string;
  /** Plain description of the danger: how hard the next Ravage card will hit. */
  danger: string;
}

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

function who(p: Player): GuideWho { return { name: p.name, colour: p.colour, isBot: p.isBot === true }; }

/** What a pending decision asks for, in words a first-time player can act on. */
function decisionText(s: State): string {
  const p = s.pending!;
  const name = s.players[p.seat]!.name;
  switch (p.kind) {
    case "reorderTop5": return `${name}: put the top 5 cards of the deck in the order you want, then confirm.`;
    case "grantPick": return `${name}: choose a Tool card from the deck to take.`;
    case "volunteerMove": return `${name} may move up to 2 tiles. Tap a teal tile on the board, or press Stay put.`;
    case "squeezeReturn": return `${name}: choose a Tool to return to the deck.`;
    case "forecastKeepOrBottom": return `${name}: look at the top card, then keep it on top or move it to the bottom.`;
  }
}

export function dangerText(s: State): string {
  const pressure = bandOf(s.metreTicks);
  return `Pressure ${pressure} of 5: each Ravage card calls ${plural(pressure, "tile")}. Repairs lower it, Surges and lost tiles raise it.`;
}

interface Candidate { tool: string; tile: number; steps: number }

/** The nearest damaged tile that one of the held Tools can fix, reachable with the steps left. */
function nearestRepair(s: State, p: Player): Candidate | null {
  const reach = engine.moveTargets(s, p.id);
  let best: Candidate | null = null;
  for (const h of p.hand) {
    const card = cardById(h.cardId);
    if (!card || card.type !== "tool") continue;
    for (const [tile, path] of reach) {
      const t = s.tiles[tile]!;
      if (t.status !== "vulnerable" || t.biome !== card.biome) continue;
      if (!best || path.length < best.steps) best = { tool: card.name, tile, steps: path.length };
    }
  }
  return best;
}

/** True when some held Tool matches a damaged tile somewhere on the board, even if it is out of reach this turn. */
function farRepair(s: State, p: Player): string | null {
  for (const h of p.hand) {
    const card = cardById(h.cardId);
    if (!card || card.type !== "tool") continue;
    if (s.tiles.some((t) => t.status === "vulnerable" && t.biome === card.biome)) return biomeName(card.biome);
  }
  return null;
}

export function buildGuide(s: State): Guide {
  const danger = dangerText(s);
  const active = s.players[s.activeSeat]!;
  const base = { who: who(active), fresh: false, also: [] as string[], danger };

  if (s.phase === "over" || (!s.turn && !s.pending)) {
    return { ...base, mode: "over", headline: "The game is over.", now: "Look at the result screen.", then: "", };
  }

  if (s.pending) {
    const actor = s.players[s.pending.seat]!;
    return {
      ...base, who: who(actor), mode: "decision",
      headline: `${actor.name} has a decision to make.`,
      now: decisionText(s),
      then: "When this is done, the game carries on by itself.",
    };
  }

  const finalLap = s.phase === "finalLap";
  const c = counters(s);
  if (!isPlaying(s) || !c) {
    return { ...base, mode: "over", headline: "Waiting.", now: "Nothing to do right now.", then: "" };
  }

  const turnUsed = s.turn!.stepsUsed > 0 || s.turn!.toolActionUsed || s.turn!.giftUsed || Object.values(s.turn!.abilityUsed).some(Boolean);
  const fresh = !turnUsed;
  const lap = finalLap ? "Final lap: " : "";

  if (active.isBot) {
    return {
      ...base, fresh, mode: "bot",
      headline: `${lap}${active.name} (a bot) is playing.`,
      now: "Nothing for you to do. Watch the board and the log. Tap Next when a card appears.",
      then: "It will be a human's turn again shortly.",
    };
  }

  if (active.pos === null) {
    return {
      ...base, fresh, mode: "away",
      headline: `${lap}${active.name} is away from the board.`,
      now: "This Steward was evacuated, so there is nothing to do yet.",
      then: "Press Draw to carry on.",
    };
  }

  // ---- work out the best next step -------------------------------------------------------------
  const here = s.tiles[active.pos]!;
  const also: string[] = [];
  let now: string | null = null;

  const restoreIdx = active.hand.findIndex((_, i) => toolOptions(s, active, i).restore === null);
  const fortifyIdx = active.hand.findIndex((_, i) => toolOptions(s, active, i).fortify === null);
  const canStabilise = c.tool && stabiliseError(s, active) === null;

  if (c.tool && restoreIdx >= 0) {
    const name = cardById(active.hand[restoreIdx]!.cardId)?.name ?? "your Tool";
    now = `Repair this ${biomeName(here.biome)} tile. Tap the ${name} card in your hand, then press Restore. That is the best move there is: it lowers the Pressure.`;
  } else {
    const near = c.tool && c.moves > 0 ? nearestRepair(s, active) : null;
    if (near) {
      now = `Walk to the damaged ${biomeName(s.tiles[near.tile]!.biome)} tile (${plural(near.steps, "step")} away, pale with a dashed edge). Tap it, press Move here, then use your ${near.tool}.`;
    } else if (c.tool && active.hand.length > 0 && farRepair(s, active)) {
      now = `A ${farRepair(s, active)} tile is damaged but too far to reach and fix this turn. Tap a teal tile to move towards it.`;
    } else if (canStabilise) {
      now = `Stabilise this damaged ${biomeName(here.biome)} tile. It does not repair it, but it protects it from being lost. Tap your tile, then Stabilise.`;
    }
  }

  if (c.tool && fortifyIdx >= 0 && !(restoreIdx >= 0)) also.push(`Fortify this healthy tile: tap your ${biomeName(here.biome)} Tool card, then Fortify. A Shield soaks up the next hit.`);
  if (c.moves > 0 && now === null) also.push(`You can move up to ${plural(c.moves, "tile")}. Tap a teal tile, then press Move here.`);
  if (c.gift) also.push("Give a Tool to a Steward standing on the same tile: tap the card, then Give.");
  if (c.ability) also.push("Use your role ability: press Role (or Use ability) to see what it does.");

  if (now === null) {
    if (active.hand.length === 0) now = `You are holding no Tools, so there is nothing to repair with. You can move, or press Draw to end your turn and maybe pick one up.`;
    else {
      const biomes = new Set<string>();
      for (const h of active.hand) { const k = cardById(h.cardId); if (k && k.type === "tool") biomes.add(biomeName(k.biome)); }
      now = `A Tool only fixes its own biome (yours: ${[...biomes].join(", ")}), and none of those tiles are damaged right now. You can move, Gift your Tool to a Steward who can use it, or press Draw to end your turn.`;
    }
  }
  if (c.moves === 0 && !c.tool && !c.ability && !c.gift) now = finalLap ? "You are out of actions. Press End turn." : "You are out of actions. Press Draw to end your turn.";

  const then = finalLap
    ? "This is the last lap. There are no cards to draw. Press End turn when you are done."
    : "When you are done, press Draw. That ends your turn and reveals the top card. Most are Ravage cards that damage tiles, so repair first.";

  return {
    ...base, fresh, mode: finalLap ? "finalLap" : "turn",
    headline: finalLap ? `Final lap: ${active.name}'s last turn.` : `${active.name}, it's your turn.`,
    now, also: also.slice(0, 3), then,
  };
}

/** True when more than one human plays on this device, so a "pass the device" line makes sense. */
export function isPassAndPlay(s: State): boolean { return s.players.filter((p) => !p.isBot).length > 1; }

/** The last few things that happened since the previous turn began, as plain lines (oldest first). */
export function recap(s: State, events: readonly GameEvent[], max = 6): { text: string; tone: "neutral" | "good" | "bad" }[] {
  const starts: number[] = [];
  events.forEach((e, i) => { if (e.kind === "TurnStarted") starts.push(i); });
  // From the previous turn's start, but never include this turn's own "it is X's turn" line.
  const from = starts.length >= 2 ? starts[starts.length - 2]! : 0;
  const to = starts.length >= 1 ? starts[starts.length - 1]! : events.length;
  const out: { text: string; tone: "neutral" | "good" | "bad" }[] = [];
  for (const e of events.slice(from, to)) {
    if (e.kind === "TurnStarted" || e.kind === "GameStarted") continue;
    const l = narrate(content, s, e);
    if (l) out.push({ text: l.text, tone: l.tone });
  }
  return out.slice(-max);
}


// ---------------------------------------------------------------- what the guide points at

/** The objects on the table that the "Do this now" line names. Phase 5: the guide lights them, not only describes them. */
export interface GuideFocus {
  /** Tiles to light (a damaged tile to walk to, or the tile you stand on). */
  tiles: number[];
  /** The Tool cards in hand glow (the move is to use one). */
  hand: boolean;
  /** The draw pile pulses (the move is Draw). */
  deck: boolean;
}

const NO_FOCUS: GuideFocus = { tiles: [], hand: false, deck: false };

/**
 * Mirrors the order of choices in `buildGuide`, so what lights up always agrees with what the words say.
 * Pure and read-only, like the guide itself. Bots, decisions and finished games light nothing.
 */
export function guideFocus(s: State): GuideFocus {
  const g = buildGuide(s);
  if (g.mode !== "turn" && g.mode !== "finalLap" && g.mode !== "away") return NO_FOCUS;
  if (g.mode === "away") return { tiles: [], hand: false, deck: true };
  const active = s.players[s.activeSeat]!;
  const c = counters(s);
  if (!c || active.pos === null) return NO_FOCUS;
  const restoreIdx = active.hand.findIndex((_, i) => toolOptions(s, active, i).restore === null);
  if (c.tool && restoreIdx >= 0) return { tiles: [active.pos], hand: true, deck: false };
  const near = c.tool && c.moves > 0 ? nearestRepair(s, active) : null;
  if (near) return { tiles: [near.tile], hand: false, deck: false };
  if (c.tool && active.hand.length > 0 && farRepair(s, active)) return NO_FOCUS;
  if (c.tool && stabiliseError(s, active) === null) return { tiles: [active.pos], hand: false, deck: false };
  if (c.moves === 0 && !c.tool && !c.ability && !c.gift) return { tiles: [], hand: false, deck: true };
  return NO_FOCUS;
}
