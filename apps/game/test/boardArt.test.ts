import { describe, expect, it } from "vitest";
import { fanLayout, handledOffset, litEdgesPath, offsetPoints, paintOrder, parsePoints, pileLayers, scalePoints, scuffMarks, shadedEdgesPath, trayDiscs } from "../src/core/boardArt";

// A pointy-top hex of size 1 at the origin, the same shape the engine's hexCorners makes.
const hex = Array.from({ length: 6 }, (_, i) => { const a = (Math.PI / 180) * (60 * i - 30); return `${Math.cos(a).toFixed(3)},${Math.sin(a).toFixed(3)}`; }).join(" ");

describe("tile geometry", () => {
  it("offsets every corner by the same amount", () => {
    const moved = parsePoints(offsetPoints(hex, 0.1, 0.2));
    parsePoints(hex).forEach(([x, y], i) => { expect(moved[i]![0]).toBeCloseTo(x + 0.1, 3); expect(moved[i]![1]).toBeCloseTo(y + 0.2, 3); });
  });

  it("scales an outline about its centre", () => {
    const small = parsePoints(scalePoints(hex, 0, 0, 0.5));
    parsePoints(hex).forEach(([x, y], i) => { expect(small[i]![0]).toBeCloseTo(x / 2, 3); expect(small[i]![1]).toBeCloseTo(y / 2, 3); });
  });

  it("lit and shaded edges never overlap, and the lit ones face up and left", () => {
    const lit = litEdgesPath(hex, 0, 0), shade = shadedEdgesPath(hex, 0, 0);
    expect(lit.length).toBeGreaterThan(0);
    expect(shade.length).toBeGreaterThan(0);
    const litSegs = lit.split("M").filter(Boolean), shadeSegs = shade.split("M").filter(Boolean);
    for (const s of litSegs) expect(shadeSegs).not.toContain(s);
    const ys = litSegs.flatMap((s) => s.match(/-?\d+\.\d+,-?\d+\.\d+/g)!.map((p) => Number(p.split(",")[1])));
    expect(Math.min(...ys)).toBeLessThan(-0.9); // reaches the top corner
  });

  it("scuff marks are repeatable and stay on the tile", () => {
    const a = scuffMarks(12, 3, 4), b = scuffMarks(12, 3, 4), c = scuffMarks(13, 3, 4);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    for (const m of a) { expect(Math.hypot(m.x1 - 3, m.y1 - 4)).toBeLessThan(0.85); expect(Math.hypot(m.x2 - 3, m.y2 - 4)).toBeLessThan(1.05); }
  });

  it("a placed counter is offset a little, the same way every time", () => {
    const o = handledOffset(9, 2);
    expect(o).toEqual(handledOffset(9, 2));
    expect(Math.abs(o.dx)).toBeLessThanOrEqual(0.045);
    expect(Math.abs(o.dy)).toBeLessThanOrEqual(0.045);
  });

  it("paints upper rows first", () => {
    const o = paintOrder([{ cx: 0, cy: 3 }, { cx: 1, cy: 0 }, { cx: 0, cy: 0 }]);
    expect(o.map((t) => `${t.cx},${t.cy}`)).toEqual(["0,0", "1,0", "0,3"]);
  });
});

describe("hand fan", () => {
  it("has one slot per card and a flat middle card", () => {
    const f = fanLayout(3, null, 92);
    expect(f).toHaveLength(3);
    expect(f[1]!.rotate).toBe(0);
    expect(f[0]!.rotate).toBeLessThan(0);
    expect(f[2]!.rotate).toBeGreaterThan(0);
  });
  it("lifts and straightens the selected card and puts it on top", () => {
    const f = fanLayout(3, 0, 92);
    expect(f[0]!.rotate).toBe(0);
    expect(f[0]!.lift).toBeGreaterThan(0);
    expect(f[0]!.scale).toBeGreaterThan(1);
    expect(Math.max(...f.map((s) => s.z))).toBe(f[0]!.z);
  });
  it("overlaps cards but keeps well over 44 px of each showing at the smallest card size", () => {
    const f = fanLayout(3, null, 84);
    expect(84 + f[1]!.dx).toBeGreaterThanOrEqual(44);
  });
  it("handles an empty hand and a single card", () => {
    expect(fanLayout(0, null, 92)).toEqual([]);
    expect(fanLayout(1, null, 92)[0]!.rotate).toBe(0);
  });
});

describe("piles and trays", () => {
  it("a pile gets thinner as it empties, and vanishes at zero", () => {
    expect(pileLayers(0)).toBe(0);
    expect(pileLayers(1)).toBe(1);
    expect(pileLayers(60)).toBeGreaterThan(pileLayers(5));
    expect(pileLayers(500)).toBe(4);
  });
  it("the tray shows what is left, never more than the total", () => {
    expect(trayDiscs(12, 12).filter(Boolean)).toHaveLength(12);
    expect(trayDiscs(12, 5).filter(Boolean)).toHaveLength(5);
    expect(trayDiscs(12, 99).filter(Boolean)).toHaveLength(12);
    expect(trayDiscs(12, -3).filter(Boolean)).toHaveLength(0);
  });
});

describe("title board", () => {
  it("is deterministic, covers every tile, and shows a board that is starting to tip", async () => {
    const { titleBoard } = await import("../src/core/titleBoard");
    const a = titleBoard(), b = titleBoard();
    expect(a).toEqual(b);
    expect(a).toHaveLength(61);
    expect(a.filter((t) => t.status === "removed").length).toBeGreaterThan(0);
    expect(a.filter((t) => t.status === "vulnerable").length).toBeGreaterThan(3);
    expect(a.find((t) => t.biome === "hub")!.status).toBe("healthy");
  });
});
