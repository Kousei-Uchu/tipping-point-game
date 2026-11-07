export const TEXT_SCALES = [0.9, 1, 1.25, 1.5, 2] as const;

export interface Settings {
  /** Multiplies every font size. UI_Spec section 8 asks for up to 200 percent. */
  textScale: number;
  reducedMotion: boolean;
  /** Ignored when reducedMotion is on. */
  fastAnimations: boolean;
  sound: boolean;
  haptics: boolean;
}

export const DEFAULT_SETTINGS: Settings = { textScale: 1, reducedMotion: false, fastAnimations: false, sound: true, haptics: true };

/** Accepts whatever came out of storage and returns a safe Settings object. */
export function sanitizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const scale = typeof r.textScale === "number" && Number.isFinite(r.textScale) ? r.textScale : DEFAULT_SETTINGS.textScale;
  const bool = (k: keyof Settings) => (typeof r[k] === "boolean" ? (r[k] as boolean) : (DEFAULT_SETTINGS[k] as boolean));
  return {
    textScale: Math.min(2, Math.max(0.8, scale)),
    reducedMotion: bool("reducedMotion"),
    fastAnimations: bool("fastAnimations"),
    sound: bool("sound"),
    haptics: bool("haptics"),
  };
}

/** Duration helper: every animation in the app goes through this, so reduced motion is honoured everywhere. */
export function motionMs(s: Settings, ms: number): number {
  if (s.reducedMotion) return 0;
  return s.fastAnimations ? Math.round(ms / 2) : ms;
}
