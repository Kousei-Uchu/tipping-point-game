import type { Card, GameContent, RavageCard, ToolCard } from "@tipping-point/content";
import type { EngineError, GameEvent, HeldTool, Player, State, Tile } from "./types";
import type { Rng } from "./rng";

/** Mutable working context for ONE apply() call. The input State is never touched (we work on a clone). */
export interface Ctx {
  s: State;
  c: GameContent;
  rng: Rng;
  ev: GameEvent[];
  cards: ReadonlyMap<string, Card>;
  suppress: boolean;      // Opening Strike: no Metre moves, no Lobby/Activist, no collapse
  trophyJustReached: boolean;
}

export class Fail extends Error {
  constructor(public code: EngineError) { super(code); }
}
export const fail = (code: EngineError): never => { throw new Fail(code); };

export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;   // State is plain JSON (also safe on Hermes)

const cardCache = new WeakMap<GameContent, Map<string, Card>>();
export function cardMap(c: GameContent): Map<string, Card> {
  let m = cardCache.get(c);
  if (!m) { m = new Map(c.cards.map((k) => [k.id, k])); cardCache.set(c, m); }
  return m;
}

export function emit(x: Ctx, kind: string, data: Record<string, unknown> = {}): void {
  x.ev.push({ seq: x.s.eventSeq++, kind, ...data });
}

export const pressureOf = (ticks: number): number => Math.min(5, Math.max(1, Math.ceil(ticks / 8)));

export const activePlayer = (s: State): Player => s.players[s.activeSeat]!;
export const tileOf = (s: State, id: number): Tile => s.tiles[id]!;
export const toolCard = (x: Ctx, id: string): ToolCard => {
  const k = x.cards.get(id);
  if (!k || k.type !== "tool") return fail("E_NO_SUCH_CARD");
  return k;
};
export const ravageCard = (x: Ctx, id: string): RavageCard => x.cards.get(id) as RavageCard;

export function newHeldTool(x: Ctx, cardId: string): HeldTool {
  const k = toolCard(x, cardId);
  return { cardId, usesLeft: k.programme ? x.c.rules.deck.programme_uses : 1, usedOn: [] };
}

/** "Reinsert at a random position": index = rng.int(0, deck.length), inclusive, as the sim's back(). */
export function reinsert(x: Ctx, cardId: string): void {
  const i = x.rng.int(0, x.s.deck.length);
  x.s.deck.splice(i, 0, cardId);
  emit(x, "CardReinserted", { cardId, index: i });
}

export function seatsFrom(s: State, startSeat: number): number[] {
  const n = s.players.length;
  return Array.from({ length: n }, (_, k) => (startSeat + k) % n);
}
