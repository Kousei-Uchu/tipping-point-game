// Groups the events of one accepted action into "steps", one per card drawn.
// The overlay plays the steps in order; the board shows `called` as numbered badges.
import type { Card, GameContent } from "@tipping-point/content";
import type { GameEvent } from "@tipping-point/engine";

export interface StoryStep {
  card: Card;
  seat: number;           // who drew it
  depth: number;          // 0 for the normal draw, higher for Heat Dome follow-up draws
  calls: number;          // Ravage only: final number of calls after Lobby and Activist
  called: number[];       // tile ids in call order
  /** `owner` is set only on a "removed" hit, and only when buildStory was given the state from before the action:
   *  it is whose token sat on the tile, so the reveal can keep that token on the board until the hit is shown. */
  outcomes: { tile: number; outcome: "vulnerable" | "shield_lost" | "marker_lost" | "removed"; owner?: string | null }[];
  surge: "none" | "fired" | "skipped";
  lobbyUsed: boolean;
  metreMoves: { from: number; to: number; why: string }[];
  evacuated: number[];    // seats
  evacuations: { seat: number; tile: number }[];   // the same pawns, with the tile each stood on when it was lost
  cascade: string[];      // biome ids
  extinct: string[];
  kept: "kept" | "bounced" | null;   // Tool cards
  note?: string;
}

export interface Story { steps: StoryStep[]; trophy: boolean; gameOver: boolean }

/** `before` is the state from before the action that produced `events`. It is optional: without it the story is the
 *  same except that hits do not say whose token was on a lost tile. */
export function buildStory(c: GameContent, events: readonly GameEvent[], before?: { tiles: readonly { id: number; owner: string | null }[] }): Story {
  const cards = new Map(c.cards.map((k) => [k.id, k]));
  const steps: StoryStep[] = [];
  let cur: StoryStep | null = null;
  let trophy = false, gameOver = false;
  for (const e of events) {
    if (e.kind === "CardDrawn") {
      const card = cards.get(e.cardId as string);
      if (!card) continue;
      cur = { card, seat: (e.seat as number) ?? 0, depth: (e.depth as number) ?? 0, calls: 0, called: [], outcomes: [], surge: "none", lobbyUsed: false, metreMoves: [], evacuated: [], evacuations: [], cascade: [], extinct: [], kept: null };
      steps.push(cur);
      continue;
    }
    if (e.kind === "TrophyReached") trophy = true;
    if (e.kind === "GameOver") gameOver = true;
    if (!cur) continue;
    switch (e.kind) {
      case "RavageStarted": cur.calls = e.calls as number; break;
      case "TileCalled": cur.called.push(e.tile as number); break;
      case "TileHit": {
        const outcome = e.outcome as StoryStep["outcomes"][number]["outcome"];
        const hit: StoryStep["outcomes"][number] = { tile: e.tile as number, outcome };
        if (outcome === "removed" && before) hit.owner = before.tiles.find((t) => t.id === e.tile)?.owner ?? null;
        cur.outcomes.push(hit);
        break;
      }
      case "SurgeFired": cur.surge = "fired"; break;
      case "SurgeSkipped": cur.surge = "skipped"; break;
      case "LobbyCharged": cur.lobbyUsed = true; break;
      case "MetreMoved": cur.metreMoves.push({ from: e.from as number, to: e.to as number, why: e.why as string }); break;
      case "PawnEvacuated": cur.evacuated.push(e.seat as number); cur.evacuations.push({ seat: e.seat as number, tile: e.tile as number }); break;
      case "CascadeFired": cur.cascade.push(e.biome as string); break;
      case "ExtinctionDeclared": cur.extinct.push(e.biome as string); break;
      case "ToolKept": cur.kept = "kept"; break;
      case "HandOverflowBounced": cur.kept = "bounced"; break;
      case "EventResolved": if (typeof e.note === "string") cur.note = e.note; break;
    }
  }
  return { steps, trophy, gameOver };
}
