import type { RavageCard } from "@tipping-point/content";
import { emit, pressureOf, reinsert, type Ctx } from "./ctx";
import { checkEnd, collapse, metreUp } from "./end";
import type { Tile } from "./types";

/** Engine Spec 5.1, steps 1 to 8. `x.suppress` is the Opening Strike. */
export function resolveRavage(x: Ctx, card: RavageCard): void {
  const s = x.s;
  const b = card.biome;
  let n = pressureOf(s.metreTicks);                                   // 1. fixed now, never recomputed
  if (!x.suppress && s.lobbyCharges > 0) {                            // 2. Lobby (even if the biome is extinct, SD-4)
    n += 1; s.lobbyCharges -= 1;
    emit(x, "LobbyCharged", { left: s.lobbyCharges });
  }
  if (!x.suppress && s.turn?.activistDeclared) {                      // 3. Activist, after Lobby
    n = Math.max(1, n - 1); s.turn.activistDeclared = false;
  }
  emit(x, "RavageStarted", { cardId: card.id, biome: b, calls: n, suppress: x.suppress });

  if (!s.extinct[b]) {                                                // 4. extinct: skip calls
    const called = new Set<number>();                                 // 5. call loop
    let k = 0;
    while (n > 0 && s.phase !== "over") {
      const candidates = s.tiles.filter((t) => t.biome === b && t.status !== "removed" && !called.has(t.id)); // id order
      if (candidates.length === 0) {
        if (!s.tiles.some((t) => t.biome === b && t.status !== "removed")) break;
        called.clear();
        emit(x, "CallMemoryReset", { biome: b });
        continue;
      }
      const t = x.rng.choice(candidates);
      called.add(t.id); n--; k++;
      emit(x, "TileCalled", { tile: t.id, n: k });
      hit(x, t);
    }
  }

  if (card.surge && !x.suppress && s.phase !== "over") {              // 7. Surge
    if (card.id === s.calmCoverCardId) emit(x, "SurgeSkipped", { cardId: card.id });
    else { emit(x, "SurgeFired", { cardId: card.id }); metreUp(x, "surge"); }
  }
  if (!x.suppress && s.phase !== "over") reinsert(x, card.id);        // 8.
}

/** 6. hit(tile) */
function hit(x: Ctx, t: Tile): void {
  const s = x.s;
  if (t.status === "healthy" && t.shield) {
    t.shield = false; s.shieldSupply++;
    emit(x, "TileHit", { tile: t.id, from: "healthy", to: "healthy", outcome: "shield_lost" });
    return;
  }
  if (t.status === "healthy") {
    t.status = "vulnerable";
    emit(x, "TileHit", { tile: t.id, from: "healthy", to: "vulnerable", outcome: "vulnerable" });
    return;
  }
  if (t.status === "vulnerable" && t.stabilised) {
    t.stabilised = false; s.stabiliseSupply++;
    emit(x, "TileHit", { tile: t.id, from: "vulnerable", to: "vulnerable", outcome: "marker_lost" });
    return;
  }
  if (t.status !== "vulnerable" || t.biome === "hub") return;
  // vulnerable -> removed
  const b = t.biome;
  t.status = "removed";
  emit(x, "TileHit", { tile: t.id, from: "vulnerable", to: "removed", outcome: "removed" });
  s.removedByBiome[b]++;
  if (t.owner) {
    const owner = s.players.find((p) => p.id === t.owner);
    if (owner) owner.tokensInSupply++;
    t.owner = null;
  }
  for (const p of s.players) {
    if (p.pos === t.id) {
      p.pos = null;
      p.awayTurns = x.c.rules.difficulty[s.difficulty].evacuation_rounds;
      emit(x, "PawnEvacuated", { seat: p.seat, tile: t.id, rounds: p.awayTurns });
    }
  }
  if (s.removedByBiome[b] === 5 && !s.cascaded[b]) {
    s.cascaded[b] = true;
    emit(x, "CascadeFired", { biome: b });
    metreUp(x, "cascade");
  }
  if (s.removedByBiome[b] === 10) {
    s.extinct[b] = true; s.extinctCount++;
    emit(x, "ExtinctionDeclared", { biome: b, count: s.extinctCount });
    if (!x.suppress) {
      if (s.extinctCount === 1) metreUp(x, "extinction");
      else collapse(x, "extinction");
    }
  }
  checkEnd(x);
}
