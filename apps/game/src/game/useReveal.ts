import { useCallback, useEffect, useRef, useState } from "react";
import type { Settings } from "../core/settings";
import { advance, afterAway, leave, phaseMs, settle, startReveal, type RevealState } from "../core/revealPlan";
import type { Story } from "../core/story";

interface Held { story: Story | null; s: RevealState | null }

/**
 * Runs the Ravage reveal (core/revealPlan.ts) for one drawn story. Returns where it is, a way to skip the beat in
 * progress, and a way to leave once the card is at rest. `onLanded` is told each time a card reaches the discard
 * pile (`done` is true for the last card of the story), which is when the app may show it there.
 */
export function useReveal(story: Story | null, settings: Settings, onLanded: (step: number, done: boolean) => void) {
  const [held, setHeld] = useState<Held>({ story: null, s: null });
  let cur = held;
  if (held.story !== story) {
    // A new story starts: open it at its first beat, or at rest if the settings have no motion. Set during render so no frame is wrong.
    cur = { story, s: story ? settle(story, startReveal(), settings) : null };
    setHeld(cur);
  }
  const ref = useRef(cur); ref.current = cur;
  const settingsRef = useRef(settings); settingsRef.current = settings;
  const landed = useRef(onLanded); landed.current = onLanded;

  const s = cur.s;
  useEffect(() => {
    if (!story || !s) return;
    const ms = phaseMs(settings, s.phase);
    if (ms === null) return; // rest: waits for Continue
    const t = setTimeout(() => {
      const now = ref.current;
      if (now.story !== story || !now.s) return;
      const st = settingsRef.current;
      if (now.s.phase === "away") {
        const next = afterAway(story, now.s);
        landed.current(now.s.step, next === null);
        if (next) setHeld({ story, s: settle(story, next, st) });
        return;
      }
      setHeld({ story, s: settle(story, advance(story, now.s, st), st) });
    }, ms);
    return () => clearTimeout(t);
  }, [story, s?.step, s?.phase, s?.shown, settings]); // eslint-disable-line react-hooks/exhaustive-deps

  /** A tap: finish the beat in progress and go to the next. Tiles still to be stamped are all stamped. */
  const skipBeat = useCallback(() => {
    const now = ref.current;
    if (!now.story || !now.s) return;
    setHeld({ story: now.story, s: settle(now.story, advance(now.story, now.s, settingsRef.current, true), settingsRef.current) });
  }, []);

  /** Continue: only counts at rest. */
  const proceed = useCallback(() => {
    const now = ref.current;
    if (!now.story || !now.s) return;
    setHeld({ story: now.story, s: leave(now.s) });
  }, []);

  return { state: s, skipBeat, proceed };
}
