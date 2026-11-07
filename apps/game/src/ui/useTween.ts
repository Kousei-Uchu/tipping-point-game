import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useSettings } from "../app/SettingsProvider";
import { motionMs } from "../core/settings";
import { MOVES, moveMs, tweenAt, type MoveName } from "../theme/motion";

/** Set by the board once its first picture is up, so pieces already on the table do not all drop in at load. */
export const BoardMotionContext = createContext<{ ready: boolean }>({ ready: true });

/**
 * A number that glides to `target` using a named move from theme/motion.ts. Driven by requestAnimationFrame
 * because the board is SVG, whose attributes cannot use the native driver. Under reduced motion the move lasts
 * 0 ms, so the value jumps straight to the target and nothing moves. `initial` sets where it starts (default: at rest on target).
 */
export function useTween(target: number, move: MoveName, initial?: number): number {
  const { settings } = useSettings();
  const ms = moveMs(settings, move);
  const start = ms === 0 ? target : initial ?? target; // no motion: never show the starting position, not even for a frame
  const [value, setValue] = useState(start);
  const cur = useRef(start);
  useEffect(() => {
    if (ms === 0) { cur.current = target; setValue(target); return; }
    if (cur.current === target) return;
    const from = cur.current, t0 = Date.now(), easing = MOVES[move].easing;
    let raf = 0, alive = true;
    const step = () => {
      if (!alive) return;
      const elapsed = Date.now() - t0;
      const v = tweenAt(from, target, elapsed, ms, easing);
      cur.current = v; setValue(v);
      if (elapsed < ms) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [target, ms, move]);
  return value;
}

/** 1 while idle; each time `key` changes it runs 0 to 1 once over the move. Used for the Metre's shake. */
export function usePulse(key: number, move: MoveName): number {
  const { settings } = useSettings();
  const ms = moveMs(settings, move);
  const [t, setT] = useState(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (ms === 0) { setT(1); return; }
    const t0 = Date.now();
    let raf = 0, alive = true;
    const step = () => {
      if (!alive) return;
      const p = Math.min(1, (Date.now() - t0) / ms);
      setT(p);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    setT(0); raf = requestAnimationFrame(step);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [key, ms]);
  return t;
}

/** 1 just as a piece appears, easing to 0 as it lands. Pieces that were already there at load start at 0. */
export function useLanding(): number {
  const { ready } = useContext(BoardMotionContext);
  return useTween(0, "place", ready ? 1 : 0);
}

/**
 * A gentle 0 to 1 and back to 0 loop, for "look here" cues (the draw pile when Draw is the move).
 * Not running: 0. Reduced motion: held at 1, so the cue is a steady ring and nothing moves.
 */
export function useLoop(active: boolean): number {
  const { settings } = useSettings();
  const still = settings.reducedMotion;
  const [high, setHigh] = useState(true);
  useEffect(() => {
    if (!active || still) return;
    const id = setInterval(() => setHigh((h) => !h), 800);
    return () => clearInterval(id);
  }, [active, still]);
  const v = useTween(high ? 1 : 0.25, "cardSlide");
  return !active ? 0 : still ? 1 : v;
}

/**
 * Counts 0, 1, 2 ... up to `max`, one step per `stepMs` (through motionMs, so Fast animations halves it).
 * Used to count Legacy out in tokens. Under reduced motion it is `max` straight away. Starts after `delayMs`.
 */
export function useCountUp(max: number, stepMs: number, delayMs = 0): number {
  const { settings } = useSettings();
  const ms = motionMs(settings, stepMs);
  const [n, setN] = useState(ms === 0 ? max : 0);
  useEffect(() => {
    if (ms === 0) { setN(max); return; }
    setN(0);
    let i = 0, timer: ReturnType<typeof setTimeout>;
    const tick = () => { i++; setN(i); if (i < max) timer = setTimeout(tick, ms); };
    timer = setTimeout(tick, motionMs(settings, delayMs) + ms);
    return () => clearTimeout(timer);
  }, [max, ms]); // eslint-disable-line react-hooks/exhaustive-deps
  return Math.min(n, max);
}
