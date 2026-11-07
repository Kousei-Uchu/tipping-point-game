// Seeded RNG whose whole state is one 32-bit integer (so it lives inside State).
// mulberry32 is tiny and exact across languages.
// Bounds follow Python's random.randint (INCLUSIVE both ends) because the sim's back() uses
// randint(0, len(deck)), i.e. a card can be reinserted at the very bottom.

export interface Rng {
  /** next float in [0,1) */ next(): number;
  /** integer in [lo, hi] inclusive */ int(lo: number, hi: number): number;
  /** uniform pick */ choice<T>(items: readonly T[]): T;
  /** Fisher-Yates, one draw per swap, from the end */ shuffle<T>(items: T[]): void;
  readonly state: number;
}

export function mulberry32(initial: number): Rng {
  let a = initial >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  return {
    next, int,
    choice: (items) => {
      if (items.length === 0) throw new Error("choice of empty list");
      return items[int(0, items.length - 1)]!;
    },
    shuffle: (items) => {
      for (let i = items.length - 1; i > 0; i--) {
        const j = int(0, i);
        [items[i], items[j]] = [items[j]!, items[i]!];
      }
    },
    get state() { return a; },
  };
}

/** Golden tests replace the RNG with an oracle that replays recorded outcomes. */
export type RngFactory = (state: number) => Rng;
