import type { EventCard } from "@tipping-point/content";
import { emit, fail, newHeldTool, ravageCard, reinsert, seatsFrom, tileOf, type Ctx } from "./ctx";
import { resolveRavage } from "./ravage";
import { endTurn } from "./turn";
import { reachable } from "./hex";

export const MAX_HEAT_DEPTH = 3;   // SD-7

export function drawAndResolve(x: Ctx, depth: number): void {
  const s = x.s;
  const id = s.deck.shift();
  if (id === undefined) throw new Error("deck ran out (invariant broken)");
  emit(x, "CardDrawn", { cardId: id, depth, seat: s.activeSeat });
  const card = x.cards.get(id)!;
  if (card.type === "tool") {
    const p = s.players[s.activeSeat]!;
    if (p.hand.length < x.c.rules.limits.hand) {
      p.hand.push(newHeldTool(x, id));
      emit(x, "ToolKept", { seat: p.seat, cardId: id });
    } else {
      emit(x, "HandOverflowBounced", { seat: p.seat, cardId: id });
      reinsert(x, id);
    }
  } else if (card.type === "ravage") {
    resolveRavage(x, ravageCard(x, id));
  } else {
    runEvent(x, card, depth);
  }
}

/** Runs queued work (reinserts, Heat Dome draws, end of turn) until a decision is needed or nothing is left. */
export function drain(x: Ctx): void {
  const s = x.s;
  while (!s.pending && s.continuations.length > 0 && s.phase !== "over") {
    const c = s.continuations.pop()!;
    if (c.kind === "reinsert") reinsert(x, c.cardId);
    else if (c.kind === "heat") {
      if (c.left > 1) s.continuations.push({ kind: "heat", left: c.left - 1, depth: c.depth });
      drawAndResolve(x, c.depth + 1);
    } else endTurn(x);
  }
  if (s.phase === "over") s.continuations = [];
}

function runEvent(x: Ctx, card: EventCard, depth: number): void {
  const s = x.s;
  s.continuations.push({ kind: "reinsert", cardId: card.id });          // card goes back after it resolves
  emit(x, "EventStarted", { cardId: card.id, key: card.key });
  const seat = s.activeSeat;
  switch (card.key) {
    case "citizen":
      s.pending = { kind: "reorderTop5", seat, cardIds: s.deck.slice(0, 5) };
      break;
    case "grant": {
      const p = s.players[seat]!;
      const hasTool = s.deck.some((id) => x.cards.get(id)?.type === "tool");
      if (p.hand.length < x.c.rules.limits.hand && hasTool) s.pending = { kind: "grantPick", seat };
      else emit(x, "EventResolved", { key: "grant", note: "nothing taken" });   // SD-5
      break;
    }
    case "volunteer": {
      const order = seatsFrom(s, seat).filter((k) => s.players[k]!.pos !== null);
      const first = order.shift();
      if (first !== undefined) s.pending = { kind: "volunteerMove", seat: first, remaining: order };
      break;
    }
    case "lobby":
      s.lobbyCharges += 2;
      emit(x, "EventResolved", { key: "lobby", charges: s.lobbyCharges });
      break;
    case "squeeze":
      squeezeFrom(x, seatsFrom(s, seat));
      break;
    case "heat":
      if (depth >= MAX_HEAT_DEPTH) emit(x, "EventResolved", { key: "heat", note: "depth cap" });   // SD-7
      else s.continuations.push({ kind: "heat", left: 2, depth });
      break;
  }
}

/** Supply Squeeze: each Steward with a Tool returns one of their choice (auto when they hold only one). */
function squeezeFrom(x: Ctx, order: number[]): void {
  const s = x.s;
  const queue = [...order];
  while (queue.length) {
    const seat = queue.shift()!;
    const p = s.players[seat]!;
    if (p.hand.length === 0) continue;
    if (p.hand.length === 1) { returnTool(x, seat, 0); continue; }
    s.pending = { kind: "squeezeReturn", seat, remaining: queue };
    return;
  }
}

function returnTool(x: Ctx, seat: number, handIndex: number): void {
  const p = x.s.players[seat]!;
  const [t] = p.hand.splice(handIndex, 1);
  if (!t) return fail("E_BAD_PAYLOAD");
  emit(x, "ToolReturned", { seat, cardId: t.cardId });
  reinsert(x, t.cardId);                                             // comes back fresh (new HeldTool when drawn)
}
export { returnTool };

/** Answers the pending decision. Throws Fail on bad input. */
export function resolvePending(x: Ctx, payload: unknown): void {
  const s = x.s;
  const pend = s.pending;
  if (!pend) return fail("E_PHASE");
  const pl = (payload ?? {}) as Record<string, unknown>;
  switch (pend.kind) {
    case "reorderTop5": {
      const order = pl.order;
      if (!Array.isArray(order) || order.length !== pend.cardIds.length) return fail("E_BAD_PAYLOAD");
      if ([...order].sort().join() !== [...pend.cardIds].sort().join()) return fail("E_BAD_PAYLOAD");
      s.deck.splice(0, order.length, ...(order as string[]));
      s.pending = null;
      emit(x, "DeckReordered", { seat: pend.seat, count: order.length });
      break;
    }
    case "grantPick": {
      const id = pl.cardId;
      const i = typeof id === "string" ? s.deck.indexOf(id) : -1;
      if (i < 0 || x.cards.get(id as string)?.type !== "tool") return fail("E_BAD_PAYLOAD");
      s.deck.splice(i, 1);
      s.players[pend.seat]!.hand.push(newHeldTool(x, id as string));
      s.pending = null;
      emit(x, "GrantTaken", { seat: pend.seat, cardId: id });
      break;
    }
    case "volunteerMove": {
      const path = Array.isArray(pl.path) ? (pl.path as number[]) : [];
      const p = s.players[pend.seat]!;
      if (path.length > 0) {
        if (path.length > 2 || p.pos === null) return fail("E_STEPS");
        const adj = { neighbours: x.c.board.tiles.map((t) => t.neighbours) };
        const ok = reachable(s.tiles, adj, p.pos, { maxSteps: 2, passRemoved: p.roles.includes("ranger"), crossBudget: 0 });
        const end = path[path.length - 1]!;
        if (!ok.has(end) || tileOf(s, end).status === "removed") return fail("E_END_REMOVED");
        let cur = p.pos;
        for (const id of path) {                                       // verify the given path step by step
          if (!x.c.board.tiles[cur]!.neighbours.includes(id)) return fail("E_BAD_PATH");
          if (tileOf(s, id).status === "removed" && !p.roles.includes("ranger")) return fail("E_REMOVED");
          cur = id;
        }
        emit(x, "PawnMoved", { seat: p.seat, from: p.pos, to: end, volunteer: true });
        p.pos = end;
      }
      const rest = [...pend.remaining];
      const next = rest.shift();
      s.pending = next === undefined ? null : { kind: "volunteerMove", seat: next, remaining: rest };
      break;
    }
    case "squeezeReturn": {
      const i = pl.handIndex;
      if (typeof i !== "number") return fail("E_BAD_PAYLOAD");
      returnTool(x, pend.seat, i);
      s.pending = null;
      squeezeFrom(x, pend.remaining);
      break;
    }
    case "forecastKeepOrBottom": {
      if (pl.bottom === true) { const top = s.deck.shift()!; s.deck.push(top); emit(x, "ForecastMovedToBottom", { seat: pend.seat }); }
      s.pending = null;
      break;
    }
  }
}
