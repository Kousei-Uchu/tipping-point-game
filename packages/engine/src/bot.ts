// Bots (Bot_Spec draft 1). They use exactly the same check/apply as humans and see no hidden information:
// only the top-of-deck peek the Ecologist role grants (via the pending Forecast decision).
//
// chooseAction is a PURE function of (state, player): same state, same answer. Tie-breaks and "sloppy turn"
// dice come from a throwaway RNG seeded by (seed, eventSeq), so human actions never shift a bot's decisions
// in a way that depends on hidden app state, and replays stay exact.
import type { GameContent, BiomeId } from "@tipping-point/content";
import { hexDistance } from "./hex";
import { mulberry32 } from "./rng";
import { check, moveTargets, playerById } from "./legal";
import { pressureOf } from "./ctx";
import type { Action, Player, PlayerId, State } from "./types";

export type BotLevel = "easy" | "normal" | "hard";
export type BotMode = "cooperative" | "balanced" | "selfish";

/** Chance a bot plays its best plan on a given turn (Bot_Spec section 4). */
export const CARE: Record<BotLevel, number> = { easy: 0.4, normal: 0.7, hard: 1.0 };

interface Env { c: GameContent; s: State; p: Player; rnd: () => number }

const cardOf = (e: Env, id: string) => e.c.cards.find((k) => k.id === id);
const toolBiome = (e: Env, id: string): BiomeId | null => { const k = cardOf(e, id); return k?.type === "tool" ? k.biome : null; };
const vulnCount = (s: State, b: BiomeId) => s.tiles.filter((t) => t.biome === b && t.status === "vulnerable").length;

/** Expected damage of a card if drawn next (higher is worse). Bot_Spec section 2. */
function threat(e: Env, cardId: string): number {
  const k = cardOf(e, cardId);
  if (!k || k.type !== "ravage") return 0;
  if (e.s.extinct[k.biome]) return k.surge ? 2 : 0;
  return vulnCount(e.s, k.biome) + (k.surge ? 2 : 0) + 0.01;
}

