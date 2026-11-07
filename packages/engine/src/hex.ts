import type { Tile } from "./types";

export const AXIAL_DIRS: readonly (readonly [number, number])[] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];

export function hexDistance(a: { q: number; r: number }, b: { q: number; r: number }): number {
  const dq = a.q - b.q, dr = a.r - b.r;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
}

/** Pointy-top axial to pixel (unit size = centre-to-corner). Pure maths, no platform code. */
export function hexToPixel(q: number, r: number, size = 1): { x: number; y: number } {
  return { x: size * Math.sqrt(3) * (q + r / 2), y: size * 1.5 * r };
}

export function hexCorners(cx: number, cy: number, size: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 180) * (60 * i - 30);
    pts.push([cx + size * Math.cos(ang), cy + size * Math.sin(ang)]);
  }
  return pts;
}

export interface Adjacency { neighbours: readonly (readonly number[])[] }

export interface PathOptions {
  maxSteps: number;
  /** may walk through removed tiles (Ranger, or Volunteer Day for the Ranger) */
  passRemoved: boolean;
  /** number of removed tiles that may be crossed (Improvise = 1) */
  crossBudget: number;
}

/** Breadth-first reachability. Returns best known path (tile ids, excluding start) to each end tile. */
export function reachable(tiles: readonly Tile[], adj: Adjacency, from: number, opt: PathOptions): Map<number, number[]> {
  type Node = { id: number; path: number[]; crossed: number };
  const best = new Map<number, number[]>();
  const seen = new Map<string, number>();
  let frontier: Node[] = [{ id: from, path: [], crossed: 0 }];
  for (let step = 1; step <= opt.maxSteps; step++) {
    const nextFrontier: Node[] = [];
    for (const n of frontier) {
      for (const nb of adj.neighbours[n.id] ?? []) {
        const t = tiles[nb]!;
        let crossed = n.crossed;
        if (t.status === "removed") {
          if (!opt.passRemoved) { if (crossed >= opt.crossBudget) continue; crossed++; }
        }
        const key = `${nb}:${crossed}`;
        if (seen.has(key)) continue;
        seen.set(key, step);
        const path = [...n.path, nb];
        nextFrontier.push({ id: nb, path, crossed });
        if (t.status !== "removed" && nb !== from && !best.has(nb)) best.set(nb, path);
      }
    }
    frontier = nextFrontier;
  }
  return best;
}
