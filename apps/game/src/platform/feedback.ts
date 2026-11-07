import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { isSound, SOUNDS, type Cue, type Haptic } from "../core/soundPlan";
import { playSound } from "./sound";

export type { Cue } from "../core/soundPlan";

/** What the person has switched on. A `Settings` object satisfies this. */
export interface FeedbackPrefs { haptics: boolean; sound: boolean }

function buzz(kind: Haptic): void {
  try {
    if (kind === "tap") void Haptics.selectionAsync();
    else if (kind === "confirm") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch { /* haptics are optional */ }
}

/**
 * The one place a screen asks for feedback, so it never imports an audio or haptics library.
 * A sound cue plays its sound and its haptic (UI_Spec section 10); "tap", "confirm" and "warn" are haptic only.
 */
export function cue(kind: Cue, prefs: FeedbackPrefs): void {
  const haptic: Haptic | null = isSound(kind) ? SOUNDS[kind].haptic : kind;
  if (prefs.sound && isSound(kind)) playSound(kind);
  if (prefs.haptics && haptic && Platform.OS !== "web") buzz(haptic);
}
