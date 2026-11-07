import { describe, expect, it } from "vitest";
import { displayPlayers, displayTiles, unrevealed } from "../src/core/reveal";

const tile = (id: number, status: string, extra: object = {}) => ({ id, q: 0, r: 0, biome: "forest", status, shield: false, stabilised: false, owner: null, ...extra }) as any;
const step = (called: number[], outcomes: any[]) => ({ called, outcomes, card: {}, surge: "none", cascade: [], extinct: [], metreMoves: [], evacuated: [] }) as any;
const story = (...steps: any[]) => ({ steps, trophy: false, gameOver: false }) as any;

describe("Ravage reveal shows hits as they land", () => {
  const tiles = [tile(1, "vulnerable"), tile(2, "removed"), tile(3, "healthy", { shield: false }), tile(4, "vulnerable", { stabilised: false })];
  const s = story(step([1, 2, 3, 4], [
    { tile: 1, outcome: "vulnerable" }, { tile: 2, outcome: "removed" }, { tile: 3, outcome: "shield_lost" }, { tile: 4, outcome: "marker_lost" },
  ]));

  it("before any badge, every hit is hidden", () => {
    const d = displayTiles(tiles, s, 0, 0);
    expect(d[0]!.status).toBe("healthy");
    expect(d[1]!.status).toBe("vulnerable");
    expect(d[2]!.shield).toBe(true);
    expect(d[3]!.stabilised).toBe(true);
  });
  it("each hit appears with its own badge", () => {
    const d = displayTiles(tiles, s, 0, 2);
    expect(d[0]!.status).toBe("vulnerable");
    expect(d[1]!.status).toBe("removed");
    expect(d[2]!.shield).toBe(true);
    expect(d[3]!.stabilised).toBe(true);
  });
  it("once every called tile is shown, the table is the real state, and the same array comes back", () => {
    expect(displayTiles(tiles, s, 0, 4)).toBe(tiles);
  });
  it("never changes the real state", () => { displayTiles(tiles, s, 0, 0); expect(tiles[0]!.status).toBe("vulnerable"); expect(tiles[1]!.status).toBe("removed"); });
  it("a hit on a tile that was not called (a Cascade) shows after the last badge", () => {
    const s2 = story(step([1], [{ tile: 1, outcome: "vulnerable" }, { tile: 2, outcome: "removed" }]));
    expect(displayTiles(tiles, s2, 0, 0)[1]!.status).toBe("vulnerable");
    expect(displayTiles(tiles, s2, 0, 1)).toBe(tiles);
  });
  it("later cards stay hidden until their own step, earlier ones stay shown", () => {
    const s3 = story(step([1], [{ tile: 1, outcome: "vulnerable" }]), step([3], [{ tile: 3, outcome: "shield_lost" }]));
    expect(displayTiles(tiles, s3, 1, 0)[0]!.status).toBe("vulnerable");
    expect(displayTiles(tiles, s3, 1, 0)[2]!.shield).toBe(true);
    expect(displayTiles(tiles, s3, 0, 0)[0]!.status).toBe("healthy");
    expect(unrevealed(s3, 1, 1)).toEqual([]);
  });
  it("two hits on one tile are undone newest first", () => {
    const t2 = [tile(5, "removed")];
    const s4 = story(step([5, 5], [{ tile: 5, outcome: "vulnerable" }, { tile: 5, outcome: "removed" }]));
    expect(displayTiles(t2, s4, 0, 0)[0]!.status).toBe("healthy");
  });
});

describe("owner tokens and pawns on a tile that is about to be lost", () => {
  const player = (seat: number, pos: number | null, tokens = 12) => ({ id: `p${seat}`, seat, pos, tokensInSupply: tokens, name: `P${seat}` }) as any;
  const lostStep = (extra: object = {}) => ({ ...step([7], [{ tile: 7, outcome: "removed", owner: "p0" }]), evacuations: [{ seat: 1, tile: 7 }], ...extra });
  const tiles = [tile(7, "removed")];
  const players = [player(0, 3, 11), player(1, null, 12)];

  it("keeps the token on the tile until its badge shows", () => {
    expect(displayTiles(tiles, story(lostStep()), 0, 0)[0]!.owner).toBe("p0");
    expect(displayTiles(tiles, story(lostStep()), 0, 1)).toBe(tiles);
  });
  it("keeps the pawn standing on the tile and the token out of the owner's supply, then lets go together", () => {
    const d = displayPlayers(players, story(lostStep()), 0, 0);
    expect(d[1]!.pos).toBe(7);
    expect(d[0]!.tokensInSupply).toBe(10);
    expect(displayPlayers(players, story(lostStep()), 0, 1)).toBe(players);
  });
  it("leaves other Stewards alone and never changes the real players", () => {
    const d = displayPlayers(players, story(lostStep()), 0, 0);
    expect(d[0]!.pos).toBe(3);
    expect(players[1]!.pos).toBeNull();
    expect(players[0]!.tokensInSupply).toBe(11);
  });
  it("does nothing when the story has no token or pawn data (no `before` given)", () => {
    const bare = story(step([7], [{ tile: 7, outcome: "removed" }]));
    expect(displayPlayers(players, bare, 0, 0)).toBe(players);
    expect(displayTiles(tiles, bare, 0, 0)[0]!.owner).toBeNull();
  });
  it("a later card's loss stays hidden until its own step", () => {
    const s2 = story(step([1], [{ tile: 1, outcome: "vulnerable" }]), lostStep());
    expect(displayPlayers(players, s2, 0, 1)[1]!.pos).toBe(7);
    expect(displayPlayers(players, s2, 1, 1)).toBe(players);
  });
});
