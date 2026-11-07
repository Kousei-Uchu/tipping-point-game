import { describe, expect, it } from "vitest";
import { CARD_RATIO, cardMetrics, cardSizeFor, cardSpeech, cardWidthFor, fitNamePx, pipStates, revealPanelHeight, ribbonFor } from "../src/core/cardArt";
import { content } from "../src/core/content";
import { contrast } from "../src/theme/colour";
import { materials } from "../src/theme/materials";
import { colors } from "../src/theme/tokens";

describe("one card at three sizes", () => {
  it("picks the size from the width, and `full` asks for the sheet", () => {
    expect(cardSizeFor(92)).toBe("hand");
    expect(cardSizeFor(112)).toBe("hand");
    expect(cardSizeFor(150, true)).toBe("sheet");
    expect(cardSizeFor(240)).toBe("reveal");
    expect(cardSizeFor(240, true)).toBe("reveal");
  });
  it("hand size shows only the name, icon and pips; the sheet and reveal add the stamp, rules and the fact", () => {
    const h = cardMetrics("hand", 92);
    expect([h.stampTag, h.rulesText, h.factNote]).toEqual([false, false, false]);
    for (const s of ["sheet", "reveal"] as const) { const m = cardMetrics(s, s === "sheet" ? 150 : 240); expect([m.stampTag, m.rulesText, m.factNote]).toEqual([true, true, true]); }
  });
  it("the picture window leaves room for a name and never swallows the card", () => {
    for (const [s, w] of [["hand", 84], ["hand", 112], ["sheet", 150], ["reveal", 200], ["reveal", 260]] as const) {
      const m = cardMetrics(s, w);
      expect(m.art).toBeGreaterThan(w * 0.3);
      expect(m.art).toBeLessThan(w * CARD_RATIO * 0.55);
    }
  });
  it("print on a hand card is never smaller than 10 px, and big print never overflows a reveal card", () => {
    expect(cardMetrics("hand", 84).name).toBeGreaterThanOrEqual(12);
    expect(cardMetrics("reveal", 200).rules).toBeGreaterThanOrEqual(11);
    expect(cardMetrics("reveal", 200).maxScale).toBeLessThan(cardMetrics("sheet", 150).maxScale);
  });
  it("hand cards grow with the text size setting, up to 1.5 times", () => {
    expect(cardWidthFor(92, 1)).toBe(92);
    expect(cardWidthFor(92, 0.9)).toBe(92);
    expect(cardWidthFor(92, 1.25)).toBe(115);
    expect(cardWidthFor(92, 2)).toBe(138);
  });
});

describe("card names fit on the card", () => {
  it("no word is ever broken: the longest word fits at the chosen size, or the size is the floor", () => {
    for (const c of content.cards) {
      const inner = 92 - 2 * 6 - 4; // the narrowest hand card
      const px = fitNamePx(c.name, inner, 15);
      const longest = Math.max(...c.name.split(/\s+/).map((w) => w.length));
      expect(px).toBeGreaterThanOrEqual(10);
      expect(px).toBeLessThanOrEqual(15);
      if (px > 10) expect(longest * 0.62 * px).toBeLessThanOrEqual(inner + 0.5);
    }
  });
  it("short names get the full size, long ones shrink", () => {
    expect(fitNamePx("Thaw", 78, 15)).toBe(15);
    expect(fitNamePx("Reforestation Programme", 78, 15)).toBeLessThan(11);
  });
});

describe("pips", () => {
  it("a Programme Tool has one pip per use, open while a use is left and filled once spent", () => {
    expect(pipStates(2, 2)).toEqual(["left", "left"]);
    expect(pipStates(2, 1)).toEqual(["spent", "left"]);
    expect(pipStates(2, 0)).toEqual(["spent", "spent"]);
  });
  it("is safe with odd input", () => { expect(pipStates(2, 5)).toEqual(["left", "left"]); expect(pipStates(0, 0)).toEqual([]); expect(pipStates(2, -1)).toEqual(["spent", "spent"]); });
  it("the rules say Programme Tools have two uses", () => { for (const c of content.cards) if (c.type === "tool" && c.programme) expect(c.uses).toBe(content.rules.deck.programme_uses); });
});

describe("the Surge ribbon", () => {
  it("sits on the top right corner and stays inside the card", () => {
    for (const [s, w] of [["hand", 92], ["sheet", 150], ["reveal", 240]] as const) {
      const r = ribbonFor(w, s);
      for (const p of r.points.split(" ")) { const [x, y] = p.split(",").map(Number); expect(x).toBeLessThanOrEqual(w + 0.01); expect(x).toBeGreaterThanOrEqual(w * 0.4); expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(w * 0.5); }
      expect(r.textAt[0]).toBeGreaterThan(w * 0.6);
    }
  });
  it("carries the word at sheet and reveal size, and is a plain band at hand size", () => {
    expect(ribbonFor(92, "hand").showText).toBe(false);
    expect(ribbonFor(150, "sheet").showText).toBe(true);
    expect(ribbonFor(240, "reveal").showText).toBe(true);
  });
  it("white print on the ribbon is readable", () => { expect(contrast("#FFFFFF", colors.dangerText)).toBeGreaterThanOrEqual(4.5); });
  it("exactly the Surge cards in the content carry one: the rules say how many there are", () => {
    const n = content.cards.filter((c) => c.type === "ravage" && c.surge).length;
    expect(n).toBe(content.rules.difficulty.normal.surge_cards);
  });
});

describe("what a screen reader hears", () => {
  it("name, kind, then Surge and uses", () => {
    expect(cardSpeech({ type: "ravage", name: "Logging Boom", surge: true }, { kind: "Forest Ravage" })).toBe("Logging Boom. Forest Ravage. Surge card.");
    expect(cardSpeech({ type: "tool", name: "Kit" }, { kind: "Forest Tool", usesText: "Single use" })).toBe("Kit. Forest Tool. Single use.");
  });
});

describe("card print stays readable on card stock", () => {
  it("ink, muted and danger text on the stock the cards are printed on", () => {
    expect(contrast(colors.ink, materials.stock)).toBeGreaterThanOrEqual(7);
    expect(contrast(colors.muted, materials.stock)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.dangerText, materials.stock)).toBeGreaterThanOrEqual(4.5);
  });
  it("the biome symbol (ink) stands out from every biome colour it is printed over", () => {
    for (const b of Object.values(content.biomes)) expect(contrast(colors.ink, b.healthy_hex)).toBeGreaterThanOrEqual(3);
  });
});

describe("the reveal panel's height", () => {
  it("a Ravage panel is taller than a Tool or Event panel on the same screen", () => {
    for (const h of [600, 844, 1000]) {
      expect(revealPanelHeight("ravage", h)).toBeGreaterThan(revealPanelHeight("tool", h));
      expect(revealPanelHeight("event", h)).toBe(revealPanelHeight("tool", h));
    }
  });
  it("never covers more than half a screen, and never gets too small to hold the keys", () => {
    for (const k of ["ravage", "tool", "event"] as const) for (const h of [300, 480, 844, 2000]) {
      const p = revealPanelHeight(k, h);
      expect(p).toBeGreaterThanOrEqual(236);
      expect(p).toBeLessThanOrEqual(360);
    }
  });
});
