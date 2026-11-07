import { describe, expect, it } from "vitest";
import { computeLegacy, createGame, mulberry32, pressureOf } from "../src";
import { C, biomeTiles, clone, cleanBoard, doit, err, eventId, newGame, putOnTop, ravageId, shapeBiome, toolId } from "./helpers";

const kinds = (evs: { kind: string }[], k: string) => evs.filter((e) => e.kind === k);
const hub = C.board.hubId;

describe("rng", () => {
  it("is deterministic and inclusive at both ends", () => {
    const a = mulberry32(42), b = mulberry32(42);
    expect([a.next(), a.next()]).toEqual([b.next(), b.next()]);
    const r = mulberry32(7);
    const seen = new Set(Array.from({ length: 400 }, () => r.int(0, 3)));
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });
});

describe("setup", () => {
  it("builds a valid 61-tile board and a 60-card deck", () => {
    const s = newGame({ seed: 5, players: 4 });
    expect(s.tiles).toHaveLength(61);
    expect(s.tiles[hub]!.biome).toBe("hub");
    for (const b of ["forest", "coral", "wetland", "glacier", "grassland", "river"]) expect(biomeTiles(s, b)).toHaveLength(10);
    expect(s.deck.length + s.players.reduce((n, p) => n + p.hand.length, 0)).toBe(60);
    expect(s.players.every((p) => p.hand.length === 1 && p.pos === hub && p.tokensInSupply === 12)).toBe(true);
    expect(s.phase).toBe("turn");
  });
  it("is fully reproducible from the seed", () => {
    expect(newGame({ seed: 99 })).toEqual(newGame({ seed: 99 }));
    expect(newGame({ seed: 99 }).tiles.map((t) => t.biome)).not.toEqual(newGame({ seed: 100 }).tiles.map((t) => t.biome));
  });
  it("sets the Metre per difficulty (+8 for two players) and Easy extras", () => {
    expect(newGame({ difficulty: "easy", players: 3 }).metreTicks).toBe(8);
    expect(newGame({ difficulty: "normal", players: 4 }).metreTicks).toBe(16);
    expect(newGame({ difficulty: "hard", players: 4 }).metreTicks).toBe(24);
    expect(newGame({ difficulty: "normal", players: 2 }).metreTicks).toBe(24);
    const e3 = newGame({ difficulty: "easy", players: 3 });
    expect(e3.players.every((p) => p.roles.length === 2)).toBe(true);
    expect(e3.calmCoverCardId).not.toBeNull();
    expect(newGame({ difficulty: "easy", players: 4 }).players[3]!.hand).toHaveLength(2);
    expect(newGame({ difficulty: "easy", players: 5 }).players.slice(3).every((p) => p.hand.length === 2)).toBe(true);
  });
  it("never moves the Metre in the Opening Strike", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = newGame({ seed, difficulty: "hard", players: 4 });
      expect(s.metreTicks).toBe(24);
      expect(s.phase).toBe("turn");
    }
  });
});

