// Turns engine events into short plain sentences for the log and for screen readers.
// Copy rules: no em dashes, no emoji, short sentences, say what happened.
import type { GameContent } from "@tipping-point/content";
import type { GameEvent, State } from "@tipping-point/engine";
import { biomeName } from "./content";

export type Tone = "neutral" | "good" | "bad";
export interface LogLine { seq: number; text: string; tone: Tone }

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

/** Events that only matter to the engine or to animations are not shown in the log. */
export function narrate(c: GameContent, s: State, e: GameEvent): LogLine | null {
  const g = <T,>(k: string) => e[k] as T;
  const who = (seat: number) => s.players[seat]?.name ?? "A Steward";
  const card = (id: string) => c.cards.find((k) => k.id === id)?.name ?? "a card";
  const tileName = (id: number) => biomeName(s.tiles[id]!.biome);
  const line = (text: string, tone: Tone = "neutral"): LogLine => ({ seq: e.seq, text, tone });

  switch (e.kind) {
    case "GameStarted": return line(`New game. ${g<number>("players")} Stewards, ${g<string>("difficulty")} difficulty.`);
    case "TurnStarted": return line(g<string>("phase") === "finalLap" ? `Final lap: ${who(g<number>("seat"))} takes a last turn.` : `Round ${g<number>("round")}: ${who(g<number>("seat"))}'s turn.`);
    case "TurnSkipped": return line(`${who(g<number>("seat"))} is away from the board.`);
    case "PawnReturned": return line(`${who(g<number>("seat"))} is back at the ${c.hub.name}.`);
    case "PawnMoved": {
      const seat = g<number>("seat");
      if (e.pilot) return line(`${who(seat)} flew to another Steward.`);
      if (e.volunteer) return line(`${who(seat)} moved after Volunteer Day.`);
      return line(`${who(seat)} moved ${plural(g<number>("steps"), "step")}.`);
    }
    case "TileRestored": return line(`${who(g<number>("seat"))} restored a ${tileName(g<number>("tile"))} tile.`, "good");
    case "TileFortified": return line(`${who(g<number>("seat"))} added a Shield to a ${tileName(g<number>("tile"))} tile.`, "good");
    case "TileStabilised": return line(`${who(g<number>("seat"))} stabilised a ${tileName(g<number>("tile"))} tile.`, "good");
    case "TokenCapReached": return line(`${who(g<number>("seat"))} has no tokens left, so that tile has no owner.`);
    case "ToolReturned": return line(`${who(g<number>("seat"))} returned ${card(g<string>("cardId"))} to the deck.`);
    case "GiftGiven": return line(`${who(g<number>("from"))} gave ${card(g<string>("cardId"))} to ${who(g<number>("to"))}.`);
    case "AbilityUsed": return line(`${who(g<number>("seat"))} used a role ability.`);
    case "ForecastRevealed": return line(`${who(g<number>("seat"))} looked at the top card.`);
    case "ForecastMovedToBottom": return line(`${who(g<number>("seat"))} moved the top card to the bottom.`);
    case "Improvised": return line(`${who(g<number>("seat"))} improvised and crossed a lost tile.`);
    case "CardDrawn": return line(`${who(g<number>("seat"))} drew ${card(g<string>("cardId"))}.`);
    case "ToolKept": return line(`${who(g<number>("seat"))} kept ${card(g<string>("cardId"))}.`, "good");
    case "HandOverflowBounced": return line(`${who(g<number>("seat"))}'s hand was full, so ${card(g<string>("cardId"))} went back into the deck.`);
    case "EventStarted": return line(`Event: ${card(g<string>("cardId"))}.`);
    case "EventResolved": {
      if (e.key === "lobby") return line(`Industrial Lobby is active. ${plural(g<number>("charges"), "extra call")} waiting.`, "bad");
      if (e.key === "grant") return line("Grant Funding: nothing could be taken.");
      if (e.key === "heat") return line("Heat Dome: no further draws this time.");
      return null;
    }
    case "DeckReordered": return line(`${who(g<number>("seat"))} reordered the top of the deck.`, "good");
    case "GrantTaken": return line(`${who(g<number>("seat"))} took ${card(g<string>("cardId"))} from the deck.`, "good");
    case "RavageStarted": {
      const name = card(g<string>("cardId"));
      const calls = g<number>("calls");
      return e.suppress
        ? line(`Opening Strike: ${name} calls ${plural(calls, "tile")} of ${biomeName(g("biome"))}.`, "bad")
        : line(`${name} strikes. ${plural(calls, "tile")} of ${biomeName(g("biome"))} called.`, "bad");
    }
    case "TileHit": {
      const t = tileName(g<number>("tile"));
      switch (g<string>("outcome")) {
        case "shield_lost": return line(`A ${t} tile lost its Shield.`, "bad");
        case "marker_lost": return line(`A ${t} tile lost its Stabilise marker.`, "bad");
        case "vulnerable": return line(`A ${t} tile became vulnerable.`, "bad");
        case "removed": return line(`A ${t} tile was lost.`, "bad");
      }
      return null;
    }
    case "LobbyCharged": return line("Industrial Lobby adds one call.", "bad");
    case "SurgeFired": return line("Surge. The Metre moves toward the Skull.", "bad");
    case "SurgeSkipped": return line("Surge skipped by the Calm cover.");
    case "MetreMoved": {
      const from = g<number>("from"), to = g<number>("to");
      return line(`The Metre moved from ${from} to ${to}.`, to > from ? "bad" : "good");
    }
    case "PawnEvacuated": return line(`${who(g<number>("seat"))} was evacuated for ${plural(g<number>("rounds"), "round")}.`, "bad");
    case "CascadeFired": return line(`Cascade in ${biomeName(g("biome"))}. Five tiles are lost and the Metre rises.`, "bad");
    case "ExtinctionDeclared": return line(`${biomeName(g("biome"))} is extinct.`, "bad");
    case "TrophyReached": return line("Trophy reached. Everyone else gets one last turn.", "good");
    case "GameOver": {
      const r = g<{ kind: string; reason?: string }>("result");
      if (r.kind === "trophy") return line("The game is over. The ecosystems held.", "good");
      return line(r.reason === "skull" ? "Collapse. The Metre reached the Skull." : "Collapse. A second biome went extinct.", "bad");
    }
    default: return null;
  }
}

export function narrateAll(c: GameContent, s: State, events: readonly GameEvent[]): LogLine[] {
  const out: LogLine[] = [];
  for (const e of events) { const l = narrate(c, s, e); if (l) out.push(l); }
  return out;
}
