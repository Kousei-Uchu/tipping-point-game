// During a Ravage reveal the engine state is already final, but the table should show each hit land as its
// numbered badge appears. This puts tiles that have not been revealed yet back to how they were before the hit.
import type { Player, Tile } from "@tipping-point/engine";
import type { Story } from "./story";

type Outcome = "vulnerable" | "shield_lost" | "marker_lost" | "removed";
interface Pending { tile: number; outcome: Outcome; owner?: string | null }

/** Hits not yet shown, oldest first. A hit on a called tile shows when that tile's badge does; hits that are
 *  not called tiles (a Cascade, say) show once every called tile has. Later cards' hits are not shown yet. */
export function unrevealed(story: Story, step: number, shown: number): Pending[] {
  const out: Pending[] = [];
  story.steps.forEach((st, i) => {
    if (i < step) return;
    const done = i === step ? new Set(st.called.slice(0, shown)) : new Set<number>();
    const all = i === step && shown >= st.called.length;
    for (const o of st.outcomes) if (!(all || done.has(o.tile))) out.push(o);
  });
  return out;
}

/** The tiles as the table should show them right now. Returns the same array when nothing is hidden. */
export function displayTiles(tiles: readonly Tile[], story: Story, step: number, shown: number): readonly Tile[] {
  const hidden = unrevealed(story, step, shown);
  if (!hidden.length) return tiles;
  const copy = tiles.map((t) => ({ ...t }));
  for (const o of [...hidden].reverse()) {
    const t = copy.find((x) => x.id === o.tile);
    if (!t) continue;
    if (o.outcome === "vulnerable") t.status = "healthy";
    else if (o.outcome === "shield_lost") t.shield = true;
    else if (o.outcome === "marker_lost") t.stabilised = true;
    else if (o.outcome === "removed") { t.status = "vulnerable"; if (o.owner) t.owner = o.owner; }
  }
  return copy;
}

/** The Stewards as the table should show them right now: a pawn whose tile has not been shown as lost yet is still
 *  standing on it, and a token on such a tile is still out of its owner's supply. Same array back when nothing is hidden. */
export function displayPlayers(players: readonly Player[], story: Story, step: number, shown: number): readonly Player[] {
  const lost = unrevealed(story, step, shown).filter((o) => o.outcome === "removed");
  if (!lost.length) return players;
  const gone = new Set(lost.map((o) => o.tile));
  const standing = new Map<number, number>();   // seat -> tile it stood on
  story.steps.forEach((st, i) => {
    if (i < step) return;
    for (const ev of st.evacuations ?? []) if (gone.has(ev.tile)) standing.set(ev.seat, ev.tile);
  });
  const tokens = new Map<string, number>();     // player id -> tokens still on tiles that are not yet shown lost
  for (const o of lost) if (o.owner) tokens.set(o.owner, (tokens.get(o.owner) ?? 0) + 1);
  if (!standing.size && !tokens.size) return players;
  return players.map((p) => {
    const tile = standing.get(p.seat);
    const held = tokens.get(p.id) ?? 0;
    if (tile === undefined && !held) return p;
    return { ...p, pos: tile === undefined ? p.pos : tile, tokensInSupply: p.tokensInSupply - held };
  });
}