describe("Ravage and the Metre (spec review Q1 to Q6)", () => {
  const prep = (s0: ReturnType<typeof newGame>, biome: string, removed: number, vulnerable: number, ticks: number, card: string) => {
    const s = shapeBiome(s0, biome, removed, vulnerable);
    s.metreTicks = ticks;
    return putOnTop(s, card);
  };

  it("Q1: pressure 5, 7 removed + 3 healthy: 5 calls, memory resets, 2 tiles removed, no extinction, Metre still", () => {
    const s = prep(newGame(), "forest", 7, 0, 36, ravageId("forest", false));
    const r = doit(s, { type: "Draw" });
    expect(kinds(r.events, "TileCalled")).toHaveLength(5);
    expect(kinds(r.events, "CallMemoryReset")).toHaveLength(1);
    expect(r.state.removedByBiome.forest).toBe(9);
    expect(r.state.extinct.forest).toBe(false);
    expect(r.state.metreTicks).toBe(36);
    expect(biomeTiles(r.state, "forest").filter((t) => t.status === "vulnerable")).toHaveLength(1);
  });

  it("Q2: Surge, Cascade at the 5th removal: 3 calls, Metre +16", () => {
    const s = prep(newGame(), "forest", 4, 6, 20, ravageId("forest", true));     // pressure 3
    expect(pressureOf(20)).toBe(3);
    const r = doit(s, { type: "Draw" });
    expect(kinds(r.events, "TileCalled")).toHaveLength(3);
    expect(kinds(r.events, "CascadeFired")).toHaveLength(1);
    expect(r.state.metreTicks).toBe(36);
  });

  it("Q3: first extinction at tick 35 is Skull and stops the card", () => {
    const s = prep(newGame(), "forest", 9, 1, 35, ravageId("forest", false));
    s.cascaded.forest = true;
    const r = doit(s, { type: "Draw" });
    expect(r.state.result).toMatchObject({ kind: "collapse", reason: "skull" });
    expect(kinds(r.events, "TileCalled")).toHaveLength(1);
  });

  it("Q4: extinct biome Surge with a Lobby charge: no calls, charge used, Metre +8", () => {
    const s = prep(newGame(), "forest", 10, 0, 16, ravageId("forest", true));
    s.extinct.forest = true; s.extinctCount = 1; s.lobbyCharges = 2;
    const r = doit(s, { type: "Draw" });
    expect(kinds(r.events, "TileCalled")).toHaveLength(0);
    expect(r.state.lobbyCharges).toBe(1);
    expect(r.state.metreTicks).toBe(24);
    expect(r.state.deck).toContain(ravageId("forest", true));
  });

  it("Q6: the Calm-covered Surge card does not move the Metre", () => {
    const id = ravageId("river", true);
    const s = prep(newGame({ difficulty: "easy" }), "river", 0, 0, 8, id);
    s.calmCoverCardId = id;
    const r = doit(s, { type: "Draw" });
    expect(r.state.metreTicks).toBe(8);
    expect(kinds(r.events, "SurgeSkipped")).toHaveLength(1);
  });

  it("a shield absorbs a call, a marker absorbs a call", () => {
    let s = shapeBiome(newGame(), "wetland", 0, 0);
    biomeTiles(s, "wetland").forEach((t) => { t.shield = true; });
    s.shieldSupply = 0;
    s = putOnTop(s, ravageId("wetland", false));
    const r = doit(s, { type: "Draw" });
    expect(kinds(r.events, "TileHit").every((e) => (e as { outcome?: unknown }).outcome === "shield_lost")).toBe(true);
    expect(r.state.shieldSupply).toBe(pressureOf(16));
  });
});

