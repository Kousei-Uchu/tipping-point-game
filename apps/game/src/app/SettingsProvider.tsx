import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { DEFAULT_SETTINGS, sanitizeSettings, type Settings } from "../core/settings";
import { KEYS } from "../core/storage";
import { store } from "../platform/storage";

interface Ctx { settings: Settings; ready: boolean; update: (patch: Partial<Settings>) => void }
const SettingsContext = createContext<Ctx>({ settings: DEFAULT_SETTINGS, ready: false, update: () => {} });

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const raw = await store.getItem(KEYS.settings);
      let next = DEFAULT_SETTINGS;
      if (raw) { try { next = sanitizeSettings(JSON.parse(raw)); } catch { /* use defaults */ } }
      else {
        // First run: follow the operating system's reduce motion setting.
        try { next = { ...next, reducedMotion: await AccessibilityInfo.isReduceMotionEnabled() }; } catch { /* ignore */ }
      }
      if (alive) { setSettings(next); setReady(true); }
    })();
    return () => { alive = false; };
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = sanitizeSettings({ ...prev, ...patch });
      void store.setItem(KEYS.settings, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, ready, update }), [settings, ready, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
