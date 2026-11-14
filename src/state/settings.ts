import { preferences } from "../game/persistence/preferences";
import { create } from "zustand";
import {
  DEFAULT_KEYMAP,
  validKeymap,
  validInputPreferences,
  type Keymap,
  type KeyboardPreset,
} from "../game/input/bindings";
export type Quality = "low" | "medium" | "high";
export type Preferences = {
  reducedEffects: boolean;
  zoom: number;
  quality: Quality;
  particles: number;
  glow: number;
  shake: number;
  damageNumbers: "off" | "sparse" | "all";
  master: number;
  music: number;
  sfx: number;
  ambient: number;
  muted: boolean;
  audioIntensity: "gentle" | "balanced" | "full";
  keyboard: KeyboardPreset;
  keymap: Keymap;
  hideHud: boolean;
  touchArea: "anywhere" | "left" | "right";
  fullscreen: boolean;
};
export const defaults: Preferences = {
  reducedEffects: false,
  zoom: 1,
  quality: "medium",
  particles: 0.65,
  glow: 0.45,
  shake: 0.4,
  damageNumbers: "all",
  master: 0.65,
  music: 0.45,
  sfx: 0.7,
  ambient: 0.4,
  muted: false,
  audioIntensity: "balanced",
  keyboard: "both",
  keymap: DEFAULT_KEYMAP,
  hideHud: false,
  touchArea: "anywhere",
  fullscreen: false,
};
export const QUALITY = {
  low: {
    particles: 0.2,
    glow: 0,
    shake: 0.15,
    damageNumbers: "sparse" as const,
  },
  medium: {
    particles: 0.65,
    glow: 0.45,
    shake: 0.4,
    damageNumbers: "all" as const,
  },
  high: { particles: 1, glow: 0.7, shake: 0.6, damageNumbers: "all" as const },
};
export function parsePreferences(value: unknown): Preferences {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid preferences");
  const source = value as Record<string, unknown>;
  const out = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof Preferences)[]) {
    if (!(key in source)) continue; // Migrate existing two-field saves without overwriting them.
    const v = source[key];
    const valid =
      key === "zoom"
        ? [0.85, 1, 1.15].includes(v as number)
        : key === "keymap"
          ? validKeymap(v)
          : key === "keyboard"
            ? ["both", "wasd", "arrows", "custom"].includes(v as string)
            : key === "touchArea"
              ? ["anywhere", "left", "right"].includes(v as string)
              : key === "quality"
                ? ["low", "medium", "high"].includes(v as string)
                : key === "damageNumbers"
                  ? ["off", "sparse", "all"].includes(v as string)
                  : key === "audioIntensity"
                    ? ["gentle", "balanced", "full"].includes(v as string)
                    : typeof defaults[key] === "boolean"
                      ? typeof v === "boolean"
                      : typeof v === "number" &&
                        Number.isFinite(v) &&
                        v >= 0 &&
                        v <= 1;
    if (!valid) throw new Error("Invalid preference: " + key);
    Object.assign(out, { [key]: key === "keymap" ? structuredClone(v) : v });
  }
  if (!validInputPreferences(out)) throw new Error("Conflicting key mapping.");
  return out;
}
export const useSettings = create<
  Preferences & {
    set: (p: Partial<Preferences>) => void;
    load: () => void;
    warning: string;
    rebinding: boolean;
    setRebinding: (active: boolean) => void;
  }
>((set, get) => ({
  ...defaults,
  warning: "",
  rebinding: false,
  setRebinding: (rebinding) => set({ rebinding }),
  set(p) {
    const next = parsePreferences({ ...get(), ...p });
    try {
      const old = preferences.get("nowrift-preferences-v1");
      if (old && !preferences.get("nowrift-preferences-before-input-v1"))
        preferences.set("nowrift-preferences-before-input-v1", old);
      preferences.queue("nowrift-preferences-v1", JSON.stringify(next));
      set({ ...next, warning: "" });
    } catch {
      set({
        ...next,
        warning:
          "Preferences work for this session; browser storage is unavailable.",
      });
    }
  },
  load() {
    try {
      const raw = preferences.get("nowrift-preferences-v1");
      let mappingWarning = "";
      const parsed = raw ? JSON.parse(raw) : null;
      if (
        parsed &&
        "keymap" in parsed &&
        (!validKeymap(parsed.keymap) ||
          !validInputPreferences({
            keyboard: parsed.keyboard ?? "both",
            keymap: parsed.keymap,
          }))
      ) {
        // Preserve the original raw value; recover only the new mapping, not audio/display preferences.
        delete parsed.keymap;
        if (parsed.keyboard === "custom") parsed.keyboard = "both";
        mappingWarning =
          "Saved key bindings could not be read. Other preferences were retained; the original data was preserved.";
      }
      const next = raw
        ? parsePreferences(parsed)
        : {
            ...defaults,
            reducedEffects:
              typeof matchMedia !== "undefined" &&
              matchMedia("(prefers-reduced-motion: reduce)").matches,
          };
      set({ ...next, rebinding: false, warning: mappingWarning });
    } catch {
      set({
        ...defaults,
        warning:
          "Saved preferences could not be read; defaults are in use. Saved data was preserved.",
      });
    }
  },
}));