describe("tools, hands and gifts (Q7 to Q12)", () => {
  const stand = (s: ReturnType<typeof newGame>, tile: number, seat = s.activeSeat) => { s.players[seat]!.pos = tile; };

  it("restore: tile healthy, owner set, Metre -2, single-use tool returns to the deck", () => {
    let s = shapeBiome(newGame(), "forest", 0, 1);
    const tile = biomeTiles(s, "forest").find((t) => t.status === "vulnerable")!;
    stand(s, tile.id);
    s.players[s.activeSeat]!.hand = [{ cardId: toolId("forest"), usesLeft: 1, usedOn: [] }];
    s = putOnTop(s, ravageId("river", false));
    s.players[s.activeSeat]!.hand = [{ cardId: toolId("forest"), usesLeft: 1, usedOn: [] }];
    const r = doit(s, { type: "UseTool", handIndex: 0, kind: "restore" });
    const t2 = r.state.tiles[tile.id]!;
    expect(t2.status).toBe("healthy");
    expect(t2.owner).toBe(s.players[s.activeSeat]!.id);
    expect(r.state.metreTicks).toBe(14);
    expect(r.state.players[s.activeSeat]!.hand).toHaveLength(0);
    expect(r.state.players[s.activeSeat]!.tokensInSupply).toBe(11);
    expect(err(r.state, { type: "UseTool", handIndex: 0, kind: "fortify" })).toBe("E_ACTION_USED");
  });

  it("Q7: a Programme card cannot be used twice on the same tile", () => {
    const s = shapeBiome(newGame(), "forest", 0, 1);
    const tile = biomeTiles(s, "forest")[0]!;
    stand(s, tile.id);
    s.players[s.activeSeat]!.hand = [{ cardId: toolId("forest", true), usesLeft: 1, usedOn: [tile.id] }];
    expect(err(s, { type: "UseTool", handIndex: 0, kind: "restore" })).toBe("E_SAME_TILE");
  });

  it("wrong biome is refused, Engineer ignores the match", () => {
    const s = shapeBiome(newGame(), "forest", 0, 1);
    const tile = biomeTiles(s, "forest")[0]!;
    stand(s, tile.id);
    const p = s.players[s.activeSeat]!;
    p.roles = ["ranger"];
    p.hand = [{ cardId: toolId("river"), usesLeft: 1, usedOn: [] }];
    expect(err(s, { type: "UseTool", handIndex: 0, kind: "restore" })).toBe("E_BIOME_MISMATCH");
    p.roles = ["engineer"];
    expect(doit(s, { type: "UseTool", handIndex: 0, kind: "restore" }).state.tiles[tile.id]!.status).toBe("healthy");
  });

  it("Q8: a Tool drawn with a full hand goes back into the deck", () => {
    let s = cleanBoard(newGame());
    s.players[s.activeSeat]!.hand = ["forest", "river", "wetland"].map((b) => ({ cardId: toolId(b), usesLeft: 1, usedOn: [] }));
    s = putOnTop(s, toolId("glacier"));
    const r = doit(s, { type: "Draw" });
    expect(kinds(r.events, "HandOverflowBounced")).toHaveLength(1);
    expect(r.state.players[s.activeSeat]!.hand).toHaveLength(3);
  });

  it("Q8: Grant Funding with a full hand takes nothing; with room it asks for a pick", () => {
    let s = cleanBoard(newGame());
    s.players[s.activeSeat]!.hand = ["forest", "river", "wetland"].map((b) => ({ cardId: toolId(b), usesLeft: 1, usedOn: [] }));
    const full = doit(putOnTop(s, eventId("grant")), { type: "Draw" });
    expect(full.state.pending).toBeNull();
    s.players[s.activeSeat]!.hand = [];
    const room = doit(putOnTop(s, eventId("grant")), { type: "Draw" });
    expect(room.state.pending).toMatchObject({ kind: "grantPick" });
    const picked = doit(room.state, { type: "Resolve", payload: { cardId: toolId("glacier") } });
    expect(picked.state.players[s.activeSeat]!.hand.map((h) => h.cardId)).toContain(toolId("glacier"));
    expect(picked.state.activeSeat).not.toBe(s.activeSeat);
  });

  it("Q9: one Gift per turn away from the Hub, unlimited at the Hub", () => {
    const s = cleanBoard(newGame({ players: 3 }));
    const away = biomeTiles(s, "forest")[0]!.id;
    for (const p of s.players) p.pos = away;
    const me = s.players[s.activeSeat]!;
    me.hand = [toolId("forest"), toolId("river")].map((c) => ({ cardId: c, usesLeft: 1, usedOn: [] }));
    const first = doit(s, { type: "Gift", toPlayer: s.players[(s.activeSeat + 1) % 3]!.id, handIndex: 0 });
    expect(err(first.state, { type: "Gift", toPlayer: s.players[(s.activeSeat + 2) % 3]!.id, handIndex: 0 })).toBe("E_ACTION_USED");
    for (const p of s.players) p.pos = hub;
    s.players.forEach((p) => { if (p !== me) p.hand = []; });
    const a = doit(s, { type: "Gift", toPlayer: s.players[(s.activeSeat + 1) % 3]!.id, handIndex: 0 });
    expect(doit(a.state, { type: "Gift", toPlayer: s.players[(s.activeSeat + 2) % 3]!.id, handIndex: 0 }).state.players[(s.activeSeat + 2) % 3]!.hand).toHaveLength(1);
  });

  it("Gift is refused if the recipient is on another tile or has a full hand", () => {
    const s = cleanBoard(newGame({ players: 2 }));
    const me = s.players[s.activeSeat]!, other = s.players[(s.activeSeat + 1) % 2]!;
    me.hand = [{ cardId: toolId("forest"), usesLeft: 1, usedOn: [] }];
    me.pos = biomeTiles(s, "forest")[0]!.id;
    expect(err(s, { type: "Gift", toPlayer: other.id, handIndex: 0 })).toBe("E_NOT_SAME_TILE");
    other.pos = me.pos;
    other.hand = ["river", "wetland", "glacier"].map((b) => ({ cardId: toolId(b), usesLeft: 1, usedOn: [] }));
    expect(err(s, { type: "Gift", toPlayer: other.id, handIndex: 0 })).toBe("E_HAND_FULL");
  });

  it("Q10: no double Stabilise; a Ravage hit removes the marker and the tile stays Vulnerable", () => {
    let s = shapeBiome(newGame(), "wetland", 0, 1);
    biomeTiles(s, "wetland").forEach((t) => { if (t.status === "healthy") t.status = "removed"; });   // only 1 standing
    s.removedByBiome.wetland = 9; s.cascaded.wetland = true;
    const tile = biomeTiles(s, "wetland").find((t) => t.status === "vulnerable")!;
    stand(s, tile.id);
    const a = doit(s, { type: "Stabilise" });
    expect(a.state.tiles[tile.id]!.stabilised).toBe(true);
    const b = clone(a.state); b.turn!.toolActionUsed = false;
    expect(err(b, { type: "Stabilise" })).toBe("E_WRONG_STATUS");
    const c = putOnTop(a.state, ravageId("wetland", false));
    const r = doit(c, { type: "Draw" });
    expect(kinds(r.events, "TileHit")[0]).toMatchObject({ outcome: "marker_lost" });
    expect(r.state.tiles[tile.id]!.status).not.toBe("healthy");
  });

  it("Q11: Restore with all 12 tokens placed still restores and lowers the Metre but ownership stays", () => {
    const s = shapeBiome(newGame(), "forest", 0, 1);
    const tile = biomeTiles(s, "forest").find((t) => t.status === "vulnerable")!;
    stand(s, tile.id);
    const p = s.players[s.activeSeat]!;
    p.tokensInSupply = 0;
    p.hand = [{ cardId: toolId("forest"), usesLeft: 1, usedOn: [] }];
    const r = doit(s, { type: "UseTool", handIndex: 0, kind: "restore" });
    expect(r.state.tiles[tile.id]!.status).toBe("healthy");
    expect(r.state.tiles[tile.id]!.owner).toBeNull();
    expect(r.state.metreTicks).toBe(14);
  });

  it("Q12: Supply Squeeze asks each Steward with 2+ Tools; a lone Tool is returned automatically", () => {
    let s = cleanBoard(newGame({ players: 3 }));
    const mk = (b: string, programme = false) => ({ cardId: toolId(b, programme), usesLeft: programme ? 1 : 1, usedOn: [] as number[] });
    s.players[s.activeSeat]!.hand = [mk("forest"), mk("river", true)];
    s.players[(s.activeSeat + 1) % 3]!.hand = [];
    s.players[(s.activeSeat + 2) % 3]!.hand = [mk("glacier")];
    s = putOnTop(s, eventId("squeeze"));
    const r = doit(s, { type: "Draw" });
    expect(r.state.pending).toMatchObject({ kind: "squeezeReturn", seat: s.activeSeat });
    const r2 = doit(r.state, { type: "Resolve", payload: { handIndex: 1 } });
    expect(r2.state.players.map((p) => p.hand.length)).toEqual(r2.state.players.map((_, i) => (i === s.activeSeat ? 1 : 0)));
    expect(r2.state.deck.length + 1).toBe(60);
  });

  it("Q13: Heat Dome chains are capped at 3 levels and terminate", () => {
    let s = cleanBoard(newGame());
    const heat = eventId("heat");
    s.deck = [heat, heat, heat, heat, heat, heat, heat, heat, ...s.deck.filter((id) => id !== heat)];
    s.players.forEach((p) => { p.hand = []; });
    const r = doit(s, { type: "Draw" });
    expect(r.events.some((e) => e.kind === "EventResolved" && e.note === "depth cap")).toBe(true);
    expect(r.state.activeSeat).not.toBe(s.activeSeat);
  });
});

