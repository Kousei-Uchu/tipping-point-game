import type { EngineError } from "@tipping-point/engine";

/** Player-facing reasons for engine error codes. Short, plain, no blame. */
export const ERROR_TEXT: Record<EngineError, string> = {
  E_REMOVED: "That tile has been lost.",
  E_STEPS: "Not enough moves left for that path.",
  E_END_REMOVED: "A move cannot end on a lost tile.",
  E_NO_MARKERS: "No Stabilise markers are left.",
  E_NO_SHIELDS: "No Shield tokens are left.",
  E_SAME_TILE: "This Programme card was already used on this tile.",
  E_HAND_FULL: "That Steward's hand is full.",
  E_BIOME_MISMATCH: "This Tool is for a different biome.",
  E_WRONG_STATUS: "That does not work on a tile in this state.",
  E_ACTION_USED: "That action is already used this turn.",
  E_PHASE: "Not allowed right now.",
  E_PENDING: "A decision has to be made first.",
  E_NOT_YOUR_TURN: "It is not that Steward's turn.",
  E_EVACUATED: "That Steward is away from the board.",
  E_NOT_SAME_TILE: "Both Stewards must be on the same tile.",
  E_BAD_PATH: "That path is not valid.",
  E_BAD_PAYLOAD: "That choice is not valid.",
  E_NOT_STRANDED: "Only possible when every neighbouring tile is lost.",
  E_NO_ROLE: "That role is not in play for this Steward.",
  E_NO_SUCH_CARD: "That card is not available.",
};

export const explainError = (e: EngineError | null | undefined): string => (e ? ERROR_TEXT[e] : "");
