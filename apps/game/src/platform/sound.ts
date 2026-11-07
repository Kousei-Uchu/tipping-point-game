import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { createMixer, LEVEL_GAIN, SOUNDS, type SoundName } from "../core/soundPlan";
import { SOUND_FILES } from "./soundFiles";

// One small player per cue, created the first time it is needed. Everything here fails quietly:
// a missing audio device or a browser that blocks sound until the first tap must never break play.
const DUCK_TO = 0.35;
const players = new Map<SoundName, AudioPlayer>();
const mixer = createMixer(160, DUCK_TO);

function playerFor(name: SoundName): AudioPlayer {
  let p = players.get(name);
  if (!p) { p = createAudioPlayer(SOUND_FILES[name]); players.set(name, p); }
  return p;
}

export function playSound(name: SoundName): void {
  try {
    const { gain, duck } = mixer.request(name, Date.now());
    for (const d of duck) { const dp = players.get(d); if (dp) dp.volume = LEVEL_GAIN[SOUNDS[d].level] * DUCK_TO; }
    const p = playerFor(name);
    p.volume = gain;
    void p.seekTo(0);
    p.play();
  } catch { /* sound is optional */ }
}
