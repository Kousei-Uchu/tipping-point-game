import type { GameContent } from "@tipping-point/content";
import { cardMap, clone, emit, fail, Fail, reinsert, tileOf, toolCard, type Ctx } from "./ctx";
import { drain, drawAndResolve, resolvePending } from "./cards";
import { metreDown } from "./end";
import { mulberry32, type RngFactory } from "./rng";
import { endTurn } from "./turn";
import type { Action, ApplyResult, PlayerId, Player, State } from "./types";

/**
 * Pure: never mutates `state`. Returns the next state plus the events it produced, or an error code.
 * `rngFactory` is injectable so golden tests can replay recorded outcomes.
 */
export function apply(content: GameContent, state: State, action: Action, actor: PlayerId, rngFactory: RngFactory = mulberry32): ApplyResult {
  if (state.rulesVersion !== content.rules.rules_version) return { ok: false, error: "E_PHASE" };
  const s = clone(state);
  const rng = rngFactory(s.rngState);
  const x: Ctx = { s, c: content, rng, ev: [], cards: cardMap(content), suppress: false, trophyJustReached: false };
  try {
    run(x, action, actor);
    s.rngState = rng.state;
    return { ok: true, state: s, events: x.ev };
  } catch (e) {
    if (e instanceof Fail) return { ok: false, error: e.code };
    throw e;
  }
}

function run(x: Ctx, a: Action, actor: PlayerId): void {
  const s = x.s;
  if (s.phase !== "turn" && s.phase !== "finalLap") return fail("E_PHASE");
  const seatOf = (id: PlayerId) => s.players.find((p) => p.id === id);
  const who = seatOf(actor);
  if (!who) return fail("E_NOT_YOUR_TURN");

  if (s.pending) {
    if (a.type !== "Resolve") return fail("E_PENDING");
    if (s.players[s.pending.seat]!.id !== actor) return fail("E_NOT_YOUR_TURN");
    resolvePending(x, a.payload);
    drain(x);
    return;
  }
  if (a.type === "Resolve") return fail("E_PHASE");
  if (who.seat !== s.activeSeat || !s.turn) return fail("E_NOT_YOUR_TURN");

  switch (a.type) {
    case "Move": return doMove(x, who, a.path);
    case "UseTool": return doTool(x, who, a.handIndex, a.kind);
    case "Stabilise": return doStabilise(x, who);
    case "UseAbility": return doAbility(x, who, a.role, a.payload);
    case "Gift": return doGift(x, who, a.toPlayer, a.handIndex);
    case "Improvise": return doImprovise(x, who, a.handIndex);
    case "Draw": return doDraw(x);
  }
}

// ---------------------------------------------------------------- Move
function doMove(x: Ctx, p: Player, path: number[]): void {
  const s = x.s, t = s.turn!;
  if (p.pos === null) return fail("E_EVACUATED");
  if (!Array.isArray(path) || path.length === 0) return fail("E_BAD_PATH");
  if (path.length > x.c.rules.turn.move - t.stepsUsed) return fail("E_STEPS");
  const ranger = p.roles.includes("ranger");
  let cur = p.pos, crossed = 0;
  path.forEach((id, i) => {
    const tile = s.tiles[id];
    if (!tile || !x.c.board.tiles[cur]!.neighbours.includes(id)) return fail("E_BAD_PATH");
    const last = i === path.length - 1;
    if (tile.status === "removed") {
      if (ranger) { if (last) fail("E_END_REMOVED"); }
      else if (t.improvising && !t.improviseCrossed && crossed === 0 && !last) crossed++;
      else if (t.improvising && last) fail("E_END_REMOVED");
      else fail("E_REMOVED");
    }
    cur = id;
  });
  if (crossed > 0) t.improviseCrossed = true;
  const from = p.pos;
  p.pos = cur;
  t.stepsUsed += path.length;
  emit(x, "PawnMoved", { seat: p.seat, from, to: cur, path, steps: path.length });
}

