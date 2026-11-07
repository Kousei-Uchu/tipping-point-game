import { describe, expect, it } from "vitest";
import { content, engine } from "../src/core/content";
import { LocalSession, parseSaved } from "../src/core/session";
import { counters, actorId, toolOptions, legacyNow } from "../src/core/selectors";
import { narrateAll } from "../src/core/narrate";
import { buildStory } from "../src/core/story";
import type { NewGameOptions } from "@tipping-point/engine";

const opts = (seed = 7, n = 3): NewGameOptions => ({
  seed, difficulty: "normal",
  players: Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: ["Mia", "Raj", "Ben", "Zoe", "Kai"][i]! })),
});

/** Plays a whole game with the simplest legal behaviour: restore when possible, else draw. */
function autoplay(session: LocalSession, maxActions = 4000) {
  for (let i = 0; i < maxActions; i++) {
    const s = session.getSnapshot().state;
    if (s.phase === "over") return;
    const id = actorId(s);
    if (s.pending) {
      const p = s.pending;
      let payload: unknown = {};
      if (p.kind === "reorderTop5") payload = { order: p.cardIds };
      if (p.kind === "grantPick") payload = { cardId: s.deck.find((d) => content.cards.find((c) => c.id === d)?.type === "tool") };
      if (p.kind === "squeezeReturn") payload = { handIndex: 0 };
      session.dispatch({ type: "Resolve", payload }, id);
      continue;
    }
    const me = s.players[s.activeSeat]!;
    for (let h = 0; h < me.hand.length; h++) {
      if (toolOptions(s, me, h).restore === null) { session.dispatch({ type: "UseTool", handIndex: h, kind: "restore" }, id); break; }
    }
    session.dispatch({ type: "Draw" }, id);
  }
}

describe("LocalSession", () => {
  it("starts on a playable turn", () => {
    const s = new LocalSession(opts()).getSnapshot();
    expect(s.state.phase).toBe("turn");
    expect(counters(s.state)).toEqual({ moves: 3, tool: true, ability: expect.any(Boolean), gift: true });
    expect(s.canUndo).toBe(false);
  });

  it("undo restores the previous state and event count exactly", () => {
    const sess = new LocalSession(opts());
    const before = sess.getSnapshot();
    const targets = engine.moveTargets(before.state, actorId(before.state));
    const [, path] = [...targets.entries()][0]!;
    expect(sess.dispatch({ type: "Move", path }, actorId(before.state)).ok).toBe(true);
    expect(sess.getSnapshot().canUndo).toBe(true);
    expect(sess.undo()).toBe(true);
    const after = sess.getSnapshot();
    expect(after.state).toEqual(before.state);
    expect(after.events.length).toBe(before.events.length);
    expect(after.canUndo).toBe(false);
  });

  it("closes the undo window after a draw", () => {
    const sess = new LocalSession(opts());
    const id = actorId(sess.getSnapshot().state);
    const [, path] = [...engine.moveTargets(sess.getSnapshot().state, id).entries()][0]!;
    sess.dispatch({ type: "Move", path }, id);
    sess.dispatch({ type: "Draw" }, id);
    expect(sess.getSnapshot().canUndo).toBe(false);
    expect(sess.undo()).toBe(false);
  });

  it("rejects illegal actions without changing anything", () => {
    const sess = new LocalSession(opts());
    const rev = sess.getSnapshot().revision;
    const r = sess.dispatch({ type: "Draw" }, "nobody");
    expect(r.ok).toBe(false);
    expect(sess.getSnapshot().revision).toBe(rev);
  });

  it("save then replay gives the identical state", () => {
    const sess = new LocalSession(opts(11, 4));
    for (let i = 0; i < 12 && sess.getSnapshot().state.phase !== "over"; i++) {
      const s = sess.getSnapshot().state;
      if (s.pending) break;
      sess.dispatch({ type: "Draw" }, actorId(s));
    }
    const saved = JSON.parse(JSON.stringify(sess.toSaved()));
    const again = LocalSession.fromSaved(saved);
    expect(again.getSnapshot().state).toEqual(sess.getSnapshot().state);
    expect(again.getSnapshot().events.length).toBe(sess.getSnapshot().events.length);
  });

  it("a full autoplayed game finishes and narrates every logged event without throwing", () => {
    const sess = new LocalSession(opts(3, 4));
    autoplay(sess);
    const snap = sess.getSnapshot();
    expect(snap.state.phase).toBe("over");
    const lines = narrateAll(content, snap.state, snap.events);
    expect(lines.length).toBeGreaterThan(10);
    expect(lines.every((l) => l.text.length > 0 && !l.text.includes("\u2014"))).toBe(true);
    if (snap.state.result?.kind === "trophy") expect(legacyNow(snap.state).legacy.length).toBe(4);
  });

  it("story groups a draw into steps", () => {
    const sess = new LocalSession(opts(5));
    const id = actorId(sess.getSnapshot().state);
    const r = sess.dispatch({ type: "Draw" }, id);
    expect(r.ok).toBe(true);
    const story = buildStory(content, sess.getSnapshot().lastBatch);
    expect(story.steps.length).toBeGreaterThanOrEqual(1);
  });

  it("parseSaved ignores junk", () => {
    expect(parseSaved(null)).toBeNull();
    expect(parseSaved("not json")).toBeNull();
    expect(parseSaved(JSON.stringify({ v: 2 }))).toBeNull();
  });
});
