import { afterEach, expect, test, vi } from "vitest";
import { useSettings } from "./settings";
afterEach(() => vi.unstubAllGlobals());
test("unrecognized stored fields cannot overwrite store actions", () => {
  vi.stubGlobal("localStorage", {
    getItem: () =>
      JSON.stringify({
        reducedEffects: true,
        zoom: 0.85,
        set: "broken",
        load: "broken",
      }),
  });
  useSettings.getState().load();
  expect(useSettings.getState().zoom).toBe(0.85);
  expect(typeof useSettings.getState().set).toBe("function");
  expect(typeof useSettings.getState().load).toBe("function");
});
test("unreadable storage falls back without resetting original storage", () => {
  const setItem = vi.fn();
  vi.stubGlobal("localStorage", { getItem: () => "{broken", setItem });
  useSettings.getState().load();
  expect(useSettings.getState().zoom).toBe(1);
  expect(useSettings.getState().warning).toContain("preserved");
  expect(setItem).not.toHaveBeenCalled();
});
