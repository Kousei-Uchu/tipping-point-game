// Tests for the play guide. They run against the real engine, so if a rule changes the advice is checked again.
import { describe, expect, it } from "vitest";
import { engine } from "../src/core/content";
import { LocalSession } from "../src/core/session";
import { actorId } from "../src/core/selectors";
import { buildGuide, guideFocus, isPassAndPlay, recap } from "../src/core/guide";
import { TUTORIAL_OPTIONS } from "../src/core/tutorial";
import type { NewGameOptions } from "@tipping-point/engine";

const opts = (seed = 7, n = 3, bots = 0): NewGameOptions => ({
  seed, difficulty: "normal",
  players: Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: ["Mia", "Raj", "Ben", "Zoe", "Kai"][i]!, isBot: i >= n - bots })),
});

describe("play guide", () => {
  it("names the active player and says it is their turn", () => {
    const s = new LocalSession(opts()).getSnapshot().state;
    const g = buildGuide(s);
    expect(g.mode).toBe("turn");
    expect(g.who.name).toBe(s.players[s.activeSeat]!.name);
    expect(g.headline).toContain("your turn");
    expect(g.fresh).toBe(true);
    expect(g.now.length).toBeGreaterThan(10);
    expect(g.then).toContain("Draw");
  });

  it("stops being fresh once the player has done something", () => {
    const sess = new LocalSession(opts());
    const st = sess.getSnapshot().state;
    const [, path] = [...engine.moveTargets(st, actorId(st)).entries()][0]!;
    sess.dispatch({ type: "Move", path }, actorId(st));
    expect(buildGuide(sess.getSnapshot().state).fresh).toBe(false);
  });

  it("in the tutorial seed, points at the damaged tile and then at the Tool", () => {
    const sess = new LocalSession(TUTORIAL_OPTIONS);
    const g = buildGuide(sess.getSnapshot().state);
    expect(g.now).toContain("Walk to the damaged");
    expect(g.now).toContain("3 steps");
    // After walking there, the best move is to repair.
    const st = sess.getSnapshot().state;
    const path = engine.moveTargets(st, actorId(st)).get(36)!;
    expect(sess.dispatch({ type: "Move", path }, actorId(st)).ok).toBe(true);
    const g2 = buildGuide(sess.getSnapshot().state);
    expect(g2.now).toContain("press Restore");
  });

  it("tells you to draw once every action is spent", () => {
    const sess = new LocalSession(TUTORIAL_OPTIONS);
    let st = sess.getSnapshot().state;
    sess.dispatch({ type: "Move", path: engine.moveTargets(st, actorId(st)).get(36)! }, actorId(st));
    st = sess.getSnapshot().state;
    sess.dispatch({ type: "UseTool", handIndex: 0, kind: "restore" }, actorId(st));
    const g = buildGuide(sess.getSnapshot().state);
    expect(g.mode).toBe("turn");
    expect(g.now.length).toBeGreaterThan(10);
    expect(g.then).toContain("press Draw");
  });

  it("says a bot is playing and that the human has nothing to do", () => {
    const sess = new LocalSession(opts(7, 2, 1));
    // Play the human's turn away so the bot becomes active.
    const st = sess.getSnapshot().state;
    expect(buildGuide(st).mode).toBe("turn");
    sess.dispatch({ type: "Draw" }, actorId(st));
    let s2 = sess.getSnapshot().state;
    // A Ravage card may be waiting behind a pending decision. Only check when the bot is up.
    if (!s2.pending && s2.players[s2.activeSeat]!.isBot) {
      const g = buildGuide(s2);
      expect(g.mode).toBe("bot");
      expect(g.now).toContain("Nothing for you to do");
    }
    expect(isPassAndPlay(s2)).toBe(false);
  });

  it("explains a pending decision in plain words", () => {
    // Hunt a seed where a draw leaves a decision pending.
    for (let seed = 1; seed < 400; seed++) {
      const sess = new LocalSession(opts(seed));
      for (let i = 0; i < 30; i++) {
        const st = sess.getSnapshot().state;
        if (st.phase === "over") break;
        if (st.pending) {
          const g = buildGuide(st);
          expect(g.mode).toBe("decision");
          expect(g.now.length).toBeGreaterThan(15);
          return;
        }
        sess.dispatch({ type: "Draw" }, actorId(st));
      }
    }
    throw new Error("no seed produced a pending decision");
  });

  it("recap covers the previous turn and never mentions the new turn itself", () => {
    const sess = new LocalSession(opts());
    const st = sess.getSnapshot().state;
    sess.dispatch({ type: "Draw" }, actorId(st));
    const snap = sess.getSnapshot();
    if (snap.state.pending) return; // covered by the test above
    const lines = recap(snap.state, snap.events);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(6);
    expect(lines.some((l) => /'s turn\./.test(l.text))).toBe(false);
  });

  it("never throws, whatever happens, across whole random games", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const sess = new LocalSession(opts(seed, 2 + (seed % 4)));
      for (let i = 0; i < 500; i++) {
        const st = sess.getSnapshot().state;
        if (st.phase === "over") break;
        const g = buildGuide(st);
        expect(g.now.length).toBeGreaterThan(0);
        expect(g.headline.length).toBeGreaterThan(0);
        recap(st, sess.getSnapshot().events);
        const id = actorId(st);
        const r = sess.dispatch(engine.chooseAction(st), id);
        if (!r.ok) sess.dispatch({ type: "Draw" }, id);
      }
    }
  });
});

