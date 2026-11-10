import { create } from "zustand";
export type Preferences = { reducedEffects: boolean; zoom: number };
const defaults: Preferences = { reducedEffects: false, zoom: 1 };
export const useSettings = create<
  Preferences & {
    set: (p: Partial<Preferences>) => void;
    load: () => void;
    warning: string;
  }
>((set, get) => ({
  ...defaults,
  warning: "",
  set(p) {
    const next = {
      reducedEffects: p.reducedEffects ?? get().reducedEffects,
      zoom: p.zoom ?? get().zoom,
    };
    try {
      localStorage.setItem("nowrift-preferences-v1", JSON.stringify(next));
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
      const raw = localStorage.getItem("nowrift-preferences-v1");
      if (!raw) {
        set({
          reducedEffects: matchMedia("(prefers-reduced-motion: reduce)")
            .matches,
        });
        return;
      }
      const p = JSON.parse(raw);
      if (
        typeof p.reducedEffects !== "boolean" ||
        ![0.85, 1, 1.15].includes(p.zoom)
      )
        throw new Error();
      set({ reducedEffects: p.reducedEffects, zoom: p.zoom, warning: "" });
    } catch {
      set({
        ...defaults,
        warning:
          "Saved preferences could not be read; defaults are in use. Saved data was preserved.",
      });
    }
  },
}));
