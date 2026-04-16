/**
 * Persistent storage service using AsyncStorage.
 * Stores user settings (API URL, etc.) across app restarts.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  API_URL: "settings:api_url",
  LIP_SYNC: "settings:lip_sync",
  ETHICS_ACCEPTED: "settings:ethics_accepted",
};

const DEFAULT_API_URL = "https://api.otopgestion.com";

export const StorageService = {
  // ─── API URL ──────────────────────────────────────────────────────────────
  getApiUrl: async (): Promise<string> => {
    const url = await AsyncStorage.getItem(KEYS.API_URL);
    return url || DEFAULT_API_URL;
  },

  setApiUrl: async (url: string): Promise<void> => {
    const cleaned = url.replace(/\/$/, ""); // Remove trailing slash
    await AsyncStorage.setItem(KEYS.API_URL, cleaned);
  },

  // ─── Preferences ─────────────────────────────────────────────────────────
  getLipSync: async (): Promise<boolean> => {
    const val = await AsyncStorage.getItem(KEYS.LIP_SYNC);
    return val !== "false"; // Default: true
  },

  setLipSync: async (enabled: boolean): Promise<void> => {
    await AsyncStorage.setItem(KEYS.LIP_SYNC, String(enabled));
  },

  getEthicsAccepted: async (): Promise<boolean> => {
    const val = await AsyncStorage.getItem(KEYS.ETHICS_ACCEPTED);
    return val === "true";
  },

  setEthicsAccepted: async (accepted: boolean): Promise<void> => {
    await AsyncStorage.setItem(KEYS.ETHICS_ACCEPTED, String(accepted));
  },
};