/** Restore targets worth walking to: tile id -> score. */
function restoreTargets(e: Env): { tile: number; path: number[]; score: number; toolIndex: number }[] {
  const { s, p, c } = e;
  const engineer = p.roles.includes("engineer");
  const reach = moveTargets(c, s, p.id);
  if (p.pos !== null) reach.set(p.pos, []);                       // standing still is a candidate too
  const out: { tile: number; path: number[]; score: number; toolIndex: number }[] = [];
  for (const [tile, path] of reach) {
    const t = s.tiles[tile]!;
    if (t.status !== "vulnerable" || t.biome === "hub") continue;
    const toolIndex = p.hand.findIndex((h) => engineer || toolBiome(e, h.cardId) === t.biome);
    if (toolIndex < 0) continue;
    const b = t.biome as BiomeId;
    let score = 0;
    if (s.removedByBiome[b] === 4 || s.removedByBiome[b] === 9) score += 4;           // one from Cascade / extinction
    score += t.owner && t.owner !== p.id ? 1 : 0;
    score += 2 * (vulnCount(s, b) / 10);
    score -= 0.05 * path.length;
    score += e.rnd() * 0.3;
    out.push({ tile, path, score, toolIndex });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** The Vulnerable tile (any biome) a bot would most like to be next to: nearest one a held Tool matches. */
function workTarget(e: Env): number | null {
  const { s, p } = e;
  if (p.pos === null) return null;
  const engineer = p.roles.includes("engineer");
  const here = s.tiles[p.pos]!;
  let best: number | null = null, bestD = Infinity;
  for (const t of s.tiles) {
    if (t.status !== "vulnerable" || t.biome === "hub") continue;
    if (!engineer && !p.hand.some((h) => toolBiome(e, h.cardId) === t.biome)) continue;
    const d = hexDistance(here, t);
    if (d < bestD) { bestD = d; best = t.id; }
  }
  return best;
}

function stepToward(e: Env, target: number): Action | null {
  const { s, p, c } = e;
  if (p.pos === null) return null;
  const reach = moveTargets(c, s, p.id);
  let bestPath: number[] | null = null, bestD = hexDistance(s.tiles[p.pos]!, s.tiles[target]!);
  for (const [tile, path] of reach) {
    const d = hexDistance(s.tiles[tile]!, s.tiles[target]!);
    // Prefer ending on a Healthy tile or the Hub, never on a Vulnerable tile unless it is the target.
    const safe = s.tiles[tile]!.status === "healthy" || s.tiles[tile]!.biome === "hub" || tile === target;
    if (d < bestD && safe) { bestD = d; bestPath = path; }
  }
  return bestPath ? { type: "Move", path: bestPath } : null;
}

function answerPending(e: Env): Action {
  const { s } = e;
  const pd = s.pending!;
  switch (pd.kind) {
    case "reorderTop5": {
      // Least threatening first, worst card last.
      const order = [...pd.cardIds].sort((a, b) => threat(e, a) - threat(e, b));
      return { type: "Resolve", payload: { order } };
    }
    case "grantPick": {
      const pl = s.players[pd.seat]!;
      const wanted = s.tiles.filter((t) => t.status === "vulnerable" && t.biome !== "hub").map((t) => t.biome as BiomeId);
      const tools = s.deck.filter((id) => cardOf(e, id)?.type === "tool");
      const score = (id: string) => { const b = toolBiome(e, id)!; return (pl.roles.includes("engineer") ? 1 : 0) + wanted.filter((w) => w === b).length; };
      const pick = [...tools].sort((a, b) => score(b) - score(a))[0];
      return { type: "Resolve", payload: { cardId: pick } };
    }
    case "volunteerMove": {
      const q = s.players[pd.seat]!;
      const me = { ...e, p: q };
      const target = workTarget(me);
      if (target !== null && q.pos !== null) {
        const reach = moveTargets(e.c, s, q.id, 2);
        let bestPath: number[] = [], bestD = hexDistance(s.tiles[q.pos]!, s.tiles[target]!);
        for (const [tile, path] of reach) {
          const d = hexDistance(s.tiles[tile]!, s.tiles[target]!);
          if (d < bestD && s.tiles[tile]!.status !== "vulnerable") { bestD = d; bestPath = path; }
        }
        return { type: "Resolve", payload: { path: bestPath } };
      }
      return { type: "Resolve", payload: { path: [] } };
    }
    case "squeezeReturn": {
      // Return the Tool whose biome has the fewest Vulnerable tiles.
      const q = s.players[pd.seat]!;
      let idx = 0, worst = Infinity;
      q.hand.forEach((h, i) => { const b = toolBiome(e, h.cardId); const v = b ? vulnCount(s, b) : 0; if (v < worst) { worst = v; idx = i; } });
      return { type: "Resolve", payload: { handIndex: idx } };
    }
    case "forecastKeepOrBottom": {
      // Move the top card to the bottom only if it is in the top third of threats.
      const t = threat(e, pd.cardId);
      return { type: "Resolve", payload: { bottom: t >= 3 } };
    }
  }
}

/** A "sloppy" turn (Bot_Spec section 4): a few random legal actions, then draw. */
function sloppyAction(e: Env, candidates: Action[]): Action {
  const legal = candidates.filter((a) => check(e.c, e.s, a, e.p.id) === null);
  if (!legal.length || e.rnd() < 0.4) return { type: "Draw" };
  return legal[Math.floor(e.rnd() * legal.length)]!;
}

/**
 * The next action the bot in the acting seat would take. Always returns a legal action, ending with Draw.
 * Callers loop: while the game is live and the actor is a bot, apply chooseAction.
 */
export function chooseAction(c: GameContent, s: State, actorId?: PlayerId): Action {
  const seat = s.pending ? s.pending.seat : s.activeSeat;
  const p = actorId ? playerById(s, actorId)! : s.players[seat]!;
  const rnd = mulberry32((s.seed ^ Math.imul(s.eventSeq + 1, 0x9e3779b1)) >>> 0).next;
  const e: Env = { c, s, p, rnd };
  if (s.pending) return answerPending(e);
  if (!s.turn || p.pos === null) return { type: "Draw" };

  const level: BotLevel = p.botLevel ?? "normal";
  const turnDice = mulberry32((s.seed + s.round * 7919 + p.seat * 104729) >>> 0).next();
  if (turnDice >= CARE[level]) {
    const cands: Action[] = [];
    const reach = [...moveTargets(c, s, p.id).values()];
    if (reach.length) cands.push({ type: "Move", path: reach[Math.floor(rnd() * reach.length)]! });
    p.hand.forEach((_, i) => cands.push({ type: "UseTool", handIndex: i, kind: "restore" }, { type: "UseTool", handIndex: i, kind: "fortify" }));
    cands.push({ type: "Stabilise" });
    return sloppyAction(e, cands);
  }

  const ok = (a: Action) => check(c, s, a, p.id) === null;

  // 1. Restore, walking first when needed.
  const targets = restoreTargets(e);
  const best = targets[0];
  if (best) {
    if (best.tile === p.pos) {
      const a: Action = { type: "UseTool", handIndex: best.toolIndex, kind: "restore" };
      if (ok(a)) return a;
    } else if (best.path.length) {
      const a: Action = { type: "Move", path: best.path };
      if (ok(a)) return a;
    }
  }

  // 2. Fortify a spare matching Tool on a Healthy tile (only once there is nothing left to restore).
  const here = s.tiles[p.pos]!;
  if (!best && here.status === "healthy" && here.biome !== "hub") {
    for (let i = 0; i < p.hand.length; i++) { const a: Action = { type: "UseTool", handIndex: i, kind: "fortify" }; if (ok(a)) return a; }
  }

  // 3. Stabilise when standing on a Vulnerable tile and there is no Tool to restore it.
  if (here.status === "vulnerable" && !best && !s.turn.toolActionUsed) {
    const a: Action = { type: "Stabilise" };
    if (ok(a)) return a;
  }

  // 4. Role abilities.
  if (p.roles.includes("ecologist") && !s.turn.abilityUsed.ecologist && !s.turn.spentToolOrStabilise && !s.turn.toolActionUsed) {
    const a: Action = { type: "UseAbility", role: "ecologist" };
    if (ok(a)) return a;
  }
  if (p.roles.includes("activist") && !s.turn.abilityUsed.activist && pressureOf(s.metreTicks) >= 3) {
    const a: Action = { type: "UseAbility", role: "activist" };
    if (ok(a)) return a;
  }

  // 5. Walk toward work.
  const target = workTarget(e);
  if (target !== null && target !== p.pos) { const a = stepToward(e, target); if (a && ok(a)) return a; }

  return { type: "Draw" };
}
