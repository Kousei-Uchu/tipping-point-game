// Read-only view helpers. Legality always comes from the engine's dry run (engine.check),
// so the buttons can never disagree with the rules.
import type { EngineError, Player, PlayerId, RoleId, State } from "@tipping-point/engine";
import { computeLegacy, hexDistance } from "@tipping-point/engine";
import { content, engine, isActiveRole } from "./content";

export const actorId = (s: State): PlayerId => s.players[s.pending ? s.pending.seat : s.activeSeat]!.id;
export const activePlayer = (s: State): Player => s.players[s.activeSeat]!;
export const playersAt = (s: State, tile: number): Player[] => s.players.filter((p) => p.pos === tile);
export const isPlaying = (s: State): boolean => s.phase === "turn" || s.phase === "finalLap";

export interface Counters { moves: number; tool: boolean; ability: boolean; gift: boolean }

export function counters(s: State): Counters | null {
  if (!s.turn || !isPlaying(s)) return null;
  const p = activePlayer(s);
  const abilityReady = p.roles.some((r) => isActiveRole(r) && !s.turn!.abilityUsed[r]);
  return {
    moves: engine.stepsLeft(s),
    tool: !s.turn.toolActionUsed,
    ability: abilityReady,
    gift: !s.turn.giftUsed || p.pos === content.board.hubId,
  };
}

/** Only used when the turn is about to end: what the Draw confirm sheet should warn about. */
export function unusedActions(s: State): string[] {
  const c = counters(s);
  if (!c || s.phase === "finalLap") return [];
  const out: string[] = [];
  if (c.moves > 0) out.push(`${c.moves} ${c.moves === 1 ? "move" : "moves"}`);
  const p = activePlayer(s);
  const hasTool = p.hand.length > 0;
  if (c.tool && hasTool) out.push("a Tool action");
  return out;
}

export interface ToolOptions { restore: EngineError | null; fortify: EngineError | null }

export function toolOptions(s: State, who: Player, handIndex: number): ToolOptions {
  return {
    restore: engine.check(s, { type: "UseTool", handIndex, kind: "restore" }, who.id),
    fortify: engine.check(s, { type: "UseTool", handIndex, kind: "fortify" }, who.id),
  };
}

export const stabiliseError = (s: State, who: Player): EngineError | null => engine.check(s, { type: "Stabilise" }, who.id);

/** Stewards this card can be given to right now (same tile, space in hand, gift allowed). */
export function giftTargets(s: State, who: Player, handIndex: number): Player[] {
  return s.players.filter((q) => q.id !== who.id && engine.check(s, { type: "Gift", toPlayer: q.id, handIndex }, who.id) === null);
}

export type AbilityStatus =
  | { kind: "passive" }
  | { kind: "ready" }
  | { kind: "choice"; needs: "courier" | "pilot" }
  | { kind: "blocked"; error: EngineError };

export function abilityStatus(s: State, who: Player, role: RoleId): AbilityStatus {
  if (!isActiveRole(role)) return { kind: "passive" };
  if (role === "courier" || role === "pilot") {
    if (s.turn?.abilityUsed[role]) return { kind: "blocked", error: "E_ACTION_USED" };
    if (role === "courier") {
      const others = s.players.some((q) => q.id !== who.id && q.pos !== null && q.hand.length < content.rules.limits.hand);
      if (!who.hand.length || !others || who.pos === null) return { kind: "blocked", error: "E_BAD_PAYLOAD" };
    } else if (!pilotDestinations(s, who).length) return { kind: "blocked", error: "E_BAD_PAYLOAD" };
    return { kind: "choice", needs: role };
  }
  const err = engine.check(s, { type: "UseAbility", role }, who.id);
  return err ? { kind: "blocked", error: err } : { kind: "ready" };
}

export function pilotDestinations(s: State, who: Player): number[] {
  const set = new Set<number>();
  for (const q of s.players) if (q.id !== who.id && q.pos !== null) set.add(q.pos);
  return [...set];
}

export function courierTargets(s: State, who: Player): Player[] {
  return s.players.filter((q) => q.id !== who.id && q.pos !== null && q.hand.length < content.rules.limits.hand);
}

export const stepsBetween = (s: State, a: number, b: number): number => hexDistance(s.tiles[a]!, s.tiles[b]!);

/** Live Legacy readout (wf2). Same maths as the final score. */
export function legacyNow(s: State) { return computeLegacy(s, content.rules.legacy.guardian_bonus); }

/** The Metre's five bands, top (pressure 5) to bottom (pressure 1). */
export function bandOf(ticks: number): number { return Math.min(5, Math.max(1, Math.ceil(ticks / content.rules.metre.ticks_per_band))); }