// ---------------------------------------------------------------- Tools
function doTool(x: Ctx, p: Player, handIndex: number, kind: "restore" | "fortify"): void {
  const s = x.s, t = s.turn!;
  if (t.toolActionUsed) return fail("E_ACTION_USED");
  if (p.pos === null) return fail("E_EVACUATED");
  const held = p.hand[handIndex];
  if (!held) return fail("E_BAD_PAYLOAD");
  const card = toolCard(x, held.cardId);
  const tile = tileOf(s, p.pos);
  if (card.programme && held.usedOn.includes(tile.id)) return fail("E_SAME_TILE");
  if (tile.biome === "hub") return fail("E_WRONG_STATUS");
  if (!p.roles.includes("engineer") && card.biome !== tile.biome) return fail("E_BIOME_MISMATCH");

  if (kind === "restore") {
    if (tile.status !== "vulnerable") return fail("E_WRONG_STATUS");
  } else if (kind === "fortify") {
    if (tile.status !== "healthy" || tile.shield) return fail("E_WRONG_STATUS");
    if (s.shieldSupply <= 0) return fail("E_NO_SHIELDS");
  } else return fail("E_BAD_PAYLOAD");

  held.usesLeft--; held.usedOn.push(tile.id);
  t.toolActionUsed = true; t.spentToolOrStabilise = true;
  emit(x, "ToolUsed", { seat: p.seat, cardId: held.cardId, kind, tile: tile.id });

  if (kind === "restore") {
    tile.status = "healthy";
    if (tile.stabilised) { tile.stabilised = false; s.stabiliseSupply++; emit(x, "MarkerReturned", { tile: tile.id }); }
    if (tile.owner !== p.id) {
      if (p.tokensInSupply > 0) {                                       // SD-2
        const prev = tile.owner ? s.players.find((q) => q.id === tile.owner) : undefined;
        if (prev) prev.tokensInSupply++;
        tile.owner = p.id; p.tokensInSupply--;
      } else emit(x, "TokenCapReached", { seat: p.seat, tile: tile.id });
    }
    emit(x, "TileRestored", { seat: p.seat, tile: tile.id, owner: tile.owner });
  } else {
    tile.shield = true; s.shieldSupply--;
    emit(x, "TileFortified", { seat: p.seat, tile: tile.id });
  }
  if (held.usesLeft <= 0) {
    p.hand.splice(handIndex, 1);
    emit(x, "ToolReturned", { seat: p.seat, cardId: held.cardId });
    reinsert(x, held.cardId);
  }
  metreDown(x, kind === "restore" ? x.c.rules.metre.restore_ticks_down : x.c.rules.metre.fortify_ticks_down, kind);
  afterAction(x);
}

function doStabilise(x: Ctx, p: Player): void {
  const t = x.s.turn!;
  if (t.toolActionUsed) return fail("E_ACTION_USED");
  if (p.pos === null) return fail("E_EVACUATED");
  const tile = tileOf(x.s, p.pos);
  if (tile.status !== "vulnerable" || tile.stabilised) return fail("E_WRONG_STATUS");
  if (x.s.stabiliseSupply <= 0) return fail("E_NO_MARKERS");
  tile.stabilised = true; x.s.stabiliseSupply--;
  t.toolActionUsed = true; t.spentToolOrStabilise = true;
  emit(x, "TileStabilised", { seat: p.seat, tile: tile.id });
}

// ---------------------------------------------------------------- Gift and abilities
function transfer(x: Ctx, from: Player, handIndex: number, to: Player): void {
  const [tool] = from.hand.splice(handIndex, 1);
  if (!tool) return fail("E_BAD_PAYLOAD");
  to.hand.push(tool);
  emit(x, "GiftGiven", { from: from.seat, to: to.seat, cardId: tool.cardId });
}

