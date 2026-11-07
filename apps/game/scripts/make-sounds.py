#!/usr/bin/env python3
"""Synthesises every sound effect from scratch (noise, sine tones, filters, envelopes).
Nothing is sampled or downloaded, so there is no third-party licence: the files are ours (CC0).
Run: python3 scripts/make-sounds.py   (needs numpy and scipy). Output: assets/sounds/*.wav, 22.05 kHz mono 16-bit.
Cue names, levels and haptics are in src/core/soundPlan.ts. Loudness is applied in the app, so every file peaks the same."""
import os, wave
import numpy as np
from scipy.signal import butter, sosfilt

SR = 22050
rng = np.random.default_rng(20261107)
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "sounds")

def t_(d): return np.arange(int(SR * d)) / SR
def env(n, a=0.002, d=0.05):
    """Fast attack, exponential decay."""
    e = np.exp(-np.arange(n) / (SR * d)); k = max(1, int(SR * a)); e[:k] *= np.linspace(0, 1, k); return e
def noise(d): return rng.standard_normal(int(SR * d))
def band(x, lo, hi): return sosfilt(butter(3, [lo, hi], btype="band", fs=SR, output="sos"), x)
def low(x, f): return sosfilt(butter(3, f, btype="low", fs=SR, output="sos"), x)
def high(x, f): return sosfilt(butter(3, f, btype="high", fs=SR, output="sos"), x)
def tone(f, d, dec, a=0.002, f2=None):
    t = t_(d); ff = f if f2 is None else np.linspace(f, f2, len(t)); ph = 2 * np.pi * np.cumsum(ff) / SR
    return np.sin(ph) * env(len(t), a, dec)
def mix(d, *parts):
    out = np.zeros(int(SR * d))
    for at, x, g in parts:
        i = int(SR * at); n = min(len(x), len(out) - i)
        if n > 0: out[i:i + n] += x[:n] * g
    return out
def fade(x, ms=8):
    k = int(SR * ms / 1000); x = x.copy(); x[-k:] *= np.linspace(1, 0, k); return x
def save(name, x):
    x = fade(x); x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
    with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype("<i2").tobytes())

def snap(d=0.05, lo=2500): return high(noise(d), lo) * env(int(SR * d), 0.0005, d / 4)

save("keyPress", mix(0.1, (0, band(noise(0.05), 300, 1800) * env(int(SR * .05), .001, .012), 1), (0, tone(170, 0.08, 0.02), 0.8)))
save("lift", mix(0.12, (0, tone(900, 0.04, 0.008), 0.5), (0, band(noise(0.06), 400, 2500) * env(int(SR * .06), .001, .015), 0.7)))
save("place", mix(0.2, (0, tone(210, 0.15, 0.035, f2=160), 1), (0, low(noise(0.05), 900) * env(int(SR * .05), .0008, .012), 0.9)))
save("cardDraw", snap(0.08, 2200) + 0.4 * band(noise(0.08), 500, 2000) * env(int(SR * .08), .001, .03))
save("cardFlip", mix(0.22, (0, snap(0.05, 2400), 1), (0.09, snap(0.05, 3000), 0.8)))
slide = band(noise(0.3), 1200, 5000) * np.sin(np.linspace(0, np.pi, int(SR * 0.3))) ** 1.5
save("cardSlide", slide)
save("restore", mix(0.32, (0, tone(150, 0.22, 0.06, f2=85), 1), (0, low(noise(0.04), 1200) * env(int(SR * .04), .0005, .01), 0.8), (0.02, tone(520, 0.2, 0.07), 0.14)))
save("shieldOn", mix(0.4, (0, snap(0.02, 3500), 0.8), (0.015, tone(1200, 0.35, 0.09), 0.7), (0.015, tone(1800, 0.3, 0.06), 0.25)))
crackle = high(noise(0.12), 1500) * env(int(SR * .12), .0005, .02) * (rng.random(int(SR * .12)) > 0.55)
save("shieldOff", mix(0.3, (0, snap(0.03, 3000), 0.9), (0.005, crackle, 1.2), (0.06, tone(420, 0.2, 0.05, f2=130), 0.9)))
scr = band(noise(0.22), 2000, 6000) * (0.5 + 0.5 * np.sin(2 * np.pi * 38 * t_(0.22))) * env(int(SR * .22), .01, .09)
save("scuff", scr)
save("drop", mix(0.4, (0, tone(300, 0.3, 0.07, f2=240), 0.9), (0.09, tone(180, 0.3, 0.09, f2=140), 1), (0, low(noise(0.03), 1500) * env(int(SR * .03), .0005, .008), 0.5)))
save("metreTick", mix(0.1, (0, tone(2400, 0.06, 0.012), 0.8), (0, tone(3600, 0.04, 0.008), 0.35), (0, snap(0.015, 4000), 0.4)))
save("handoff", mix(0.4, (0, tone(260, 0.18, 0.05, f2=200), 1), (0, low(noise(0.05), 800) * env(int(SR * .05), .001, .012), 0.7), (0.17, tone(300, 0.15, 0.04, f2=240), 0.55)))
d = 1.1; sw = np.sin(np.linspace(0, np.pi, int(SR * d))) ** 0.8
save("surge", (low(noise(d), 120) * 3.0 + tone(55, d, 0.5) * 1.0 + tone(82, d, 0.35) * 0.5) * sw)
d = 1.5
save("trophy", mix(d, (0, tone(880, d, 0.45), 1), (0.0, tone(1318.5, d, 0.35), 0.55), (0.0, tone(1760, d, 0.25), 0.3), (0, tone(2637, 0.4, 0.05), 0.12)))
d = 2.0; sw = np.minimum(1, np.linspace(0, 12, int(SR * d)))
save("collapse", (tone(65.4, d, 0.9) + 0.7 * tone(98, d, 0.7) + 0.35 * tone(130.8, d, 0.5) + 0.2 * low(noise(d), 200) * env(int(SR * d), .05, .5)) * sw)
print("wrote", len(os.listdir(OUT)), "files")
