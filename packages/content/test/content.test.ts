import { describe, expect, it } from "vitest";
import { content, validateContent } from "../src";

describe("content", () => {
  it("passes validation", () => expect(validateContent(content)).toEqual([]));
  it("has the Hub at the centre", () => {
    const hub = content.board.tiles[content.board.hubId]!;
    expect([hub.q, hub.r]).toEqual([0, 0]);
    expect(hub.neighbours).toHaveLength(6);
  });
  it("every rules number the engine needs is present", () => {
    expect(content.rules.metre.start_ticks).toEqual({ easy: 8, normal: 16, hard: 24 });
    expect(content.rules.limits.hand).toBe(3);
  });
});
