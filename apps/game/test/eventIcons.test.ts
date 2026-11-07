import { describe, expect, it } from "vitest";
import { content } from "../src/core/content";
import { EVENT_ICON_IDS } from "../src/core/cardArt";

describe("event icons", () => {
  it("every Event card has its own mark", () => {
    const events = content.cards.filter((c) => c.type === "event").map((c) => c.id);
    expect(events.length).toBe(6);
    for (const id of events) expect(EVENT_ICON_IDS).toContain(id);
  });
});
