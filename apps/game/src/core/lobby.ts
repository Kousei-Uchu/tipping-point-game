// Pure helpers for the setup mat (the lobby). No React, no platform code, so they are tested.

export type BotLevel = "easy" | "normal" | "hard";
/** null is a human. */
export type SeatKind = BotLevel | null;

/** Tapping a seat's piece cycles: Human, then a bot at Easy, Normal, Hard, then back to Human. */
export function nextSeatKind(k: SeatKind): SeatKind {
  return k === null ? "easy" : k === "easy" ? "normal" : k === "normal" ? "hard" : null;
}

export const seatLabel = (k: SeatKind): string => (k === null ? "Human" : `Bot, ${k}`);

/** Drawing lots for who starts: one seat, chosen evenly. `rand` is injectable for tests. */
export function drawLots(seats: number, rand: () => number = Math.random): number {
  return Math.min(seats - 1, Math.floor(rand() * seats));
}

/**
 * The seats the lot marker visits before it lands on `winner`: it goes round the table `laps` times, then stops.
 * The last entry is always the winner, so a still screen (reduced motion) can show just that one.
 */
export function lotsPath(seats: number, winner: number, laps = 1): number[] {
  const out: number[] = [];
  for (let i = 0; i < laps * seats + winner + 1; i++) out.push(i % seats);
  return out;
}

/** When a seat is removed or the table shrinks, the first-player marker must still point at a real seat. */
export const clampStart = (start: number, seats: number): number => Math.max(0, Math.min(start, seats - 1));
