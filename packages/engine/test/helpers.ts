import { content } from "@tipping-point/content";
import type { ApplyResult, Action, State } from "../src";
import { apply, createGame } from "../src";

export const C = content;

export function newGame(opts: { seed?: number; players?: number; difficulty?: "easy" | "normal" | "hard" } = {}): State {
  const n = opts.players ?? 3;
  const names = ["Mia", "Raj", "Ben", "Zoe", "Kai"];
  return createGame(C, {
    seed: opts.seed ?? 1,
    difficulty: opts.difficulty ?? "normal",
    players: Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: names[i]! })),
  }).state;
}

export const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export function ok(r: ApplyResult): { state: State; events: { kind: string; [k: string]: unknown }[] } {
  if (!r.ok) throw new Error("expected ok, got " + r.error);
  return r;
}
export const doit = (s: State, a: Action, who?: string) => ok(apply(C, s, a, who ?? `p${s.pending ? s.pending.seat : s.activeSeat}`));
export const err = (s: State, a: Action, who?: string) => {
  const r = apply(C, s, a, who ?? `p${s.pending ? s.pending.seat : s.activeSeat}`);
  if (r.ok) throw new Error("expected an error");
  return r.error;
};

export const ravageId = (biome: string, surge: boolean) =>
  C.cards.find((c) => c.type === "ravage" && c.biome === biome && c.surge === surge)!.id;
export const toolId = (biome: string, programme = false) =>
  C.cards.find((c) => c.type === "tool" && c.biome === biome && c.programme === programme)!.id;
export const eventId = (key: string) => C.cards.find((c) => c.type === "event" && c.key === key)!.id;

/** Put a card on top of the deck (removing any other copy first so the 60-card invariant holds). */
export function putOnTop(s: State, cardId: string): State {
  const t = clone(s);
  for (const p of t.players) p.hand = p.hand.filter((h) => h.cardId !== cardId);
  t.deck = [cardId, ...t.deck.filter((id) => id !== cardId)];
  return t;
}

export function biomeTiles(s: State, biome: string) { return s.tiles.filter((t) => t.biome === biome); }

/** Reset the board to all healthy / no owners, and set removed counts etc. consistently. */
export function cleanBoard(s: State): State {
  const t = clone(s);
  for (const x of t.tiles) { x.status = "healthy"; x.shield = false; x.stabilised = false; x.owner = null; }
  for (const k of Object.keys(t.removedByBiome)) { (t.removedByBiome as Record<string, number>)[k] = 0; (t.cascaded as Record<string, boolean>)[k] = false; (t.extinct as Record<string, boolean>)[k] = false; }
  t.extinctCount = 0; t.shieldSupply = 8; t.stabiliseSupply = 6;
  for (const p of t.players) { p.tokensInSupply = 12; p.awayTurns = 0; p.pos = C.board.hubId; }
  return t;
}

/** Make `removed` tiles of a biome removed, `vulnerable` tiles vulnerable, rest healthy. */
export function shapeBiome(s: State, biome: string, removed: number, vulnerable: number): State {
  const t = cleanBoard(s);
  const ts = biomeTiles(t, biome);
  ts.forEach((x, i) => { if (i < removed) x.status = "removed"; else if (i < removed + vulnerable) x.status = "vulnerable"; });
  (t.removedByBiome as Record<string, number>)[biome] = removed;
  if (removed >= 5) (t.cascaded as Record<string, boolean>)[biome] = true;
  return t;
}
