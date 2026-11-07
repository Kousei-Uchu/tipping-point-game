import { describe, expect, it } from "vitest";
import { contrast, darken, hexToRgb, lighten, mix } from "../src/theme/colour";
import { materials } from "../src/theme/materials";
import { content } from "../src/core/content";
import { colors } from "../src/theme/tokens";

describe("colour maths", () => {
  it("darkens and lightens towards black and white", () => {
    expect(darken("#FFFFFF", 0.5)).toBe("#808080");
    expect(darken("#336699", 0)).toBe("#336699");
    expect(darken("#336699", 1)).toBe("#000000");
    expect(lighten("#000000", 1)).toBe("#FFFFFF");
    expect(mix("#000000", "#FFFFFF", 0.5)).toBe("#808080");
    expect(hexToRgb("#0A141E")).toEqual([10, 20, 30]);
    expect(hexToRgb("#FFF")).toEqual([255, 255, 255]);
  });

  it("contrast is symmetric and spans 1 to 21", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrast("#777777", "#777777")).toBeCloseTo(1, 5);
    expect(contrast("#1F2A30", materials.stock)).toBeCloseTo(contrast(materials.stock, "#1F2A30"), 8);
  });
});

describe("text stays readable on the new surfaces", () => {
  const body = 4.5;
  const pairs: [string, string, string, number][] = [
    ["ink on card stock", colors.ink, materials.stock, 7],
    ["ink on deep stock", colors.ink, materials.stockDeep, 7],
    ["muted on card stock", colors.muted, materials.stock, body],
    ["muted on deep stock", colors.muted, materials.stockDeep, body],
    ["accent on card stock", colors.accent, materials.stock, body],
    ["danger text on card stock", colors.dangerText, materials.stock, body],
    ["paper on ink (primary key)", colors.paper, colors.ink, 7],
    ["white on danger (danger key)", "#FFFFFF", colors.danger, body],
    ["ink on kraft (token chip)", colors.ink, materials.kraft, body],
    ["ink on good tag", colors.ink, "#DCEBDD", 7],
    ["ink on bad tag", colors.ink, "#F3D9D1", 7],
    ["ink on the Trophy plate (result banner)", colors.ink, colors.trophy, body],
    ["card stock on the dark Collapse plate (result banner)", materials.stock, darken(colors.danger, 0.55), 7],
    ["muted on the lobby's deep slot", colors.muted, materials.stockDeep, body],
  ];
  for (const [name, fg, bg, min] of pairs) {
    it(name, () => expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min));
  }

  it("no surface is pure white", () => {
    for (const c of [colors.surface, colors.surfaceAlt, materials.stock, materials.stockDeep]) expect(c.toUpperCase()).not.toBe("#FFFFFF");
  });
});

describe("the table stays calm so game colour stands out", () => {
  const graphic = 3; // WCAG non-text contrast
  for (const b of Object.values(content.biomes)) {
    it(`${b.name}: healthy and vulnerable faces stand out from the felt`, () => {
      expect(contrast(b.healthy_hex, materials.felt)).toBeGreaterThanOrEqual(graphic);
      expect(contrast(b.vulnerable_hex, materials.felt)).toBeGreaterThanOrEqual(graphic);
    });
  }
  it("a hole in the board reads against the kraft around it", () => {
    expect(contrast(materials.feltDeep, materials.kraft)).toBeGreaterThanOrEqual(graphic);
  });
  it("the kraft board stands out from the felt", () => {
    expect(contrast(materials.kraft, materials.felt)).toBeGreaterThanOrEqual(graphic);
  });
  it("Metre plate text reads on card stock", () => {
    expect(contrast(colors.dangerText, materials.stock)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.ink, materials.stock)).toBeGreaterThanOrEqual(4.5);
  });
});
