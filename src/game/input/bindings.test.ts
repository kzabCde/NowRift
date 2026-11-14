import { afterEach, expect, test, vi } from "vitest";
import {
  ACTION_NAMES,
  DEFAULT_KEYMAP,
  INPUT_ACTIONS,
  actionForCode,
  allowedCode,
  codesFor,
  keyHint,
  proposeBinding,
  validKeymap,
  validInputPreferences,
} from "./bindings";
import { defaults, parsePreferences, useSettings } from "../../state/settings";
import { preferences } from "../persistence/preferences";

afterEach(() => {
  preferences.flush();
  useSettings.setState({ ...defaults, rebinding: false });
  vi.unstubAllGlobals();
});
test("legacy presets and all twelve actions resolve through the same physical-code mapping", () => {
  const both = parsePreferences({
    keyboard: "both",
    music: 0.12,
    fullscreen: true,
  });
  expect(codesFor(both, "up")).toEqual(["KeyW", "ArrowUp"]);
  expect(actionForCode(both, "KeyM")).toBe("map");
  expect(
    actionForCode(parsePreferences({ keyboard: "arrows" }), "KeyW"),
  ).toBeUndefined();
  expect(
    actionForCode(parsePreferences({ keyboard: "wasd" }), "ArrowUp"),
  ).toBeUndefined();
  expect(both).toMatchObject({
    music: 0.12,
    fullscreen: true,
    hideHud: false,
    keymap: DEFAULT_KEYMAP,
  });
  expect(
    INPUT_ACTIONS.every((a) => ACTION_NAMES[a] && codesFor(both, a).length),
  ).toBe(true);
  expect(validInputPreferences(both)).toBe(true);
});
test("a conflict is a nonmutating swap proposal; reset can restore the same pair deliberately", () => {
  const original = structuredClone(defaults),
    proposal = proposeBinding(original, "map", "KeyW");
  expect(proposal.conflict).toBe("up");
  expect(original).toEqual(defaults);
  const custom = {
    ...original,
    keyboard: "custom" as const,
    keymap: proposal.keymap,
  };
  expect(actionForCode(custom, "KeyW")).toBe("map");
  expect(actionForCode(custom, "KeyM")).toBe("up");
  expect(actionForCode(custom, "ArrowUp")).toBeUndefined();
  const reset = proposeBinding(custom, "map", DEFAULT_KEYMAP.keys.map);
  expect(reset.conflict).toBe("up");
  expect(reset.keymap.keys).toEqual(DEFAULT_KEYMAP.keys);
  expect(validKeymap(proposal.keymap)).toBe(true);
});
test("captured keyboard-layout labels never replace physical binding identity; Escape remains emergency pause", () => {
  let custom = {
    ...defaults,
    keyboard: "custom" as const,
    keymap: proposeBinding(defaults, "map", "KeyK", "ก").keymap,
  };
  expect(keyHint(custom, "map")).toBe("ก");
  expect(actionForCode(custom, "KeyK")).toBe("map");
  expect(actionForCode(custom, "ก")).toBeUndefined();
  custom = {
    ...custom,
    keymap: proposeBinding(custom, "pause", "KeyP").keymap,
  };
  expect(actionForCode(custom, "Escape")).toBe("pause");
  expect(actionForCode(custom, "KeyP")).toBe("pause");
});
test("reserved/browser keys, duplicate bindings and unknown mapping versions reject", () => {
  for (const code of [
    "Tab",
    "F5",
    "F11",
    "F12",
    "ControlLeft",
    "MetaLeft",
    "Unidentified",
  ])
    expect(allowedCode(code, "map")).toBe(false);
  expect(() => proposeBinding(defaults, "map", "Escape")).toThrow("reserved");
  expect(validKeymap({ ...DEFAULT_KEYMAP, version: 2 })).toBe(false);
  expect(
    validKeymap({
      ...DEFAULT_KEYMAP,
      keys: { ...DEFAULT_KEYMAP.keys, map: "KeyI" },
    }),
  ).toBe(false);
  const arrowMap = proposeBinding(defaults, "map", "ArrowUp").keymap;
  expect(() =>
    parsePreferences({ ...defaults, keyboard: "both", keymap: arrowMap }),
  ).toThrow("Conflicting");
});
test("device preference migration preserves audio/display, backs up the original and excludes capture state", () => {
  const raw = JSON.stringify({
      keyboard: "arrows",
      music: 0.12,
      master: 0.32,
      quality: "high",
      fullscreen: true,
    }),
    memory = new Map([["nowrift-preferences-v1", raw]]);
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => memory.set(k, v),
    removeItem: (k: string) => memory.delete(k),
  });
  useSettings.getState().load();
  const before = useSettings.getState();
  expect(before).toMatchObject({
    keyboard: "arrows",
    music: 0.12,
    master: 0.32,
    quality: "high",
    fullscreen: true,
  });
  useSettings.getState().setRebinding(true);
  useSettings.getState().set({
    keyboard: "custom",
    keymap: proposeBinding(before, "map", "KeyK").keymap,
  });
  preferences.flush();
  expect(memory.get("nowrift-preferences-before-input-v1")).toBe(raw);
  const saved = JSON.parse(memory.get("nowrift-preferences-v1")!);
  expect(saved).toMatchObject({
    music: 0.12,
    master: 0.32,
    quality: "high",
    fullscreen: true,
    keymap: { version: 1, keys: { up: "ArrowUp", map: "KeyK" } },
  });
  expect(saved.rebinding).toBeUndefined();
});
test("a corrupt new mapping preserves valid older preferences and keeps the original bytes", () => {
  const raw = JSON.stringify({
      master: 0.2,
      fullscreen: true,
      keyboard: "custom",
      keymap: { version: 99 },
    }),
    memory = new Map([["nowrift-preferences-v1", raw]]);
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => memory.set(k, v),
  });
  useSettings.getState().load();
  expect(useSettings.getState()).toMatchObject({
    master: 0.2,
    fullscreen: true,
    keyboard: "both",
    keymap: DEFAULT_KEYMAP,
  });
  expect(useSettings.getState().warning).toContain(
    "Other preferences were retained",
  );
  expect(memory.get("nowrift-preferences-v1")).toBe(raw);
});

test("valid but conflicting preset aliases recover only the key mapping", () => {
  const raw = JSON.stringify({
      master: 0.18,
      music: 0.13,
      keyboard: "both",
      keymap: proposeBinding(defaults, "map", "ArrowUp").keymap,
    }),
    memory = new Map([["nowrift-preferences-v1", raw]]);
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => memory.set(k, v),
  });
  useSettings.getState().load();
  expect(useSettings.getState()).toMatchObject({
    master: 0.18,
    music: 0.13,
    keyboard: "both",
    keymap: DEFAULT_KEYMAP,
  });
  expect(useSettings.getState().warning).toContain(
    "Other preferences were retained",
  );
  expect(memory.get("nowrift-preferences-v1")).toBe(raw);
});
