// The board on the title screen's box lid: a real starting board with a few tiles worn and one lost, so the first
// thing on screen says "something here is tipping". Pure and deterministic (fixed seed, fixed picks), so it is tested.
import type { MiniTile } from "../game/MiniBoard";
import { engine } from "./content";

/** Tile ids (by position in the board list) that are worn or lost on the lid. Chosen by eye to be spread out. */
const WORN_EVERY = 7;
const LOST_AT = new Set([5, 33]);

export function titleBoard(): MiniTile[] {
  const { state: s } = engine.newGame({ seed: 2026, difficulty: "normal", players: [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "c", name: "C" }] });
  return s.tiles.map((t, i): MiniTile => {
    if (t.biome === "hub") return { id: t.id, biome: "hub", status: "healthy" };
    if (LOST_AT.has(i)) return { id: t.id, biome: t.biome, status: "removed" };
    if (i % WORN_EVERY === 3) return { id: t.id, biome: t.biome, status: "vulnerable" };
    return { id: t.id, biome: t.biome, status: "healthy", shield: i % 11 === 0 };
  });
}