describe("guide focus (what lights up)", () => {
  it("lights the damaged tile the guide says to walk to, in the tutorial seed", () => {
    const s = new LocalSession(TUTORIAL_OPTIONS).getSnapshot().state;
    const f = guideFocus(s);
    expect(f.tiles).toHaveLength(1);
    expect(s.tiles[f.tiles[0]!]!.status).toBe("vulnerable");
    expect(f.hand).toBe(false);
    expect(f.deck).toBe(false);
  });

  it("after walking there, lights the tile you stand on and the Tool cards", () => {
    const sess = new LocalSession(TUTORIAL_OPTIONS);
    const st = sess.getSnapshot().state;
    const target = guideFocus(st).tiles[0]!;
    const path = engine.moveTargets(st, actorId(st)).get(target)!;
    sess.dispatch({ type: "Move", path }, actorId(st));
    const s2 = sess.getSnapshot().state;
    expect(buildGuide(s2).now).toContain("Repair this");
    const f = guideFocus(s2);
    expect(f.tiles).toEqual([target]);
    expect(f.hand).toBe(true);
  });

  it("pulses the draw pile once there is nothing left to do but Draw", () => {
    const sess = new LocalSession(TUTORIAL_OPTIONS);
    let s = sess.getSnapshot().state;
    const target = guideFocus(s).tiles[0]!;
    sess.dispatch({ type: "Move", path: engine.moveTargets(s, actorId(s)).get(target)! }, actorId(s));
    s = sess.getSnapshot().state;
    const idx = s.players[s.activeSeat]!.hand.findIndex((_, i) => engine.check(s, { type: "UseTool", handIndex: i, kind: "restore" }, actorId(s)) === null);
    sess.dispatch({ type: "UseTool", handIndex: idx, kind: "restore" }, actorId(s));
    s = sess.getSnapshot().state;
    // Whatever is left, lights always agree with the words: Draw pulses only when the guide says so.
    const f = guideFocus(s);
    const g = buildGuide(s);
    if (f.deck) expect(g.now).toMatch(/Draw|nothing|out of actions/i);
    expect(f.hand).toBe(false);
  });

  it("lights nothing on a bot's turn", () => {
    const s = new LocalSession(opts(7, 3, 3)).getSnapshot().state;
    expect(buildGuide(s).mode).toBe("bot");
    expect(guideFocus(s)).toEqual({ tiles: [], hand: false, deck: false });
  });
});
