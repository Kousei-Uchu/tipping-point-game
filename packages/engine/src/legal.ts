// Read-only helpers for UIs and bots. Nothing here mutates state.
import type { GameContent } from "@tipping-point/content";
import { apply } from "./apply";
import { pressureOf } from "./ctx";
import { reachable } from "./hex";
import type { Action, EngineError, Player, PlayerId, State } from "./types";

export const pressure = (s: State): number => pressureOf(s.metreTicks);

export const playerById = (s: State, id: PlayerId): Player | undefined => s.players.find((p) => p.id === id);
export const activePlayerOf = (s: State): Player => s.players[s.activeSeat]!;

/** Who must act next: the pending decision's seat, otherwise the active seat. */
export function actorSeat(s: State): number { return s.pending ? s.pending.seat : s.activeSeat; }

/** Dry run: `null` means the action would be accepted. Uses the real rules, so UI and engine cannot drift apart. */
export function check(content: GameContent, s: State, action: Action, actor: PlayerId): EngineError | null {
  const r = apply(content, s, action, actor);
  return r.ok ? null : r.error;
}

/** Tiles the active pawn can walk to this turn, with the path to each (excluding the start tile). */
export function moveTargets(content: GameContent, s: State, playerId: PlayerId, maxStepsOverride?: number): Map<number, number[]> {
  const p = playerById(s, playerId);
  if (!p || p.pos === null || !s.turn) return new Map();
  const left = maxStepsOverride ?? content.rules.turn.move - s.turn.stepsUsed;
  if (left <= 0) return new Map();
  const adj = { neighbours: content.board.tiles.map((t) => t.neighbours) };
  return reachable(s.tiles, adj, p.pos, {
    maxSteps: left,
    passRemoved: p.roles.includes("ranger"),
    // Improvise belongs to the active Steward only (matters for Volunteer Day moves by others).
    crossBudget: p.seat === s.activeSeat && s.turn.improvising && !s.turn.improviseCrossed ? 1 : 0,
  });
}

export function isStranded(content: GameContent, s: State, playerId: PlayerId): boolean {
  const p = playerById(s, playerId);
  if (!p || p.pos === null) return false;
  return content.board.tiles[p.pos]!.neighbours.every((n) => s.tiles[n]!.status === "removed");
}

/** Undo is a client feature (a stack of earlier States). It is allowed until a card is revealed. */
export function undoAllowed(s: State): boolean {
  return s.phase === "turn" && !!s.turn && !s.turn.undoLocked && !s.pending;
}

export function stepsLeft(content: GameContent, s: State): number {
  return s.turn ? Math.max(0, content.rules.turn.move - s.turn.stepsUsed) : 0;
}

/** Screen-reader label, as in UI_Spec section 8: "Forest, vulnerable, owned by Mia, 2 steps away". */
export function describeTile(content: GameContent, s: State, tileId: number, fromTile?: number | null): string {
  const t = s.tiles[tileId]!;
  const name = t.biome === "hub" ? content.hub.name : content.biomes[t.biome].name;
  const parts = [name, t.status];
  if (t.shield) parts.push("shielded");
  if (t.stabilised) parts.push("stabilised");
  const owner = t.owner ? s.players.find((p) => p.id === t.owner) : null;
  if (owner) parts.push(`owned by ${owner.name}`);
  const here = s.players.filter((p) => p.pos === tileId).map((p) => p.name);
  if (here.length) parts.push(`${here.join(" and ")} here`);
  if (fromTile != null && fromTile !== tileId) {
    const a = s.tiles[fromTile]!, b = t;
    const d = Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.q + a.r - b.q - b.r));
    parts.push(`${d} step${d === 1 ? "" : "s"} away`);
  }
  return parts.join(", ");
}