describe("roles, movement and turns (Q14 to Q19)", () => {
  it("Q14: Forecast uses the Tool action; Forecast after Stabilise is refused", () => {
    let s = shapeBiome(newGame(), "forest", 0, 1);
    const tile = biomeTiles(s, "forest").find((t) => t.status === "vulnerable")!;
    const me = s.players[s.activeSeat]!;
    me.roles = ["ecologist"]; me.pos = tile.id;
    me.hand = [{ cardId: toolId("forest"), usesLeft: 1, usedOn: [] }];
    const f = doit(s, { type: "UseAbility", role: "ecologist" });
    expect(f.state.pending).toMatchObject({ kind: "forecastKeepOrBottom" });
    const top = f.state.deck[0];
    const g = doit(f.state, { type: "Resolve", payload: { bottom: true } });
    expect(g.state.deck[g.state.deck.length - 1]).toBe(top);
    expect(err(g.state, { type: "UseTool", handIndex: 0, kind: "restore" })).toBe("E_ACTION_USED");
    expect(err(g.state, { type: "Stabilise" })).toBe("E_ACTION_USED");
    const step = C.board.tiles[tile.id]!.neighbours.find((n) => g.state.tiles[n]!.status !== "removed")!;
    expect(doit(g.state, { type: "Move", path: [step] }).state.players[s.activeSeat]!.pos).toBe(step);   // Move is still allowed
    const st = doit(s, { type: "Stabilise" });
    expect(err(st.state, { type: "UseAbility", role: "ecologist" })).toBe("E_ACTION_USED");
  });

  it("Q15: the Pilot jump costs no steps", () => {
    const s = cleanBoard(newGame({ players: 2 }));
    const me = s.players[s.activeSeat]!, other = s.players[(s.activeSeat + 1) % 2]!;
    me.roles = ["pilot"]; other.pos = biomeTiles(s, "river")[0]!.id;
    const r = doit(s, { type: "UseAbility", role: "pilot", payload: { to: other.pos } });
    expect(r.state.players[s.activeSeat]!.pos).toBe(other.pos);
    expect(r.state.turn!.stepsUsed).toBe(0);
    expect(err(s, { type: "UseAbility", role: "pilot", payload: { to: biomeTiles(s, "river")[3]!.id } })).toBe("E_BAD_PAYLOAD");
  });

  it("moves at most 3 steps, only to adjacent, standing tiles", () => {
    const s = cleanBoard(newGame());
    const nb = C.board.tiles[hub]!.neighbours;
    expect(doit(s, { type: "Move", path: [nb[0]!] }).state.turn!.stepsUsed).toBe(1);
    expect(err(s, { type: "Move", path: [nb[0]!, nb[0]!, nb[0]!, nb[0]!] })).toBe("E_STEPS");
    const far = s.tiles.find((t) => !nb.includes(t.id) && t.id !== hub)!.id;
    expect(err(s, { type: "Move", path: [far] })).toBe("E_BAD_PATH");
    s.tiles[nb[0]!]!.status = "removed";
    expect(err(s, { type: "Move", path: [nb[0]!] })).toBe("E_REMOVED");
  });

  it("Q16: the Ranger may cross removed tiles but not end on one", () => {
    const s = cleanBoard(newGame());
    const me = s.players[s.activeSeat]!; me.roles = ["ranger"];
    const [a] = C.board.tiles[hub]!.neighbours as [number];
    const beyond = C.board.tiles[a]!.neighbours.find((n) => n !== hub && !C.board.tiles[hub]!.neighbours.includes(n))!;
    s.tiles[a]!.status = "removed";
    expect(doit(s, { type: "Move", path: [a, beyond] }).state.players[s.activeSeat]!.pos).toBe(beyond);
    expect(err(s, { type: "Move", path: [a] })).toBe("E_END_REMOVED");
  });

  it("Q17: Improvise needs a stranded pawn and spends a Tool", () => {
    const s = cleanBoard(newGame());
    const me = s.players[s.activeSeat]!;
    const spot = biomeTiles(s, "glacier").find((t) => C.board.tiles[t.id]!.neighbours.length === 6)!;
    me.pos = spot.id; me.roles = ["engineer"];
    me.hand = [{ cardId: toolId("river"), usesLeft: 1, usedOn: [] }];
    expect(err(s, { type: "Improvise", handIndex: 0 })).toBe("E_NOT_STRANDED");
    const nbs = C.board.tiles[spot.id]!.neighbours;
    nbs.forEach((n) => { s.tiles[n]!.status = "removed"; });
    const beyond = C.board.tiles[nbs[0]!]!.neighbours.find((n) => !nbs.includes(n) && n !== spot.id && s.tiles[n]!.status !== "removed")!;
    expect(err(s, { type: "Move", path: [nbs[0]!, beyond] })).toBe("E_REMOVED");
    const imp = doit(s, { type: "Improvise", handIndex: 0 });
    expect(imp.state.players[s.activeSeat]!.hand).toHaveLength(0);
    expect(doit(imp.state, { type: "Move", path: [nbs[0]!, beyond] }).state.players[s.activeSeat]!.pos).toBe(beyond);
  });

  it("Q18: Normal evacuation misses exactly 2 of her own turns, then she returns to the Hub", () => {
    let s = cleanBoard(newGame({ players: 3 }));
    s.activeSeat = 0;
    s.players[1]!.pos = null; s.players[1]!.awayTurns = 2;
    const order: number[] = [];
    for (let i = 0; i < 6; i++) {
      s = putOnTop(s, ravageId("glacier", false));                  // harmless-ish draw; every turn ends with a Draw
      order.push(s.activeSeat);
      s = doit(s, { type: "Draw" }).state;
    }
    expect(order).toEqual([0, 2, 0, 2, 0, 1]);
    expect(s.players[1]!.pos).toBe(hub);
  });

  it("Activist declaration lowers the next Ravage by one (min 1)", () => {
    let s = shapeBiome(newGame(), "glacier", 0, 0);
    s.metreTicks = 24;                                               // pressure 3
    s.players[s.activeSeat]!.roles = ["activist"];
    s = doit(s, { type: "UseAbility", role: "activist" }).state;
    s = putOnTop(s, ravageId("glacier", false));
    const r = doit(s, { type: "Draw" });
    expect(kinds(r.events, "TileCalled")).toHaveLength(2);
  });
});

