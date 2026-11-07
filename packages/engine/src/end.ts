import type { BiomeId } from "@tipping-point/content";
import { BIOME_IDS } from "@tipping-point/content";
import { emit, pressureOf, type Ctx } from "./ctx";
import type { LegacyScore, State } from "./types";

export function metreUp(x: Ctx, why: string): void {
  if (x.suppress) return;                                   // SD-1: Opening Strike never moves the Metre
  const s = x.s;
  if (s.phase === "over" || s.trophyReachedBySeat !== null) return;
  const from = s.metreTicks;
  s.metreTicks += x.c.rules.metre.surge_ticks_up;
  emit(x, "MetreMoved", { from, to: s.metreTicks, why, pressure: pressureOf(s.metreTicks) });
  checkEnd(x);
}

export function metreDown(x: Ctx, ticks: number, why: string): void {
  const s = x.s;
  if (s.phase === "over") return;
  if (s.trophyReachedBySeat !== null) { s.metreTicks = 0; return; }   // clamped after the Trophy
  const from = s.metreTicks;
  s.metreTicks = Math.max(0, s.metreTicks - ticks);
  emit(x, "MetreMoved", { from, to: s.metreTicks, why, pressure: pressureOf(s.metreTicks) });
  checkEnd(x);
}

export function collapse(x: Ctx, reason: "skull" | "extinction"): void {
  const s = x.s;
  s.phase = "over";
  s.result = { kind: "collapse", reason };
  s.pending = null;
  s.continuations = [];
  emit(x, "GameOver", { result: s.result });
}

/** Fixed order (Engine Spec 8): skull, extinction, trophy. */
export function checkEnd(x: Ctx): void {
  const s = x.s;
  if (s.phase === "over" || x.suppress) return;
  if (s.metreTicks >= x.c.rules.metre.skull_at_or_above) return collapse(x, "skull");
  if (s.extinctCount >= 2) return collapse(x, "extinction");
  if (s.metreTicks <= x.c.rules.metre.trophy_at_or_below && s.trophyReachedBySeat === null) {
    const seat = s.activeSeat, n = s.players.length;
    s.trophyReachedBySeat = seat;
    s.phase = "finalLap";
    s.finalLapRemaining = Array.from({ length: n }, (_, k) => (seat + 1 + k) % n);   // seat+1 ... seat-1, seat
    s.continuations = [];
    x.trophyJustReached = true;
    emit(x, "TrophyReached", { seat });
    emit(x, "FinalLapStarted", { order: [...s.finalLapRemaining] });
  }
}

export function computeLegacy(s: State, guardianBonus: number): { legacy: LegacyScore[]; winners: string[] } {
  const legacy: LegacyScore[] = s.players.map((p) => {
    const healthy = s.tiles.filter((t) => t.owner === p.id && t.status === "healthy");
    const guardianBiomes: BiomeId[] = [];
    for (const b of BIOME_IDS) {
      const standing = s.tiles.filter((t) => t.biome === b && t.status !== "removed" && t.owner !== null);
      const mine = standing.filter((t) => t.owner === p.id).length;
      if (mine * 2 > standing.length) guardianBiomes.push(b);   // strict majority, Vulnerable tiles included
    }
    return { player: p.id, tokensOnHealthy: healthy.length, guardianBiomes, total: healthy.length + guardianBonus * guardianBiomes.length };
  });
  const biomeCount = (id: string) => new Set(s.tiles.filter((t) => t.owner === id && t.status === "healthy").map((t) => t.biome)).size;
  const key = (l: LegacyScore) => [l.total, biomeCount(l.player), l.tokensOnHealthy];
  const cmp = (a: number[], b: number[]) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! - b[i]!; return 0; };
  let best = legacy[0]!;
  for (const l of legacy) if (cmp(key(l), key(best)) > 0) best = l;
  const winners = legacy.filter((l) => cmp(key(l), key(best)) === 0).map((l) => l.player);   // SD-10: shared win
  return { legacy, winners };
}

export function finishGame(x: Ctx): void {
  const s = x.s;
  const { legacy, winners } = computeLegacy(s, x.c.rules.legacy.guardian_bonus);
  s.phase = "over";
  s.turn = null;
  s.result = { kind: "trophy", legacy, winners };
  emit(x, "LegacyScored", { legacy });
  emit(x, "GameOver", { result: s.result });
}
