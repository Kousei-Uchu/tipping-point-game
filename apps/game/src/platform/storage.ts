import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KeyValueStore } from "../core/storage";

/** AsyncStorage is localStorage on web and native storage on iOS and Android. Failures never throw into the UI. */
export const store: KeyValueStore = {
  getItem: async (k) => { try { return await AsyncStorage.getItem(k); } catch { return null; } },
  setItem: async (k, v) => { try { await AsyncStorage.setItem(k, v); } catch { /* storage full or blocked */ } },
  removeItem: async (k) => { try { await AsyncStorage.removeItem(k); } catch { /* ignore */ } },
};
