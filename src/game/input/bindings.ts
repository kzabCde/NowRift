export const INPUT_ACTIONS = [
  "up",
  "down",
  "left",
  "right",
  "interact",
  "inventory",
  "map",
  "journal",
  "sanctuary",
  "pause",
  "hud",
  "speed",
] as const;
export type InputAction = (typeof INPUT_ACTIONS)[number];
export type KeyboardPreset = "both" | "wasd" | "arrows" | "custom";
export type Keymap = {
  version: 1;
  keys: Record<InputAction, string>;
  labels?: Record<string, string>;
};
export type InputPreferences = { keyboard: KeyboardPreset; keymap: Keymap };
export const DEFAULT_KEYMAP: Keymap = {
  version: 1,
  keys: {
    up: "KeyW",
    down: "KeyS",
    left: "KeyA",
    right: "KeyD",
    interact: "KeyE",
    inventory: "KeyI",
    map: "KeyM",
    journal: "KeyQ",
    sanctuary: "KeyH",
    pause: "Escape",
    hud: "KeyV",
    speed: "KeyT",
  },
};
export const ACTION_NAMES: Record<InputAction, string> = {
  up: "Move up",
  down: "Move down",
  left: "Move left",
  right: "Move right",
  interact: "Interact",
  inventory: "Inventory",
  map: "Full map",
  journal: "Quest journal",
  sanctuary: "Sanctuary",
  pause: "Pause / back",
  hud: "Hide / show HUD",
  speed: "Cycle battle speed",
};
const MOVEMENT = {
  up: ["KeyW", "ArrowUp"],
  down: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
} as const;
export const movementAction = (
  action: InputAction,
): action is keyof typeof MOVEMENT => action in MOVEMENT;
export function allowedCode(code: string, action: InputAction) {
  if (code === "Escape") return action === "pause";
  return /^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Enter|F[236789]|F10|BracketLeft|BracketRight|Semicolon|Quote|Backslash|Comma|Period|Slash|Backquote|Minus|Equal|Numpad[0-9]|Numpad(Add|Subtract|Multiply|Divide|Decimal|Enter))$/.test(
    code,
  );
}
export function validKeymap(value: unknown): value is Keymap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const m = value as Keymap;
  return (
    m.version === 1 &&
    !!m.keys &&
    typeof m.keys === "object" &&
    !Array.isArray(m.keys) &&
    Object.keys(m.keys).length === INPUT_ACTIONS.length &&
    INPUT_ACTIONS.every(
      (a) => typeof m.keys[a] === "string" && allowedCode(m.keys[a], a),
    ) &&
    new Set(Object.values(m.keys)).size === INPUT_ACTIONS.length &&
    (m.labels === undefined ||
      (!!m.labels &&
        typeof m.labels === "object" &&
        !Array.isArray(m.labels) &&
        Object.entries(m.labels).every(
          ([c, label]) =>
            Object.values(m.keys).includes(c) &&
            typeof label === "string" &&
            label.length > 0 &&
            label.length <= 24,
        )))
  );
}
export function codesFor(
  prefs: InputPreferences,
  action: InputAction,
): readonly string[] {
  if (movementAction(action) && prefs.keyboard !== "custom") {
    const pair = MOVEMENT[action];
    return prefs.keyboard === "both"
      ? pair
      : [pair[prefs.keyboard === "wasd" ? 0 : 1]];
  }
  return [prefs.keymap.keys[action]];
}
export function validInputPreferences(p: InputPreferences) {
  const codes = INPUT_ACTIONS.flatMap((a) => codesFor(p, a));
  return validKeymap(p.keymap) && new Set(codes).size === codes.length;
}
export function actionForCode(
  prefs: InputPreferences,
  code: string,
): InputAction | undefined {
  if (code === "Escape") return "pause"; // Emergency close is independent of the custom pause key.
  return INPUT_ACTIONS.find((a) => codesFor(prefs, a).includes(code));
}
export function codeLabel(code: string) {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  return (
    (
      {
        ArrowUp: "↑",
        ArrowDown: "↓",
        ArrowLeft: "←",
        ArrowRight: "→",
        Escape: "Esc",
        Space: "Space",
        BracketLeft: "[",
        BracketRight: "]",
        Semicolon: ";",
        Quote: "'",
        Backslash: "\\",
        Comma: ",",
        Period: ".",
        Slash: "/",
        Backquote: "`",
        Minus: "−",
        Equal: "=",
      } as Record<string, string>
    )[code] ?? code.replace("Numpad", "Num ")
  );
}
export function keyHint(prefs: InputPreferences, action: InputAction) {
  return codesFor(prefs, action)
    .map((c) => prefs.keymap.labels?.[c] ?? codeLabel(c))
    .join(" / ");
}
/** A conflicting assignment is a proposal until the user explicitly confirms its swap. */
export function proposeBinding(
  prefs: InputPreferences,
  action: InputAction,
  code: string,
  label?: string,
) {
  if (!allowedCode(code, action))
    throw new Error("This key is reserved for browser or focus controls.");
  const conflict = INPUT_ACTIONS.find(
    (a) => a !== action && codesFor(prefs, a).includes(code),
  );
  const keys = Object.fromEntries(
    INPUT_ACTIONS.map((a) => [a, codesFor(prefs, a)[0]]),
  ) as Keymap["keys"];
  if (conflict) keys[conflict] = keys[action];
  keys[action] = code;
  const labels = Object.fromEntries(
    Object.entries(prefs.keymap.labels ?? {}).filter(([c]) =>
      Object.values(keys).includes(c),
    ),
  );
  if (label && label.length <= 24 && !["Dead", "Unidentified"].includes(label))
    labels[code] =
      label.length === 1 ? label.toLocaleUpperCase() : codeLabel(code);
  const keymap: Keymap = {
    version: 1,
    keys,
    ...(Object.keys(labels).length ? { labels } : {}),
  };
  if (!validKeymap(keymap)) throw new Error("Invalid key mapping.");
  return { conflict, keymap };
}
