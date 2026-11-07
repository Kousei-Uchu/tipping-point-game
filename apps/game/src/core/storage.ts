/** The only storage shape the core knows. Platform code supplies an implementation (AsyncStorage works on web and native). */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return {
    getItem: async (k) => m.get(k) ?? null,
    setItem: async (k, v) => { m.set(k, v); },
    removeItem: async (k) => { m.delete(k); },
  };
}

export const KEYS = { save: "tp.save.v1", settings: "tp.settings.v1", lobby: "tp.lobby.v1", tutorial: "tp.tutorial.v1", guide: "tp.guide.v1" } as const;
