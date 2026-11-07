import { describe, expect, it } from "vitest";
import { BIOME_IDS } from "@tipping-point/content";
import { apply, check, createGame, mulberry32, moveTargets, type Action, type State } from "../src";
import { C } from "./helpers";

/** Invariants from UI_Spec section 11 (adapted to action boundaries). */
function invariants(s: State): string[] {
  const bad: string[] = [];
  if (s.tiles.length !== 61) bad.push("tile count");
  const held = s.players.reduce((n, p) => n + p.hand.length, 0);
  const queued = s.continuations.filter((c) => c.kind === "reinsert").length;
  // When a game ends mid-card (Skull or extinction), the card in flight is dropped with the queue, so count only live games.
  if (s.phase !== "over" && s.deck.length + held + queued !== 60) bad.push(`cards ${s.deck.length}+${held}+${queued}`);
  if (s.players.some((p) => p.hand.length > 3)) bad.push("hand > 3");
  const shields = s.tiles.filter((t) => t.shield).length, markers = s.tiles.filter((t) => t.stabilised).length;
  if (shields + s.shieldSupply !== 8 || s.shieldSupply < 0) bad.push("shield supply");
  if (markers + s.stabiliseSupply !== 6 || s.stabiliseSupply < 0) bad.push("marker supply");
  for (const p of s.players) {
    if (s.tiles.filter((t) => t.owner === p.id).length + p.tokensInSupply !== 12) bad.push("token conservation " + p.id);
    if (p.pos !== null && s.tiles[p.pos]!.status === "removed") bad.push("pawn on removed tile");
  }
  for (const t of s.tiles) {
    if (t.status === "removed" && (t.owner || t.shield || t.stabilised)) bad.push("removed tile carries stuff");
    if (t.shield && t.status !== "healthy") bad.push("shield on non-healthy");
    if (t.stabilised && t.status !== "vulnerable") bad.push("marker on non-vulnerable");
  }
  for (const b of BIOME_IDS) if (s.tiles.filter((t) => t.biome === b && t.status === "removed").length !== s.removedByBiome[b]) bad.push("removed count " + b);
  if (s.phase === "turn" && (s.metreTicks < 1 || s.metreTicks > 40)) bad.push("ticks out of range " + s.metreTicks);
  return bad;
}

function randomAction(s: State, rnd: () => number): { a: Action; who: string } {
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)]!;
  if (s.pending) {
    const pd = s.pending, who = s.players[pd.seat]!.id;
    switch (pd.kind) {
      case "reorderTop5": return { who, a: { type: "Resolve", payload: { order: rnd() < 0.5 ? pd.cardIds : [...pd.cardIds].reverse() } } };
      case "grantPick": return { who, a: { type: "Resolve", payload: { cardId: s.deck.find((id) => C.cards.find((c) => c.id === id)!.type === "tool") } } };
      case "volunteerMove": return { who, a: { type: "Resolve", payload: { path: [] } } };
      case "squeezeReturn": return { who, a: { type: "Resolve", payload: { handIndex: 0 } } };
      case "forecastKeepOrBottom": return { who, a: { type: "Resolve", payload: { bottom: rnd() < 0.5 } } };
    }
  }
  const p = s.players[s.activeSeat]!;
  const cands: Action[] = [];
  const targets = [...moveTargets(C, s, p.id).values()];
  if (targets.length) cands.push({ type: "Move", path: pick(targets) });
  p.hand.forEach((_, i) => { cands.push({ type: "UseTool", handIndex: i, kind: "restore" }, { type: "UseTool", handIndex: i, kind: "fortify" }, { type: "Improvise", handIndex: i }); });
  cands.push({ type: "Stabilise" });
  for (const q of s.players) if (q !== p) p.hand.forEach((_, i) => cands.push({ type: "Gift", toPlayer: q.id, handIndex: i }));
  for (const r of p.roles) {
    cands.push({ type: "UseAbility", role: r });
    for (const q of s.players) if (q !== p) {
      if (r === "pilot" && q.pos !== null) cands.push({ type: "UseAbility", role: r, payload: { to: q.pos } });
      p.hand.forEach((_, i) => cands.push({ type: "UseAbility", role: r, payload: { toPlayer: q.id, handIndex: i } }));
    }
  }
  const legal = cands.filter((a) => check(C, s, a, p.id) === null);
  const useDraw = legal.length === 0 || rnd() < 0.18;
  return { who: p.id, a: useDraw ? { type: "Draw" } : pick(legal) };
}

describe("random play keeps every invariant", () => {
  it("300 seeded games, all difficulties and table sizes", () => {
    const stats = { over: 0, trophy: 0, collapse: 0, actions: 0 };
    for (let g = 0; g < 300; g++) {
      const n = 2 + (g % 4), diff = (["easy", "normal", "hard"] as const)[g % 3]!;
      let s = createGame(C, { seed: 1000 + g, difficulty: diff, players: Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` })) }).state;
      const rnd = mulberry32(g + 7).next;
      for (let step = 0; step < 2500 && s.phase !== "over"; step++) {
        const { a, who } = randomAction(s, rnd);
        const r = apply(C, s, a, who);
        if (!r.ok) throw new Error(`game ${g} step ${step}: chosen action ${JSON.stringify(a)} failed with ${r.error}`);
        s = r.state; stats.actions++;
        const bad = invariants(s);
        if (bad.length) throw new Error(`game ${g} step ${step} after ${JSON.stringify(a)}: ${bad.join("; ")}`);
      }
      if (s.phase === "over") { stats.over++; stats[s.result!.kind]++; }
    }
    expect(stats.over).toBeGreaterThan(100);
    // This simulates 300 full games, which takes well over vitest's 5s default.
  }, 120_000);
});