function doGift(x: Ctx, p: Player, toId: PlayerId, handIndex: number): void {
  const t = x.s.turn!;
  const to = x.s.players.find((q) => q.id === toId);
  if (!to || to === p || !p.hand[handIndex]) return fail("E_BAD_PAYLOAD");
  if (p.pos === null || to.pos === null) return fail("E_EVACUATED");
  if (p.pos !== to.pos) return fail("E_NOT_SAME_TILE");
  const atHub = p.pos === x.c.board.hubId;                              // SD-3: unlimited at the Hub
  if (!atHub && t.giftUsed) return fail("E_ACTION_USED");
  if (to.hand.length >= x.c.rules.limits.hand) return fail("E_HAND_FULL");
  transfer(x, p, handIndex, to);
  t.giftUsed = true;
}

function doAbility(x: Ctx, p: Player, role: Player["roles"][number], payload: unknown): void {
  const s = x.s, t = s.turn!;
  if (!p.roles.includes(role)) return fail("E_NO_ROLE");
  if (t.abilityUsed[role]) return fail("E_ACTION_USED");
  const pl = (payload ?? {}) as Record<string, unknown>;
  switch (role) {
    case "ecologist": {
      if (t.spentToolOrStabilise || t.toolActionUsed) return fail("E_ACTION_USED");
      const top = s.deck[0];
      if (top === undefined) return fail("E_PHASE");
      t.abilityUsed.ecologist = true; t.toolActionUsed = true; t.undoLocked = true;   // D17: uses the Tool action
      s.pending = { kind: "forecastKeepOrBottom", seat: p.seat, cardId: top };
      emit(x, "AbilityUsed", { seat: p.seat, role });
      emit(x, "ForecastRevealed", { seat: p.seat, forSeat: p.seat, cardId: top, private: true });
      return;
    }
    case "courier": {
      const to = s.players.find((q) => q.id === pl.toPlayer);
      const i = pl.handIndex;
      if (!to || to === p || typeof i !== "number" || !p.hand[i]) return fail("E_BAD_PAYLOAD");
      if (p.pos === null || to.pos === null) return fail("E_EVACUATED");
      if (to.hand.length >= x.c.rules.limits.hand) return fail("E_HAND_FULL");
      transfer(x, p, i, to);
      break;
    }
    case "pilot": {
      const dest = pl.to;
      if (typeof dest !== "number" || p.pos === null) return fail("E_BAD_PAYLOAD");
      if (!s.players.some((q) => q !== p && q.pos === dest)) return fail("E_BAD_PAYLOAD");
      emit(x, "PawnMoved", { seat: p.seat, from: p.pos, to: dest, pilot: true });
      p.pos = dest;
      break;
    }
    case "activist":
      t.activistDeclared = true;
      break;
    default:
      return fail("E_NO_ROLE");                                         // ranger and engineer are passive
  }
  t.abilityUsed[role] = true;
  emit(x, "AbilityUsed", { seat: p.seat, role });
}

function doImprovise(x: Ctx, p: Player, handIndex: number): void {
  const t = x.s.turn!;
  if (p.pos === null) return fail("E_EVACUATED");
  if (t.improvising) return fail("E_ACTION_USED");
  const nb = x.c.board.tiles[p.pos]!.neighbours;
  if (!nb.every((n) => tileOf(x.s, n).status === "removed")) return fail("E_NOT_STRANDED");
  const held = p.hand[handIndex];
  if (!held) return fail("E_BAD_PAYLOAD");
  p.hand.splice(handIndex, 1);
  t.improvising = true;
  emit(x, "Improvised", { seat: p.seat, cardId: held.cardId });
  reinsert(x, held.cardId);
}

// ---------------------------------------------------------------- Draw / end of turn
function doDraw(x: Ctx): void {
  const s = x.s;
  if (s.phase === "finalLap") return endTurn(x);                         // no draws in the final lap
  s.continuations = [{ kind: "endTurn" }];
  drawAndResolve(x, 0);
  drain(x);
}

/** After any action that can reach the Trophy: that turn ends at once, no draw (D5). */
function afterAction(x: Ctx): void {
  if (x.trophyJustReached) endTurn(x);
}

