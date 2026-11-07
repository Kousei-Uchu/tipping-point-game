import { describe, expect, it } from "vitest";
import { content } from "../src/core/content";
import { LID_H, LID_W, ROLE_EMBLEMS, ROLE_IDS, SCENE_H, SCENE_IDS, SCENE_W, biomeScene, lidScene, sceneForCard, toSvg, type Shape } from "../src/core/illustrations";

const ravages = content.cards.filter((c) => c.type === "ravage");
const biomes = Object.keys(content.biomes);

function inside(shapes: Shape[], w: number, h: number): boolean {
  return shapes.every((s) => (s.t === "rect" ? s.x >= -1 && s.y >= -1 && s.x + s.w <= w + 1 && s.y + s.h <= h + 1 : s.t === "circle" ? s.r > 0 : s.d.length > 0));
}

describe("Phase 6 spot illustrations", () => {
  it("every biome has a header scene", () => {
    for (const b of biomes) expect(biomeScene(b), b).not.toBeNull();
    expect([...SCENE_IDS.biomes].sort()).toEqual([...biomes].sort());
  });
  it("every Ravage card has its own scene, and no scene is left over for a card that does not exist", () => {
    expect(ravages.length).toBe(24);
    for (const c of ravages) expect(SCENE_IDS.ravages, c.id).toContain(c.id);
    expect([...SCENE_IDS.ravages].sort()).toEqual(ravages.map((c) => c.id).sort());
  });
  it("every Event card has its own scene, and a Tool shares its biome's header", () => {
    const events = content.cards.filter((c) => c.type === "event");
    expect(events.length).toBe(6);
    for (const e of events) expect(sceneForCard(e), e.id).not.toBeNull();
    expect([...SCENE_IDS.events].sort()).toEqual(events.map((e) => e.id).sort());
    const tool = content.cards.find((c) => c.type === "tool")!;
    expect(sceneForCard(tool)).not.toBeNull();
  });
  it("scenes are non-empty, stay inside the box and draw something different from every other scene", () => {
    const seen = new Set<string>();
    for (const c of ravages) {
      const sh = sceneForCard(c)!;
      expect(sh.length, c.id).toBeGreaterThan(5);
      expect(inside(sh, SCENE_W, SCENE_H), c.id).toBe(true);
      const svg = toSvg(sh, SCENE_W, SCENE_H);
      expect(seen.has(svg), c.id).toBe(false);
      seen.add(svg);
    }
    for (const e of content.cards.filter((c) => c.type === "event")) {
      const sh = sceneForCard(e)!;
      expect(inside(sh, SCENE_W, SCENE_H), e.id).toBe(true);
      const svg = toSvg(sh, SCENE_W, SCENE_H);
      expect(seen.has(svg), e.id).toBe(false);
      seen.add(svg);
    }
    for (const b of biomes) { const svg = toSvg(biomeScene(b)!, SCENE_W, SCENE_H); expect(seen.has(svg), b).toBe(false); seen.add(svg); }
  });
  it("every role has an emblem, and the role ids match the content", () => {
    expect([...ROLE_IDS].sort()).toEqual(content.roles.map((r) => r.key).sort());
    for (const r of ROLE_IDS) expect(ROLE_EMBLEMS[r]?.length ?? 0).toBeGreaterThan(0);
  });
  it("the lid panorama fills its box and renders as well-formed svg", () => {
    const sh = lidScene();
    expect(inside(sh, LID_W, LID_H)).toBe(true);
    const svg = toSvg(sh, LID_W, LID_H);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).not.toContain("NaN");
  });
  it("drawing is deterministic, so a card looks the same every time it is shown", () => {
    const c = ravages[0]!;
    expect(toSvg(sceneForCard(c)!, SCENE_W, SCENE_H)).toBe(toSvg(sceneForCard(c)!, SCENE_W, SCENE_H));
  });
});
