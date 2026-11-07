// Pure maths for the physical look of the table. No React, no platform code, so it can be unit tested.
// Everything on the board is drawn in board units (hex centre to corner = 1).

export type Pt = [number, number];

/** How thick a tile is, in board units. A few pixels at phone size, never a 3D tilt. */
export const THICK = 0.1;
/** The Research Station stands a little taller than a tile. */
export const THICK_HUB = 0.2;
/** The drop shadow sits further out than the side. */
export const SHADOW_DROP = 0.17;

export function parsePoints(points: string): Pt[] {
  return points.trim().split(/\s+/).map((p) => { const [x, y] = p.split(",").map(Number); return [x!, y!] as Pt; });
}

export function formatPoints(pts: readonly Pt[]): string {
  return pts.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(" ");
}

/** The same outline moved by (dx, dy). Used for the side, the shadow and the hole's inner lip. */
export function offsetPoints(points: string, dx: number, dy: number): string {
  return formatPoints(parsePoints(points).map(([x, y]) => [x + dx, y + dy] as Pt));
}

/** The same outline scaled about (cx, cy). Used to inset an inner shadow so it stays inside the hole. */
export function scalePoints(points: string, cx: number, cy: number, k: number): string {
  return formatPoints(parsePoints(points).map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k] as Pt));
}

/** Light comes from the top left. */
const LIGHT: Pt = [-0.5, -0.866];

interface Edge { a: Pt; b: Pt; lit: number }

function edgesOf(points: string, cx: number, cy: number): Edge[] {
  const pts = parsePoints(points);
  return pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length]!;
    const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy;
    const len = Math.hypot(mx, my) || 1;
    return { a, b, lit: (mx / len) * LIGHT[0] + (my / len) * LIGHT[1] };
  });
}

function pathOf(edges: Edge[]): string {
  return edges.map((e) => `M${e.a[0].toFixed(3)},${e.a[1].toFixed(3)} L${e.b[0].toFixed(3)},${e.b[1].toFixed(3)}`).join(" ");
}

/** Edges facing the light: drawn as a pale bevel line on a tile, or as the dark inner shadow of a hole. */
export function litEdgesPath(points: string, cx: number, cy: number): string {
  return pathOf(edgesOf(points, cx, cy).filter((e) => e.lit > 0.2));
}

/** Edges facing away from the light. */
export function shadedEdgesPath(points: string, cx: number, cy: number): string {
  return pathOf(edgesOf(points, cx, cy).filter((e) => e.lit < -0.2));
}

/** Small deterministic generator so a tile looks the same on every render and on every device. */
export function seeded(seed: number): () => number {
  let s = (Math.imul(seed + 1, 2654435761) >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

export interface Scuff { x1: number; y1: number; x2: number; y2: number }

/** Short worn strokes on a Vulnerable tile's face. Same tile id gives the same marks. */
export function scuffMarks(id: number, cx: number, cy: number, count = 7): Scuff[] {
  const rnd = seeded(id * 7919 + 13);
  const out: Scuff[] = [];
  for (let i = 0; i < count; i++) {
    const ang = rnd() * Math.PI * 2;
    const dist = 0.18 + rnd() * 0.55;
    const x = cx + Math.cos(ang) * dist, y = cy + Math.sin(ang) * dist * 0.9;
    const dir = -0.9 + rnd() * 0.5; // mostly down-left to up-right, like a scrape
    const len = 0.12 + rnd() * 0.2;
    out.push({ x1: x, y1: y, x2: x + Math.cos(dir) * len, y2: y + Math.sin(dir) * len });
  }
  return out;
}

/** A counter is placed by hand, so it sits a little off centre. Never more than `max` from the spot. */
export function handledOffset(tileId: number, seat: number, max = 0.045): { dx: number; dy: number } {
  const rnd = seeded(tileId * 131 + seat * 17 + 5);
  return { dx: (rnd() * 2 - 1) * max, dy: (rnd() * 2 - 1) * max };
}

/** Painter's order for the board: upper rows first, so each tile's side and shadow fall under the row below. */
export function paintOrder<T extends { cx: number; cy: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.cy - b.cy || a.cx - b.cx);
}

export interface FanSlot { rotate: number; dx: number; dy: number; lift: number; scale: number; z: number }

/**
 * Where each card in a fanned hand sits. The middle is flat, the ends tilt outwards and tuck down.
 * The selected card straightens, lifts and enlarges; the rest tuck down. Overlap is a share of the card
 * width, kept small enough that every card shows well over 44 px at the smallest card size.
 */
export function fanLayout(count: number, selected: number | null, cardWidth: number): FanSlot[] {
  const overlap = count > 1 ? Math.min(0.18, 0.5 / count) * cardWidth : 0;
  return Array.from({ length: count }, (_, i) => {
    const mid = (count - 1) / 2;
    const off = count > 1 ? (i - mid) / Math.max(mid, 1) : 0; // -1 .. 1
    const isSel = selected === i;
    return {
      rotate: isSel ? 0 : off * 5,
      dx: i === 0 ? 0 : -overlap,
      dy: isSel ? -10 : Math.abs(off) * 5 + (selected != null ? 3 : 0),
      lift: isSel ? 10 : 0,
      scale: isSel ? 1.06 : 1,
      z: isSel ? 10 : i,
    };
  });
}

/** How many card backs to draw in a pile: one per few cards, so a thin pile looks thin. */
export function pileLayers(count: number, max = 4): number {
  if (count <= 0) return 0;
  return Math.min(max, 1 + Math.floor(count / 12));
}

/** Slots in the 12-token tray: `placed` are out on the board, the rest are still in the tray. */
export function trayDiscs(total: number, inSupply: number): boolean[] {
  const left = Math.max(0, Math.min(total, inSupply));
  return Array.from({ length: total }, (_, i) => i < left);
}
