import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { NewGameOptions, PlayerId } from "@tipping-point/engine";
import { LocalSession, parseSaved, type GameSession, type SessionSnapshot } from "../core/session";
import { KEYS } from "../core/storage";
import { store } from "../platform/storage";

interface Ctx {
  session: GameSession | null;
  /** True when a saved game exists on this device. */
  hasSave: boolean;
  /** `tutorial: true` starts the guided tutorial. It is never saved and never touches the real save. */
  start: (options: NewGameOptions, opts?: { tutorial?: boolean }) => void;
  resume: () => Promise<boolean>;
  /** Drop the live session. `discard` also deletes the save. A tutorial session never has a save to delete. */
  leave: (discard: boolean) => void;
  /** Which Stewards this device may act for. "all" is hot-seat. An online client lists only its own seat. */
  controls: PlayerId[] | "all";
  /** True while the live session is the guided tutorial. */
  isTutorial: boolean;
  /** Changes every time a session starts, so screens can reset themselves (for example when replaying the tutorial). */
  sessionKey: number;
}

const SessionContext = createContext<Ctx>({ session: null, hasSave: false, start: () => {}, resume: async () => false, leave: () => {}, controls: "all", isTutorial: false, sessionKey: 0 });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [hasSave, setHasSave] = useState(false);
  const [isTutorial, setIsTutorial] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { void store.getItem(KEYS.save).then((t) => setHasSave(parseSaved(t) !== null)); }, []);

  // Autosave after every change, lightly debounced. A finished game removes its save.
  // The tutorial is never saved, so playing it cannot overwrite a game in progress.
  useEffect(() => {
    if (!session || isTutorial) return;
    const save = () => {
      const snap = session.getSnapshot();
      if (snap.state.phase === "over") { void store.removeItem(KEYS.save); setHasSave(false); return; }
      void store.setItem(KEYS.save, JSON.stringify(session.toSaved())); setHasSave(true);
    };
    const unsub = session.subscribe(() => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(save, 250);
    });
    save();
    return () => { unsub(); if (timer.current) { clearTimeout(timer.current); timer.current = null; save(); } };
  }, [session, isTutorial]);

  const start = useCallback((options: NewGameOptions, opts?: { tutorial?: boolean }) => {
    setIsTutorial(!!opts?.tutorial);
    setSession(new LocalSession(options));
    setSessionKey((k) => k + 1);
  }, []);
  const resume = useCallback(async () => {
    const saved = parseSaved(await store.getItem(KEYS.save));
    if (!saved) return false;
    try { setIsTutorial(false); setSession(LocalSession.fromSaved(saved)); setSessionKey((k) => k + 1); return true; }
    catch { await store.removeItem(KEYS.save); setHasSave(false); return false; }
  }, []);
  const leave = useCallback((discard: boolean) => {
    // Discarding only ever applies to a real game. A tutorial session must never delete the player's save.
    if (discard && !isTutorial) { void store.removeItem(KEYS.save); setHasSave(false); }
    setSession(null);
    setIsTutorial(false);
  }, [isTutorial]);

  // Bots act on their own; this device only controls the human seats.
  const controls = useMemo<PlayerId[] | "all">(() => {
    const ps = session?.getSnapshot().options.players ?? [];
    return ps.some((p) => p.isBot) ? ps.filter((p) => !p.isBot).map((p) => p.id) : "all";
  }, [session]);

  const value = useMemo<Ctx>(() => ({ session, hasSave, start, resume, leave, controls, isTutorial, sessionKey }), [session, hasSave, start, resume, leave, controls, isTutorial, sessionKey]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSessionCtx = () => useContext(SessionContext);

/** Subscribes a component to the live session. Re-renders only when the snapshot changes. */
export function useSnapshot(session: GameSession): SessionSnapshot {
  return useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
}
