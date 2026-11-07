import type { Action, Player, State } from "@tipping-point/engine";

export interface SheetProps {
  state: State;
  actor: Player;
  canAct: boolean;
  docked: boolean;
  onAct: (a: Action) => void;
  onClose: () => void;
}
