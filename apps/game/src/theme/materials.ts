import { darken } from "./colour";

/**
 * Table and paper tones (docs/STYLE_GUIDE.md). Ink, danger red and Trophy gold stay in the
 * content package; everything here is deliberately calm so game colour stands out.
 * Values are starting points to tune on a real screen.
 */
export const materials = {
  /** The table behind the board. Dark on purpose, so biome colours glow. */
  felt: "#2E3B3F",
  feltDeep: "#243034",
  /** Cards, notebook pages, rulebook, sheets. */
  stock: "#F3ECDC",
  stockDeep: "#E6DCC4",
  /** The printed inner line on card stock, and the outer edge of a plate. */
  keyline: "#C9BC9B",
  /** Punchboard rims, trays, the Metre frame. */
  kraft: "#C8A878",
  kraftDeep: darken("#C8A878", 0.22),
  /** Pawns and markers. */
  wood: "#B98A5B",
  woodDeep: darken("#B98A5B", 0.25),
  /** The Metre's slider. Two stops for the gradient plus the edge. */
  brass: "#C9A24B",
  brassLight: "#E6CE85",
  brassDeep: "#8A6A25",
} as const;

/** Dim layer behind a sheet: the felt, not black, so the table stays a table. */
export const SCRIM = "rgba(36,48,52,0.62)";
