import { content } from "../core/content";
import { darken } from "./colour";
import { materials, SCRIM } from "./materials";

/** Brand colours come straight from biomes.json so the design file and the app cannot drift. */
export const colors = {
  ink: content.ui.ink_hex,
  paper: content.ui.paper_hex,
  danger: content.ui.danger_hex,
  /** The danger red darkened just enough to read as text on card stock (the plain red is for fills). */
  dangerText: darken(content.ui.danger_hex, 0.15),
  trophy: content.ui.metre_trophy_hex,
  /** Card stock. Nothing in the app is pure white any more. */
  surface: materials.stock,
  surfaceAlt: materials.stockDeep,
  border: materials.keyline,
  muted: "#55616A",
  accent: "#2F6F73",
  good: "#3A7048",
  shield: "#3B6A9A",
  scrim: SCRIM,
  hub: content.hub.hex,
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;
export const MIN_TAP = 44;

/**
 * Fredoka (display) and Nunito (body) are SIL Open Font Licence; Special Elite (stamps) is
 * Apache 2.0. All three are bundled through @expo-google-fonts and loaded in App.tsx.
 * Custom families already carry their weight, so Text sets fontWeight to normal when they are in use.
 */
export const fonts = {
  display: "Fredoka_600SemiBold",
  body: "Nunito_400Regular",
  bodyBold: "Nunito_700Bold",
  stamp: "SpecialElite_400Regular",
} as const;

/** Flipped to false by App.tsx if the fonts fail to load, so text falls back to the system face. */
export const fontState = { custom: true };

export const type = {
  display: { size: 34, weight: "800" as const, line: 40 },
  title: { size: 22, weight: "700" as const, line: 28 },
  heading: { size: 17, weight: "700" as const, line: 22 },
  body: { size: 16, weight: "400" as const, line: 22 },
  small: { size: 13, weight: "400" as const, line: 18 },
  label: { size: 13, weight: "700" as const, line: 16 },
  /** Short uppercase labels only (YOUR TURN). Set in the stamp face. */
  stamp: { size: 12, weight: "400" as const, line: 16 },
};
export type TypeVariant = keyof typeof type;

/**
 * Three elevations, used consistently. Resting: pieces on the board. Lifted: a selected tile or
 * card. Held: a card being revealed, a sheet. Android ignores shadow* and reads `elevation`,
 * so each level carries both.
 */
export const elevation = {
  resting: { shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  lifted: { shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  held: { shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 14 },
} as const;
export type Elevation = keyof typeof elevation;

/** How far a lifted piece rises, in px. */
export const RISE = { resting: 0, lifted: 3, held: 6 } as const;

/** Kept so older call sites compile. Prefer `elevation`. */
export const shadow = { card: elevation.resting };
