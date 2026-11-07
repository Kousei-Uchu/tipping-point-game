// Tests for the rulebook. They check the book against the live content, so if a card, a number or a rule name changes
// and the book is not updated, these fail and say what is out of date.
import { describe, expect, it } from "vitest";
import { content } from "../src/core/content";
import { CHAPTERS, SPECIMEN_KINDS, chapterIndex, setRulebookTarget, takeRulebookTarget, type Block } from "../src/core/rulebook";

const textOf = (b: Block): string => {
  switch (b.t) {
    case "p": case "h": case "tip": return b.text;
    case "list": case "steps": return b.items.join(" ");
    case "table": return [...b.head, ...b.rows.flat()].join(" ");
    case "specimens": return b.items.map((i) => `${i.look} ${i.means}`).join(" ");
  }
};
const all = CHAPTERS.flatMap((c) => c.blocks.map(textOf)).join("\n");

describe("rulebook", () => {
  it("has unique chapter ids and every chapter has content", () => {
    expect(new Set(CHAPTERS.map((c) => c.id)).size).toBe(CHAPTERS.length);
    for (const c of CHAPTERS) {
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.summary.length).toBeGreaterThan(0);
      expect(c.blocks.length).toBeGreaterThan(0);
    }
  });

  it("covers the basics a new player looks for", () => {
    for (const id of ["goal", "screen", "turn", "tools", "draw", "ravage", "metre", "roles", "end", "faq", "words"]) {
      expect(CHAPTERS.some((c) => c.id === id)).toBe(true);
    }
  });

  it("names every biome, Tool, Programme, Role and Event card from the content", () => {
    for (const b of Object.values(content.biomes)) { expect(all).toContain(b.name); expect(all).toContain(b.tool); expect(all).toContain(b.programme); }
    for (const r of content.roles) { expect(all).toContain(r.name); expect(all).toContain(r.ability); }
    for (const c of content.cards) if (c.type === "event") { expect(all).toContain(c.name); expect(all).toContain(c.effect); }
  });

  it("uses the live numbers", () => {
    const { metre, limits, turn, tiles, legacy } = content.rules;
    expect(all).toContain(`${metre.bands} bands of ${metre.ticks_per_band} ticks`);
    expect(all).toContain(`${turn.move} tiles`);
    expect(all).toContain(`holds ${limits.hand} Tools`);
    expect(all).toContain(`all ${tiles.per_biome} of its tiles`);
    expect(all).toContain(`+${legacy.guardian_bonus} for each biome`);
    expect(all).toContain(`down ${metre.restore_ticks_down} ticks`);
  });

  it("difficulty table matches rules.json", () => {
    const setup = CHAPTERS.find((c) => c.id === "setup")!;
    const t = setup.blocks.find((b) => b.t === "table" && b.head[1] === "Easy")!;
    if (t.t !== "table") throw new Error("no table");
    const { difficulty, metre } = content.rules;
    const row = (name: string) => t.rows.find((r) => r[0] === name)!.slice(1);
    expect(row("Opening Strike cards")).toEqual((["easy", "normal", "hard"] as const).map((d) => String(difficulty[d].opening_strike)));
    expect(row("Turns missed if evacuated")).toEqual((["easy", "normal", "hard"] as const).map((d) => String(difficulty[d].evacuation_rounds)));
    expect(row("Starting Pressure")).toEqual((["easy", "normal", "hard"] as const).map((d) => String(Math.ceil(metre.start_ticks[d] / metre.ticks_per_band))));
  });

  it("follows the copy rules: no em dashes, no emoji, tables are rectangular", () => {
    expect(all).not.toMatch(/—/);
    expect(all).not.toMatch(/\p{Extended_Pictographic}/u);
    for (const c of CHAPTERS) for (const b of c.blocks) if (b.t === "table") for (const r of b.rows) expect(r.length).toBe(b.head.length);
  });

  it("can open at a chapter once, and an unknown chapter falls back to the first", () => {
    setRulebookTarget("tools");
    expect(takeRulebookTarget()).toBe("tools");
    expect(takeRulebookTarget()).toBeNull();
    expect(chapterIndex("tools")).toBeGreaterThan(0);
    expect(chapterIndex("nope")).toBe(0);
  });
});

describe("rulebook specimens", () => {
  const specimens = CHAPTERS.flatMap((c) => c.blocks).flatMap((b) => (b.t === "specimens" ? b.items : []));

  it("draws every piece kind exactly once, with words for what it looks like and what it means", () => {
    expect(specimens.map((i) => i.kind).sort()).toEqual([...SPECIMEN_KINDS].sort());
    for (const i of specimens) { expect(i.look.length).toBeGreaterThan(5); expect(i.means.length).toBeGreaterThan(10); }
  });

  it("describes the pieces as they look now, not as the old flat prototype", () => {
    for (const old of ["White square", "Empty dashed outline", "Paler, dashed outline", "small red flag", "Blue ring"]) expect(all).not.toContain(old);
  });
});
