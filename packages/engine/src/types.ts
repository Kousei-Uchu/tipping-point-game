// Typed contract for the engine. Extends Digital Spec/schema.ts (draft 1).
// Every deviation from schema.ts is marked "SCHEMA+" and listed in docs/SPEC_GAPS.md.
import type { BiomeId, Difficulty, RoleId } from "@tipping-point/content";
export type { BiomeId, Difficulty, RoleId } from "@tipping-point/content";

export type PlayerId = string;
export type TileStatus = "healthy" | "vulnerable" | "removed";
export type Phase = "setup" | "turn" | "finalLap" | "over";

export interface Tile {
  id: number; q: number; r: number;
  biome: BiomeId | "hub";
  status: TileStatus;
  shield: boolean;       // only meaningful when healthy
  stabilised: boolean;   // only meaningful when vulnerable
  owner: PlayerId | null;
}

export interface HeldTool { cardId: string; usesLeft: number; usedOn: number[] }

export interface Player {
  id: PlayerId;
  name: string;                     // SCHEMA+ (display name)
  seat: number; colour: string; isBot: boolean;
  botLevel?: "easy" | "normal" | "hard";
  botMode?: "cooperative" | "balanced" | "selfish";
  roles: RoleId[];
  pos: number | null;               // tile id, null while evacuated
  awayTurns: number;
  hand: HeldTool[];
  tokensInSupply: number;
}

export interface TurnScratch {
  stepsUsed: number;
  toolActionUsed: boolean;
  abilityUsed: Partial<Record<RoleId, boolean>>;
  giftUsed: boolean;
  spentToolOrStabilise: boolean;
  activistDeclared: boolean;
  improvising: boolean;
  improviseCrossed: boolean;        // SCHEMA+ (the one removed tile was already crossed)
  undoLocked: boolean;
}

export type Pending =
  | { kind: "reorderTop5"; seat: number; cardIds: string[] }
  | { kind: "grantPick"; seat: number }
  | { kind: "volunteerMove"; seat: number; remaining: number[] }
  | { kind: "squeezeReturn"; seat: number; remaining: number[] }
  | { kind: "forecastKeepOrBottom"; seat: number; cardId: string };

/** SCHEMA+ : what to do once the current pending decision (or card) is finished. LIFO stack. */
export type Continuation =
  | { kind: "reinsert"; cardId: string }
  | { kind: "heat"; left: number; depth: number }
  | { kind: "endTurn" };

export interface LegacyScore { player: PlayerId; tokensOnHealthy: number; guardianBiomes: BiomeId[]; total: number }

export interface GameResult {
  kind: "trophy" | "collapse";
  reason?: "skull" | "extinction";
  legacy?: LegacyScore[];
  winners?: PlayerId[];
}

export interface State {
  rulesVersion: string; seed: number; rngState: number;
  difficulty: Difficulty;
  tiles: Tile[]; players: Player[];
  deck: string[];                    // index 0 = top
  metreTicks: number;                // <=0 trophy, >=41 skull, pressure = ceil(ticks/8)
  stabiliseSupply: number; shieldSupply: number;
  removedByBiome: Record<BiomeId, number>;
  cascaded: Record<BiomeId, boolean>;
  extinct: Record<BiomeId, boolean>;
  extinctCount: number;
  lobbyCharges: number;
  calmCoverCardId: string | null;
  round: number; startSeat: number;  // startSeat is SCHEMA+
  activeSeat: number;
  turn: TurnScratch | null;
  pending: Pending | null;
  continuations: Continuation[];     // SCHEMA+
  phase: Phase;
  trophyReachedBySeat: number | null;
  finalLapRemaining: number[];
  eventSeq: number;                  // SCHEMA+ (next event number)
  result: GameResult | null;
}

export type Action =
  | { type: "Move"; path: number[] }                       // path excludes the start tile
  | { type: "UseTool"; handIndex: number; kind: "restore" | "fortify" }
  | { type: "Stabilise" }
  | { type: "UseAbility"; role: RoleId; payload?: unknown }
  | { type: "Gift"; toPlayer: PlayerId; handIndex: number }
  | { type: "Improvise"; handIndex: number }
  | { type: "Draw" }                                       // in the final lap this just ends the turn
  | { type: "Resolve"; payload: unknown };                 // answers a Pending decision

export type EngineError =
  | "E_REMOVED" | "E_STEPS" | "E_END_REMOVED" | "E_NO_MARKERS" | "E_NO_SHIELDS"
  | "E_SAME_TILE" | "E_HAND_FULL" | "E_BIOME_MISMATCH" | "E_WRONG_STATUS"
  | "E_ACTION_USED" | "E_PHASE" | "E_PENDING" | "E_NOT_YOUR_TURN" | "E_EVACUATED"
  | "E_NOT_SAME_TILE" | "E_BAD_PATH" | "E_BAD_PAYLOAD" | "E_NOT_STRANDED" | "E_NO_ROLE" | "E_NO_SUCH_CARD"; // last 6: SCHEMA+

export interface GameEvent { seq: number; kind: string; [k: string]: unknown }

export type ApplyResult =
  | { ok: true; state: State; events: GameEvent[] }
  | { ok: false; error: EngineError };

export interface NewGameOptions {
  seed: number;
  difficulty: Difficulty;
  players: { id: PlayerId; name: string; isBot?: boolean; botLevel?: Player["botLevel"]; botMode?: Player["botMode"] }[];
  /** Seat that plays first (the lobby knows ages, the engine does not). Default 0. */
  startSeat?: number;
}
