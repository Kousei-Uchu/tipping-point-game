import { emit, type Ctx } from "./ctx";
import { finishGame } from "./end";
import type { TurnScratch } from "./types";

export const freshTurn = (): TurnScratch => ({
  stepsUsed: 0, toolActionUsed: false, abilityUsed: {}, giftUsed: false, spentToolOrStabilise: false,
  activistDeclared: false, improvising: false, improviseCrossed: false, undoLocked: false,
});

/** Next seat to play, or null when the final lap is used up. Bumps `round` when play wraps to the start seat. */
function nextSeat(x: Ctx): number | null {
  const s = x.s;
  if (s.phase === "finalLap") return s.finalLapRemaining.shift() ?? null;
  const n = (s.activeSeat + 1) % s.players.length;
  if (n === s.startSeat) s.round++;
  return n;
}

/** Start the turn of `seat`, skipping evacuated players (Engine Spec 6.1). */
export function enterTurn(x: Ctx, seat: number): void {
  const s = x.s;
  for (let guard = 0; guard < 1000; guard++) {
    s.activeSeat = seat;
    const p = s.players[seat]!;
    if (p.awayTurns > 0) {
      p.awayTurns--;
      emit(x, "TurnSkipped", { seat, remaining: p.awayTurns });
      if (p.awayTurns === 0) {
        p.pos = x.c.board.hubId;
        emit(x, "PawnReturned", { seat, tile: p.pos });
      }
      const nxt = nextSeat(x);
      if (nxt === null) { finishGame(x); return; }
      seat = nxt;
      continue;
    }
    s.turn = freshTurn();
    emit(x, "TurnStarted", { seat, round: s.round, phase: s.phase });
    return;
  }
  throw new Error("enterTurn: runaway skip loop");
}

export function endTurn(x: Ctx): void {
  const s = x.s;
  if (s.phase === "over") return;
  emit(x, "TurnEnded", { seat: s.activeSeat });
  s.turn = null;
  s.pending = null;
  s.continuations = [];
  const nxt = nextSeat(x);
  if (nxt === null) { finishGame(x); return; }
  enterTurn(x, nxt);
}
