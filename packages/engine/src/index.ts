import type { GameContent } from "@tipping-point/content";
import { apply } from "./apply";
import { createGame } from "./setup";
import { chooseAction } from "./bot";
import * as legal from "./legal";
import type { Action, ApplyResult, NewGameOptions, PlayerId, State } from "./types";

export * from "./types";
export * from "./hex";
export * from "./rng";
export * from "./legal";
export { apply } from "./apply";
export { createGame, PLAYER_COLOURS } from "./setup";
export { computeLegacy } from "./end";
export { pressureOf } from "./ctx";
export { chooseAction, CARE } from "./bot";

/** Convenience wrapper that binds one content set. The app uses this. */
export function createEngine(content: GameContent) {
  return {
    content,
    newGame: (opt: NewGameOptions) => createGame(content, opt),
    apply: (s: State, a: Action, actor: PlayerId): ApplyResult => apply(content, s, a, actor),
    check: (s: State, a: Action, actor: PlayerId) => legal.check(content, s, a, actor),
    moveTargets: (s: State, id: PlayerId, maxSteps?: number) => legal.moveTargets(content, s, id, maxSteps),
    describeTile: (s: State, tile: number, from?: number | null) => legal.describeTile(content, s, tile, from),
    chooseAction: (s: State, id?: PlayerId): Action => chooseAction(content, s, id),
    stepsLeft: (s: State) => legal.stepsLeft(content, s),
    isStranded: (s: State, id: PlayerId) => legal.isStranded(content, s, id),
  };
}
export type Engine = ReturnType<typeof createEngine>;
