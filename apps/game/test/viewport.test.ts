import { describe, expect, it } from "vitest";
import { BOARD } from "../src/core/boardGeometry";
import { comfortZoom, tilePxAtFit, clampView, fitScale, initialView, panBy, viewBoxFor, MAX_ZOOM } from "../src/core/viewport";
import { layoutFor } from "../src/core/layout";
import { DEFAULT_SETTINGS, motionMs, sanitizeSettings } from "../src/core/settings";

describe("board geometry", () => {
  it("has 61 tiles with six-point polygons", () => {
    expect(BOARD.tiles.length).toBe(61);
    expect(BOARD.tiles.every((t) => t.points.split(" ").length === 6)).toBe(true);
  });
});

describe("viewport", () => {
  const b = BOARD.bounds;
  it("zoom 1 shows the whole board", () => {
    const vb = viewBoxFor(b, initialView(b), 400, 600);
    expect(vb.w).toBeGreaterThanOrEqual(b.width - 1e-6);
    expect(vb.h).toBeGreaterThanOrEqual(b.height - 1e-6);
  });
  it("keeps the same aspect as the container", () => {
    const vb = viewBoxFor(b, { ...initialView(b), zoom: 2 }, 500, 300);
    expect(vb.w / vb.h).toBeCloseTo(500 / 300, 6);
  });
  it("clamps zoom and centre", () => {
    const v = clampView(b, { cx: 9999, cy: -9999, zoom: 99 });
    expect(v.zoom).toBe(MAX_ZOOM);
    expect(v.cx).toBeLessThanOrEqual(b.minX + b.width);
    expect(v.cy).toBeGreaterThanOrEqual(b.minY);
  });
  it("panning right moves the view centre left", () => {
    const v0 = initialView(b);
    expect(panBy(b, v0, 50, 0, 400, 400).cx).toBeLessThan(v0.cx);
  });
  it("fit scale is positive for empty containers", () => { expect(fitScale(b, 0, 0)).toBe(1); });
});

describe("layout and settings", () => {
  it("picks layouts by width", () => {
    expect(layoutFor(390, 844).mode).toBe("phone");
    expect(layoutFor(820, 1180).mode).toBe("tablet");
    expect(layoutFor(1440, 900).mode).toBe("desktop");
    expect(layoutFor(844, 390).dense).toBe(true);
  });
  it("sanitizes stored settings", () => {
    expect(sanitizeSettings({ textScale: 50, reducedMotion: "yes" })).toEqual({ ...DEFAULT_SETTINGS, textScale: 2 });
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
  it("reduced motion zeroes durations", () => {
    expect(motionMs({ ...DEFAULT_SETTINGS, reducedMotion: true }, 300)).toBe(0);
    expect(motionMs({ ...DEFAULT_SETTINGS, fastAnimations: true }, 300)).toBe(150);
  });
});

describe("comfortZoom", () => {
  const b = { minX: 0, minY: 0, width: 18, height: 16 };
  it("is 1 on a screen where tiles are already big enough", () => {
    expect(tilePxAtFit(b, 900, 700)).toBeGreaterThan(44);
    expect(comfortZoom(b, 900, 700, 44)).toBe(1);
  });
  it("zooms in on a phone so a tile reaches the minimum, and never past the maximum", () => {
    const z = comfortZoom(b, 300, 300, 44);
    expect(z).toBeGreaterThan(1);
    expect(tilePxAtFit(b, 300, 300) * z).toBeGreaterThanOrEqual(44 - 1e-9);
    expect(comfortZoom(b, 20, 20, 44)).toBe(MAX_ZOOM);
  });
});
