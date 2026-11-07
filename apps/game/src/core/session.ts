// GameSession is the seam between the UI and the rules.
//
// The UI only ever (1) reads a snapshot, (2) dispatches an Action for an actor, (3) asks for undo.
// LocalSession runs the engine in-process (hot-seat today). A RemoteSession that talks to the
// authoritative server (UI_Spec TD-4) implements the same interface, so no screen changes.
import type { Action, EngineError, GameEvent, NewGameOptions, PlayerId, State } from "@tipping-point/engine";
import { engine as defaultEngine } from "./content";
import type { Engine } from "@tipping-point/engine";

export interface LoggedAction { actor: PlayerId; action: Action }

/** Persisted form: the seed, the options and every accepted action. The state is rebuilt by replay (UI_Spec TD-5). */
export interface SavedGame {
  v: 1;
  savedAt: number;
  rulesVersion: string;
  options: NewGameOptions;
  log: LoggedAction[];
}

export interface SessionSnapshot {
  readonly state: State;
  /** Every event since the start of the game, oldest first. */
  readonly events: readonly GameEvent[];
  /** Events produced by the most recent accepted action. Empty after an undo. */
  readonly lastBatch: readonly GameEvent[];
  /** Increments on every change, so effects and animations can key off it. */
  readonly revision: number;
  readonly canUndo: boolean;
  readonly options: NewGameOptions;
}

export type DispatchResult = { ok: true; events: GameEvent[] } | { ok: false; error: EngineError };

export interface GameSession {
  getSnapshot(): SessionSnapshot;
  subscribe(listener: () => void): () => void;
  dispatch(action: Action, actor: PlayerId): DispatchResult;
  undo(): boolean;
  toSaved(): SavedGame;
}

interface UndoEntry { state: State; eventCount: number }

export class LocalSession implements GameSession {
  private state: State;
  private events: GameEvent[];
  private log: LoggedAction[] = [];
  private undoStack: UndoEntry[] = [];
  private listeners = new Set<() => void>();
  private snap: SessionSnapshot;
  private revision = 0;

  constructor(private readonly options: NewGameOptions, private readonly eng: Engine = defaultEngine) {
    const g = this.eng.newGame(options);
    this.state = g.state;
    this.events = [...g.events];
    this.snap = this.makeSnapshot([]);
  }

  /** Rebuilds a session from a save by replaying the action log. Throws if the log no longer applies. */
  static fromSaved(saved: SavedGame, eng: Engine = defaultEngine): LocalSession {
    if (saved.v !== 1) throw new Error("Unknown save version");
    if (saved.rulesVersion !== eng.content.rules.rules_version) throw new Error("Save was made with other rules");
    const s = new LocalSession(saved.options, eng);
    for (const entry of saved.log) {
      const r = s.dispatch(entry.action, entry.actor);
      if (!r.ok) throw new Error(`Replay failed at action ${s.log.length}: ${r.error}`);
    }
    return s;
  }

  getSnapshot = (): SessionSnapshot => this.snap;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };

  dispatch(action: Action, actor: PlayerId): DispatchResult {
    const r = this.eng.apply(this.state, action, actor);
    if (!r.ok) return r;
    const commit = action.type === "Draw" || action.type === "Resolve";
    if (!commit) this.undoStack.push({ state: this.state, eventCount: this.events.length });
    this.state = r.state;
    this.events.push(...r.events);
    this.log.push({ actor, action });
    // Anything that ends the turn, locks undo (reveals) or opens a decision closes the undo window.
    const closes = commit || r.state.pending !== null || !!r.state.turn?.undoLocked
      || r.events.some((e) => e.kind === "TurnEnded" || e.kind === "GameOver");
    if (closes) this.undoStack = [];
    this.publish(r.events);
    return { ok: true, events: r.events };
  }

  undo(): boolean {
    const prev = this.undoStack.pop();
    if (!prev) return false;
    this.state = prev.state;
    this.events.length = prev.eventCount;
    this.log.pop();
    this.publish([]);
    return true;
  }

  toSaved(): SavedGame {
    return { v: 1, savedAt: Date.now(), rulesVersion: this.state.rulesVersion, options: this.options, log: [...this.log] };
  }

  private makeSnapshot(batch: GameEvent[]): SessionSnapshot {
    return {
      state: this.state, events: [...this.events], lastBatch: batch, revision: this.revision,
      canUndo: this.undoStack.length > 0, options: this.options,
    };
  }

  private publish(batch: GameEvent[]): void {
    this.revision++;
    this.snap = this.makeSnapshot(batch);
    this.listeners.forEach((l) => l());
  }
}

/** Parses a stored save. Returns null for anything unusable, so a bad save never crashes the title screen. */
export function parseSaved(text: string | null): SavedGame | null {
  if (!text) return null;
  try {
    const v = JSON.parse(text) as Partial<SavedGame>;
    if (v && v.v === 1 && v.options && Array.isArray(v.log) && typeof v.rulesVersion === "string") return v as SavedGame;
  } catch { /* fall through */ }
  return null;
}
