// Typed shapes of the design-source JSON (Content/*.json and board.json).
// Pure types, no platform code. Shared by the engine, the app and tools.

export type BiomeId = "forest" | "coral" | "wetland" | "glacier" | "grassland" | "river";
export type RoleId = "ranger" | "ecologist" | "engineer" | "courier" | "pilot" | "activist";
export type Difficulty = "easy" | "normal" | "hard";
export type EventKey = "citizen" | "grant" | "volunteer" | "lobby" | "squeeze" | "heat";

export const BIOME_IDS: readonly BiomeId[] = ["forest", "coral", "wetland", "glacier", "grassland", "river"];
export const ROLE_IDS: readonly RoleId[] = ["ranger", "ecologist", "engineer", "courier", "pilot", "activist"];

export interface RavageCard {
  id: string; type: "ravage"; biome: BiomeId; name: string; cause: string; effect: string;
  reminder: string; surge: boolean; surge_text?: string; fact: string; fact_year?: number;
  source_id?: string; icon?: string; art_note?: string;
}
export interface ToolCard {
  id: string; type: "tool"; biome: BiomeId; name: string; uses: number; programme: boolean;
  effect: string; programme_text: string | null; flavour?: string; icon?: string;
}
export interface EventCard {
  id: string; type: "event"; key: EventKey; name: string; tone: string;
  effect: string; reminder?: string; icon_note?: string;
}
export type Card = RavageCard | ToolCard | EventCard;

export interface RoleCard { id: string; type: "role"; key: RoleId; name: string; ability: string; timing: string }

export interface BiomeDef {
  key: BiomeId; name: string; ravage_theme: string; tool: string; programme: string;
  palette_name: string; healthy_hex: string; vulnerable_hex: string; danger: string;
  icon: string; edge_pattern: string; tile_count: number;
}

export interface BoardTile { row: number; tile_index: number; q: number; r: number; id: number; neighbours: number[] }

export interface Rules {
  version: string; rules_version: string;
  difficulty: Record<Difficulty, { start_pressure: number; opening_strike: number; surge_cards: number; evacuation_rounds: number }>;
  two_player_pressure_bonus: number;
  deck: { ravage: number; tool: number; event: number; ravage_per_biome: number; tool_per_biome: number; programme_per_biome: number; single_use_per_biome: number; programme_uses: number };
  tiles: { per_biome: number; biomes: number; hub: number; total: number };
  metre: {
    bands: number; ticks_per_band: number; total_ticks: number; trophy_at_or_below: number; skull_at_or_above: number;
    start_ticks: Record<Difficulty, number>; restore_ticks_down: number; fortify_ticks_down: number; surge_ticks_up: number;
  };
  turn: { move: number; tool_actions: number; ability_actions: number; gifts: number; draws: number };
  limits: { hand: number; stabilise_markers: number; shield_tokens: number; steward_tokens_each: number };
  legacy: { healthy_token: number; vulnerable_token: number; guardian_bonus: number };
  easy_catch_up: Record<string, string>;
}

/** Everything the engine and the UI need, as one injectable object. */
export interface GameContent {
  version: string;
  rules: Rules;
  cards: Card[];
  roles: RoleCard[];
  biomes: Record<BiomeId, BiomeDef>;
  hub: { name: string; hex: string; note: string };
  ui: { ink_hex: string; paper_hex: string; danger_hex: string; metre_trophy_hex: string };
  board: { version: string; tiles: BoardTile[]; hubId: number };
}
