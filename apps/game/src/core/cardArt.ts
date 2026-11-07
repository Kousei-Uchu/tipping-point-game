// Pure geometry and sizing for the one card design, drawn at three sizes (Phase 4). No React, no platform code.
//
//   hand    name, icon, pips. Rules text appears when the card is selected or opened.
//   sheet   the full card: stamp, rules, and on a Ravage the real-world fact as a footnote.
//   reveal  the same card, big, for the draw and the Ravage reveal.

export type CardSize = "hand" | "sheet" | "reveal";

/** Height over width, the same for every card and the card back. */
export const CARD_RATIO = 1.38;

/** Narrow cards are hand size, mid-width ones are sheets, wide ones are the reveal. `full` asks for the sheet. */
export function cardSizeFor(width: number, full?: boolean): CardSize {
  if (width >= 200) return "reveal";
  return full ? "sheet" : "hand";
}

export interface CardMetrics {
  /** Padding between the card edge and the printed area. */
  pad: number;
  corner: number;
  /** Height of the framed picture window. */
  art: number;
  name: number;
  stamp: number;
  rules: number;
  fact: number;
  /** Diameter of a use pip. */
  pip: number;
  stampTag: boolean;
  rulesText: boolean;
  factNote: boolean;
  /** Cap on the text-size setting for the print on this card. A card is a fixed object; panels beside it carry the same words at any size.
   *  The hand is 1 because its cards get wider with the setting instead (see `cardWidthFor`). */
  maxScale: number;
}

export function cardMetrics(size: CardSize, width: number): CardMetrics {
  if (size === "hand") {
    return { pad: Math.max(4, Math.round(width * 0.06)), corner: 8, art: Math.round(width * 0.62), name: Math.min(15, Math.max(12, Math.round(width * 0.14))), stamp: 9, rules: 11, fact: 10, pip: Math.max(6, Math.round(width * 0.075)), stampTag: false, rulesText: false, factNote: false, maxScale: 1 };
  }
  if (size === "sheet") {
    return { pad: 8, corner: 10, art: Math.round(width * 0.42), name: Math.max(14, Math.round(width * 0.1)), stamp: 10, rules: 12, fact: 11, pip: 9, stampTag: true, rulesText: true, factNote: true, maxScale: 2 };
  }
  return { pad: Math.round(width * 0.045), corner: 12, art: Math.round(width * 0.42), name: Math.round(width * 0.095), stamp: Math.max(10, Math.round(width * 0.045)), rules: Math.max(11, Math.round(width * 0.056)), fact: Math.max(10, Math.round(width * 0.05)), pip: Math.round(width * 0.04), stampTag: true, rulesText: true, factNote: true, maxScale: 1.25 };
}

export interface Ribbon {
  /** Polygon points for the band across the top right corner. */
  points: string;
  /** Centre of the band, where the word goes, and the font size. */
  textAt: [number, number];
  fontSize: number;
  /** Too small to carry a word (hand size): the band alone says Surge. */
  showText: boolean;
}

/** A red band across the top right corner, 45 degrees. s1 and s2 are how far along the top and right edges its two sides start. */
export function ribbonFor(width: number, size: CardSize): Ribbon {
  const s1 = width * (size === "hand" ? 0.22 : size === "sheet" ? 0.26 : 0.27);
  const s2 = width * (size === "hand" ? 0.44 : size === "sheet" ? 0.47 : 0.48);
  const c = (s1 + s2) / 2;
  const pts: [number, number][] = [[width - s2, 0], [width - s1, 0], [width, s1], [width, s2]];
  return {
    points: pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" "),
    textAt: [width - c / 2, c / 2],
    fontSize: Math.max(8, Math.round(width * (size === "sheet" ? 0.065 : 0.058))),
    showText: size !== "hand",
  };
}

export type PipState = "left" | "spent";

/** One pip per use of a Programme Tool: open while a use is left, filled once spent. */
export function pipStates(uses: number, usesLeft: number): PipState[] {
  const total = Math.max(0, uses);
  const left = Math.max(0, Math.min(total, usesLeft));
  return Array.from({ length: total }, (_, i) => (i < total - left ? "spent" : "left"));
}

/** What a screen reader hears for a card, in the same order the card is read by eye. */
export function cardSpeech(card: { type: string; name: string; surge?: boolean }, parts: { kind: string; usesText?: string }): string {
  return [card.name, parts.kind, card.surge ? "Surge card" : "", parts.usesText ?? ""].filter(Boolean).join(". ") + ".";
}

/**
 * The largest name size (px) at which the longest word still fits on one line, between `min` and `max`.
 * Fredoka SemiBold is about 0.62 em per capital-led character. Long names such as "Reforestation Programme" must wrap
 * between words, never inside one.
 */
export function fitNamePx(name: string, innerWidth: number, max: number, min = 10): number {
  const longest = Math.max(1, ...name.split(/\s+/).map((w) => w.length));
  const px = Math.floor(innerWidth / (longest * 0.62));
  return Math.max(min, Math.min(max, px));
}

/** Hand cards grow with the text-size setting (up to 1.5 times), so their print can stay the same size on the card. */
export function cardWidthFor(base: number, textScale: number): number {
  return Math.round(base * Math.min(1.5, Math.max(1, textScale)));
}

/**
 * How tall the reveal's notebook panel is. A Ravage panel holds the hits and the real-world fact, so it is tall;
 * a Tool or Event has a line or two to say, so its panel is shorter and leaves more of the table in view.
 */
export function revealPanelHeight(kind: "ravage" | "tool" | "event", screenHeight: number): number {
  return kind === "ravage"
    ? Math.round(Math.max(240, Math.min(screenHeight * 0.5, 360)))
    : Math.round(Math.max(236, Math.min(screenHeight * 0.36, 300)));
}

/** Event cards that have their own mark in game/eventIcons.tsx. A test checks every Event in the content is listed. */
export const EVENT_ICON_IDS = ["E-1", "E-2", "E-3", "E-4", "E-5", "E-6"] as const;
