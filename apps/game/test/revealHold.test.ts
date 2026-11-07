import { describe, expect, it } from "vitest";
import { content, engine } from "../src/core/content";
import { LocalSession } from "../src/core/session";
import { actorId } from "../src/core/selectors";
import { buildStory } from "../src/core/story";
import { displayPlayers, displayTiles } from "../src/core/reveal";
import type { NewGameOptions } from "@tipping-point/engine";

const opts = (seed: number): NewGameOptions => ({
  seed, difficulty: "hard",
  players: ["Mia", "Raj", "Ben", "Zoe"].map((name, i) => ({ id: `p${i}`, name })),
});

/** Plays whole bot games and, for every action that revealed cards, checks what the table shows before the first badge. */
describe("reveal hold against real games", () => {
  it("before the first badge, lost tiles keep their token and evacuated pawns still stand on them; at the end it is the real state", () => {
    let lostWithOwner = 0, evacuated = 0, checked = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const sess = new LocalSession(opts(seed));
      for (let n = 0; n < 1500; n++) {
        const before = sess.getSnapshot().state;
        if (before.phase === "over") break;
        const r = sess.dispatch(engine.chooseAction(before), actorId(before));
        if (!r.ok) break;
        const after = sess.getSnapshot().state;
        const story = buildStory(content, r.events, before);
        if (!story.steps.length) continue;
        checked++;
        const tiles = displayTiles(after.tiles, story, 0, 0);
        const players = displayPlayers(after.players, story, 0, 0);
        for (const st of story.steps) {
          for (const o of st.outcomes) {
            if (o.outcome !== "removed") continue;
            const was = before.tiles.find((t) => t.id === o.tile)!.owner;
            expect(tiles.find((t) => t.id === o.tile)!.owner).toBe(was);
            if (was) lostWithOwner++;
          }
          for (const ev of st.evacuations) {
            expect(players.find((p) => p.seat === ev.seat)!.pos).toBe(ev.tile);
            evacuated++;
          }
        }
        // Tokens still on a tile that is not yet shown lost are not back in the owner's supply yet.
        for (const p of players) {
          const real = after.players.find((q) => q.id === p.id)!;
          expect(p.tokensInSupply).toBeLessThanOrEqual(real.tokensInSupply);
          expect(p.tokensInSupply).toBeGreaterThanOrEqual(0);
        }
        // Once every badge is up the table is exactly the real state.
        const last = story.steps.length - 1;
        const all = story.steps[last]!.called.length;
        expect(displayTiles(after.tiles, story, last, all)).toBe(after.tiles);
        expect(displayPlayers(after.players, story, last, all)).toBe(after.players);
      }
    }
    expect(checked).toBeGreaterThan(20);
    // Not a rule, only a guard that these games actually exercised the code: some lost tile had a token, some pawn was evacuated.
    expect(lostWithOwner + evacuated).toBeGreaterThan(0);
  });
});
