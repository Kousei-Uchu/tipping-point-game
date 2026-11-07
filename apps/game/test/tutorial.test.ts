// Tests for the guided tutorial. They run the whole scripted turn through the REAL engine, so if a card,
// the board or a rule changes and the lesson stops working, these fail and say why.
//
// If "the seed still makes a clean lesson" fails after a content change, find a new seed:
//     TUTORIAL_SCAN=1 npx vitest run test/tutorial.test.ts
// prints the first seeds that qualify. Put one in TUTORIAL_SEED (core/tutorial.ts), then set
// TUTORIAL_TARGET to the tile the "move" step should walk to (the test tells you which tile).
import { describe, expect, it } from "vitest";
import type { Action, NewGameOptions } from "@tipping-point/engine";
import { cardById, content, engine } from "../src/core/content";
import { LocalSession } from "../src/core/session";
import {
  blockReason, coachProgress, factsOf, settle, FINISH_INDEX,
  TUTORIAL_OPTIONS, TUTORIAL_SEAT, TUTORIAL_SEED, TUTORIAL_STEPS, TUTORIAL_TARGET,
} from "../src/core/tutorial";

const id = (k: string) => TUTORIAL_STEPS.findIndex((s) => s.id === k);
const MOVE = id("move"), TOOL = id("tool"), RESTORED = id("restored"), DRAW = id("draw"), RAVAGE = id("ravage");

const WALK: Action = { type: "Move", path: [29, 28, TUTORIAL_TARGET] };
const RESTORE: Action = { type: "UseTool", handIndex: 0, kind: "restore" };

/** Does this seed give a clean first turn? Returns the tile to walk to, or a reason it does not. */
function judge(seed: number): { ok: true; target: number } | { ok: false; why: string } {
  const opts: NewGameOptions = { ...TUTORIAL_OPTIONS, seed };
  const sess = new LocalSession(opts);
  const s0 = sess.getSnapshot().state;
  const me = s0.players[TUTORIAL_SEAT]!;
  const held = me.hand[0] ? cardById(me.hand[0].cardId) : undefined;
  if (!held || held.type !== "tool") return { ok: false, why: "no Tool in hand" };
  const targets = engine.moveTargets(s0, me.id);
  const target = s0.tiles.find((t) => t.status === "vulnerable" && t.biome === held.biome && targets.get(t.id)?.length === 3);
  if (!target) return { ok: false, why: "no matching Vulnerable tile exactly 3 steps away" };
  const path = targets.get(target.id)!;
  if (!sess.dispatch({ type: "Move", path }, me.id).ok) return { ok: false, why: "move rejected" };
  if (!sess.dispatch({ type: "UseTool", handIndex: 0, kind: "restore" }, me.id).ok) return { ok: false, why: "restore rejected" };
  const r = sess.dispatch({ type: "Draw" }, me.id);
  if (!r.ok) return { ok: false, why: "draw rejected" };
  const s1 = sess.getSnapshot().state;
  if (s1.phase !== "turn" || s1.pending || s1.activeSeat === TUTORIAL_SEAT) return { ok: false, why: "turn did not pass cleanly to the next Steward" };
  const f = factsOf(s1, sess.getSnapshot().events);
  if (!f.ravage) return { ok: false, why: "first card is not a Ravage" };
  if (f.ravage.lost < 1 || f.ravage.weakened < 1) return { ok: false, why: "Ravage does not both weaken and destroy a tile" };
  return { ok: true, target: target.id };
}

/** Plays the scripted turn, returning the session and the states after each stage. */
function play() {
  const sess = new LocalSession(TUTORIAL_OPTIONS);
  const me = TUTORIAL_OPTIONS.players[TUTORIAL_SEAT]!.id;
  const at: Record<string, ReturnType<LocalSession["getSnapshot"]>> = { start: sess.getSnapshot() };
  expect(sess.dispatch(WALK, me).ok).toBe(true); at.moved = sess.getSnapshot();
  expect(sess.dispatch(RESTORE, me).ok).toBe(true); at.restored = sess.getSnapshot();
  expect(sess.dispatch({ type: "Draw" }, me).ok).toBe(true); at.drawn = sess.getSnapshot();
  return { sess, at };
}