describe("end of game (Q20 to Q23)", () => {
  it("Q20: reaching tick 0 with Fortify is the Trophy: no draw, final lap begins", () => {
    let s = shapeBiome(newGame({ players: 4 }), "forest", 0, 0);
    s.metreTicks = 1;
    const tile = biomeTiles(s, "forest")[0]!;
    const me = s.players[s.activeSeat]!; me.pos = tile.id;
    me.hand = [{ cardId: toolId("forest"), usesLeft: 1, usedOn: [] }];
    const deckBefore = s.deck.length;
    const r = doit(s, { type: "UseTool", handIndex: 0, kind: "fortify" });
    expect(r.state.metreTicks).toBe(0);
    expect(r.state.phase).toBe("finalLap");
    expect(r.state.deck.length).toBe(deckBefore + 1);               // only the returned tool, nothing drawn
    expect(r.state.activeSeat).toBe((s.activeSeat + 1) % 4);
  });

  it("Q21: the final lap order is next seats then the Trophy seat; nobody draws; Legacy is scored", () => {
    let s = shapeBiome(newGame({ players: 4 }), "forest", 0, 1);
    s.activeSeat = 1; s.startSeat = 1; s.metreTicks = 2;
    const tile = biomeTiles(s, "forest").find((t) => t.status === "vulnerable")!;
    const me = s.players[1]!; me.pos = tile.id;
    me.hand = [{ cardId: toolId("forest"), usesLeft: 1, usedOn: [] }];
    let r = doit(s, { type: "UseTool", handIndex: 0, kind: "restore" });
    expect(r.state.phase).toBe("finalLap");
    expect(r.state.finalLapRemaining).toEqual([3, 0, 1]);         // seat 2 is active now (shifted); remaining 3,0,1
    const seats = [r.state.activeSeat];
    const deckLen = r.state.deck.length;
    while (r.state.phase === "finalLap") {
      r = doit(r.state, { type: "Draw" });
      if (r.state.phase === "finalLap") seats.push(r.state.activeSeat);
    }
    expect(seats).toEqual([2, 3, 0, 1]);
    expect(r.state.deck.length).toBe(deckLen);
    expect(r.state.phase).toBe("over");
    expect(r.state.result?.kind).toBe("trophy");
    expect(r.state.result?.winners).toEqual([me.id]);
  });

  it("Q22: Guardian bonus needs a strict majority of tokens on standing tiles (Vulnerable count)", () => {
    const s = shapeBiome(newGame({ players: 3 }), "forest", 0, 0);
    const f = biomeTiles(s, "forest");
    const [mia, raj, ben] = s.players.map((p) => p.id) as [string, string, string];
    [mia, mia, mia, raj, raj, ben].forEach((o, i) => { f[i]!.owner = o; });
    f[2]!.status = "vulnerable";                                     // one of Mia's tokens is on a Vulnerable tile
    let l = computeLegacy(s, 3).legacy;
    expect(l[0]).toMatchObject({ tokensOnHealthy: 2, guardianBiomes: [], total: 2 });
    f[5]!.status = "removed"; f[5]!.owner = null;                    // Ben's tile removed: 3 of 5
    l = computeLegacy(s, 3).legacy;
    expect(l[0]).toMatchObject({ guardianBiomes: ["forest"], total: 5 });
  });

  it("Q23: a full tie is a shared win", () => {
    const s = shapeBiome(newGame({ players: 2 }), "forest", 0, 0);
    const f = biomeTiles(s, "forest");
    f[0]!.owner = s.players[0]!.id; f[1]!.owner = s.players[1]!.id;
    expect(computeLegacy(s, 3).winners).toEqual([s.players[0]!.id, s.players[1]!.id]);
  });
});

describe("misc guards", () => {
  it("refuses actions out of turn and while a decision is pending", () => {
    const s = newGame({ players: 3 });
    expect(err(s, { type: "Draw" }, `p${(s.activeSeat + 1) % 3}`)).toBe("E_NOT_YOUR_TURN");
    const p = putOnTop(s, eventId("citizen"));
    const r = doit(p, { type: "Draw" });
    expect(r.state.pending).toMatchObject({ kind: "reorderTop5" });
    expect(err(r.state, { type: "Draw" })).toBe("E_PENDING");
    expect(err(r.state, { type: "Resolve", payload: { order: ["x"] } })).toBe("E_BAD_PAYLOAD");
  });
  it("never mutates its input", () => {
    const s = newGame();
    const before = JSON.stringify(s);
    doit(s, { type: "Draw" });
    expect(JSON.stringify(s)).toBe(before);
  });
  it("createGame needs 2 to 5 players", () => {
    expect(() => createGame(C, { seed: 1, difficulty: "normal", players: [{ id: "a", name: "A" }] })).toThrow();
  });
});
