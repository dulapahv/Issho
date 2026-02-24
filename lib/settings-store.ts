import { create } from "zustand";

const STORAGE_KEY = "issho-settings";

interface SettingsState {
  timeFormat: "12h" | "24h";
  weekStartsOn: 0 | 1;
}

interface SettingsStore extends SettingsState {
  setTimeFormat: (f: "12h" | "24h") => void;
  setWeekStartsOn: (d: 0 | 1) => void;
}

/** Reads persisted settings from localStorage, falling back to defaults. */
function loadSettings(): SettingsState {
  if (typeof window === "undefined") {
    return { timeFormat: "12h", weekStartsOn: 1 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        timeFormat:
          parsed.timeFormat === "24h" || parsed.timeFormat === "12h"
            ? parsed.timeFormat
            : "12h",
        weekStartsOn:
          parsed.weekStartsOn === 0 || parsed.weekStartsOn === 1
            ? parsed.weekStartsOn
            : 1,
      };
    }
  } catch {
    // Ignore malformed JSON
  }
  return { timeFormat: "12h", weekStartsOn: 1 };
}

/** Persists the current settings state to localStorage. */
function persistSettings(state: SettingsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or storage unavailable
  }
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...loadSettings(),
  setTimeFormat: (timeFormat) => {
    set({ timeFormat });
    persistSettings({ ...get(), timeFormat });
  },
  setWeekStartsOn: (weekStartsOn) => {
    set({ weekStartsOn });
    persistSettings({ ...get(), weekStartsOn });
  },
}));