describe("tutorial scenario", () => {
  it("the seed still makes a clean lesson", () => {
    const j = judge(TUTORIAL_SEED);
    if (!j.ok) throw new Error(`Seed ${TUTORIAL_SEED} no longer works: ${j.why}. Re-run the scan (see the top of this file).`);
    expect(j.target).toBe(TUTORIAL_TARGET);
  });

  it("the walk path in these tests is the real shortest path", () => {
    const s = new LocalSession(TUTORIAL_OPTIONS).getSnapshot().state;
    expect(engine.moveTargets(s, "p0").get(TUTORIAL_TARGET)).toEqual(WALK.type === "Move" ? WALK.path : []);
  });

  it("two Stewards, Mia first, nothing random about the start", () => {
    const a = new LocalSession(TUTORIAL_OPTIONS).getSnapshot().state;
    const b = new LocalSession(TUTORIAL_OPTIONS).getSnapshot().state;
    expect(b).toEqual(a);
    expect(a.players).toHaveLength(2);
    expect(a.activeSeat).toBe(TUTORIAL_SEAT);
  });

  if ((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.TUTORIAL_SCAN) {
    it("scan", () => {
      const found: string[] = [];
      for (let seed = 1; seed < 5000 && found.length < 8; seed++) { const j = judge(seed); if (j.ok) found.push(`seed ${seed}, target tile ${j.target}`); }
      console.log("Qualifying seeds:\n" + found.join("\n"));
    });
  }
});

describe("tutorial script", () => {
  it("every step has a title and copy, on every state of the guided turn", () => {
    const { at } = play();
    for (const snap of Object.values(at)) {
      const f = factsOf(snap.state, snap.events);
      for (const st of TUTORIAL_STEPS) {
        expect(st.title.length).toBeGreaterThan(0);
        const body = st.body(f);
        expect(body.length).toBeGreaterThan(0);
        for (const p of body) { expect(p.length).toBeGreaterThan(0); expect(p).not.toMatch(/undefined|NaN|\[object/); }
      }
    }
  });

  it("step ids are unique and the last step is the finish page", () => {
    expect(new Set(TUTORIAL_STEPS.map((s) => s.id)).size).toBe(TUTORIAL_STEPS.length);
    expect(TUTORIAL_STEPS[FINISH_INDEX]!.id).toBe("finish");
  });

  it("primer pages are labelled 1 of N to N of N in order", () => {
    const primers = TUTORIAL_STEPS.filter((s) => s.id.startsWith("primer-"));
    primers.forEach((s, i) => expect(s.eyebrow).toBe(`Good to know ${i + 1} of ${primers.length}`));
  });

  it("every Event named in the copy exists, and its numbers match the card text", () => {
    const text = TUTORIAL_STEPS.map((s) => s.body(factsOf(new LocalSession(TUTORIAL_OPTIONS).getSnapshot().state, []))).flat().join(" ");
    const ev = (key: string) => content.cards.find((c) => c.type === "event" && c.key === key)!;
    expect(text).toContain(ev("citizen").name); expect(ev("citizen").effect).toContain("top 5");
    expect(text).toContain(ev("volunteer").name); expect(ev("volunteer").effect).toContain("2 tiles");
    expect(text).toContain(ev("lobby").name); expect(ev("lobby").effect).toContain("next 2 Ravage");
    expect(text).toContain(ev("heat").name); expect(ev("heat").effect).toContain("next two cards");
  });

  it("the first turn of the scripted game really needs every step in order", () => {
    const { at } = play();
    // Start: waiting on the move.
    expect(settle(TUTORIAL_STEPS, 0, at.start!.state)).toBe(0);
    expect(settle(TUTORIAL_STEPS, MOVE, at.start!.state)).toBe(MOVE);
    // After the walk the tool step is next, after the restore the player reads "Restored".
    expect(settle(TUTORIAL_STEPS, MOVE, at.moved!.state)).toBe(TOOL);
    expect(settle(TUTORIAL_STEPS, TOOL, at.restored!.state)).toBe(RESTORED);
    // After the draw the info step "restored" is NOT skipped by state alone... the draw step is.
    expect(settle(TUTORIAL_STEPS, DRAW, at.drawn!.state)).toBe(RAVAGE);
  });
});

describe("gating the player's actions", () => {
  it("only the walk to the gold tile passes on the move step", () => {
    const s = new LocalSession(TUTORIAL_OPTIONS).getSnapshot().state;
    const step = TUTORIAL_STEPS[MOVE]!;
    expect(blockReason(step, WALK, s)).toBeNull();
    expect(blockReason(step, { type: "Move", path: [29] }, s)).not.toBeNull();
    expect(blockReason(step, { type: "Draw" }, s)).not.toBeNull();
    expect(blockReason(step, RESTORE, s)).not.toBeNull();
  });

  it("only Restore with the Tool passes on the tool step", () => {
    const s = play().at.moved!.state;
    const step = TUTORIAL_STEPS[TOOL]!;
    expect(blockReason(step, RESTORE, s)).toBeNull();
    expect(blockReason(step, { type: "UseTool", handIndex: 0, kind: "fortify" }, s)).not.toBeNull();
    expect(blockReason(step, { type: "Stabilise" }, s)).not.toBeNull();
    expect(blockReason(step, { type: "Draw" }, s)).not.toBeNull();
  });

  it("only Draw passes on the draw step", () => {
    const s = play().at.restored!.state;
    const step = TUTORIAL_STEPS[DRAW]!;
    expect(blockReason(step, { type: "Draw" }, s)).toBeNull();
    expect(blockReason(step, { type: "Move", path: [] }, s)).not.toBeNull();
  });

  it("info steps block every action and say to read the tip", () => {
    const s = new LocalSession(TUTORIAL_OPTIONS).getSnapshot().state;
    for (const st of TUTORIAL_STEPS.filter((x) => x.kind === "info")) {
      expect(blockReason(st, { type: "Draw" }, s)).toMatch(/Next/);
      expect(blockReason(st, WALK, s)).not.toBeNull();
    }
  });

  it("everything the gate lets through is accepted by the real engine", () => {
    // If the gate allowed an action the engine then rejects, the player would be stuck on the step.
    const { sess } = play();
    expect(sess.getSnapshot().state.activeSeat).not.toBe(TUTORIAL_SEAT);
  });
});

describe("state-driven stepping (undo, skipping ahead)", () => {
  it("Undo of the restore returns to the tool step, Undo of the walk returns to the move step", () => {
    const sess = new LocalSession(TUTORIAL_OPTIONS);
    const me = "p0";
    sess.dispatch(WALK, me); sess.dispatch(RESTORE, me);
    let idx = settle(TUTORIAL_STEPS, RESTORED, sess.getSnapshot().state);
    expect(idx).toBe(RESTORED);
    expect(sess.undo()).toBe(true);
    idx = settle(TUTORIAL_STEPS, idx, sess.getSnapshot().state);
    expect(idx).toBe(TOOL);
    expect(sess.undo()).toBe(true);
    idx = settle(TUTORIAL_STEPS, idx, sess.getSnapshot().state);
    expect(idx).toBe(MOVE);
  });

  it("the Next button moves one step and never past an unfinished action step", () => {
    const s = new LocalSession(TUTORIAL_OPTIONS).getSnapshot().state;
    let i = 0;
    for (let n = 0; n < 20; n++) i = settle(TUTORIAL_STEPS, i + 1, s);
    expect(i).toBe(MOVE);
  });

  it("an index outside the script is clamped", () => {
    const s = new LocalSession(TUTORIAL_OPTIONS).getSnapshot().state;
    expect(settle(TUTORIAL_STEPS, -4, s)).toBe(0);
    expect(settle(TUTORIAL_STEPS, 999, play().at.drawn!.state)).toBe(FINISH_INDEX);
  });

  it("walking the whole script reaches the finish page", () => {
    const { at } = play();
    let i = settle(TUTORIAL_STEPS, 0, at.start!.state);
    let s = at.start!.state;
    const advance = (to: keyof typeof at) => { s = at[to]!.state; };
    for (let n = 0; n < 200 && i < FINISH_INDEX; n++) {
      const st = TUTORIAL_STEPS[i]!;
      if (st.kind === "action") advance(i === MOVE ? "moved" : i === TOOL ? "restored" : "drawn");
      i = settle(TUTORIAL_STEPS, i + 1, s);
      if (st.kind === "action") i = settle(TUTORIAL_STEPS, i, s);
    }
    expect(i).toBe(FINISH_INDEX);
  });
});

describe("copy built from the live game", () => {
  it("names the Tool, biome, roles and Pressure from the state", () => {
    const f = factsOf(new LocalSession(TUTORIAL_OPTIONS).getSnapshot().state, []);
    expect(f.you).toBe("Mia");
    expect(f.biome).toBe("River");
    expect(f.toolName.length).toBeGreaterThan(0);
    expect(f.roles.length).toBeGreaterThan(0);
    expect(f.pressure).toBeGreaterThan(0);
    expect(f.ravage).toBeNull();
  });

  it("describes what the Ravage did after the draw", () => {
    const { at } = play();
    const f = factsOf(at.drawn!.state, at.drawn!.events);
    expect(f.ravage).toBeTruthy();
    const text = TUTORIAL_STEPS[RAVAGE]!.body(f).join(" ");
    expect(text).toContain(f.ravage!.card);
    expect(text).toMatch(/Lost for good/);
    expect(text).toMatch(/Vulnerable/);
  });

  it("restoring really did what the Restored step claims", () => {
    const { at } = play();
    const before = at.moved!.state, after = at.restored!.state;
    expect(after.tiles[TUTORIAL_TARGET]!.status).toBe("healthy");
    expect(after.tiles[TUTORIAL_TARGET]!.owner).toBe("p0");
    expect(before.metreTicks - after.metreTicks).toBe(content.rules.metre.restore_ticks_down);
    expect(after.players[0]!.hand).toHaveLength(0);
  });

  it("progress counts coach steps only", () => {
    const coach = TUTORIAL_STEPS.filter((s) => s.presentation === "coach");
    expect(coachProgress(TUTORIAL_STEPS, 0)).toBeNull();
    expect(coachProgress(TUTORIAL_STEPS, id("metre"))).toEqual({ n: 1, total: coach.length });
    expect(coachProgress(TUTORIAL_STEPS, RAVAGE)).toEqual({ n: coach.length, total: coach.length });
    expect(coachProgress(TUTORIAL_STEPS, FINISH_INDEX)).toBeNull();
  });
});
