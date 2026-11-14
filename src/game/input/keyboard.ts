import {
  actionForCode,
  movementAction,
  type InputPreferences,
} from "./bindings";

export function keyboardEventAllowed(event: KeyboardEvent) {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  )
    return false;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return true;
  if (
    target.isContentEditable ||
    target.closest("input,textarea,select,[contenteditable='true']")
  )
    return false;
  return !(
    ["Enter", "Space"].includes(event.code) &&
    target.closest("button,a,[role='button']")
  );
}
export function hasModal() {
  return !!document.querySelector('[role="dialog"][aria-modal="true"]');
}
/** Delegate a rebound Back key to the same innermost dialog owner as Escape. */
export function requestModalBack() {
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      bubbles: true,
      cancelable: true,
    }),
  );
}
export function modalDepth() {
  return document.querySelectorAll('[role="dialog"][aria-modal="true"]').length;
}

/** One physical-key state per scene. React owns navigation actions; the scene owns movement/interact. */
export function attachMovementInput(options: {
  preferences: () => InputPreferences & { rebinding: boolean };
  enabled: () => boolean;
  interact: () => void;
}) {
  const held = new Set<string>();
  const clear = () => held.clear();
  const active = () =>
    options.enabled() &&
    !options.preferences().rebinding &&
    !document.hidden &&
    !hasModal();
  const down = (event: KeyboardEvent) => {
    if (event.repeat || !active() || !keyboardEventAllowed(event)) return;
    const action = actionForCode(options.preferences(), event.code);
    if (!action) return;
    if (movementAction(action)) {
      held.add(event.code);
      event.preventDefault();
    } else if (action === "interact") {
      event.preventDefault();
      event.stopImmediatePropagation();
      options.interact();
    }
  };
  const up = (event: KeyboardEvent) => held.delete(event.code);
  const visible = () => {
    if (document.hidden) clear();
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", clear);
  document.addEventListener("visibilitychange", visible);
  return {
    clear,
    axis() {
      if (!active()) {
        clear();
        return { x: 0, y: 0 };
      }
      const prefs = options.preferences(),
        pressed = (a: "up" | "down" | "left" | "right") =>
          Number(codes(prefs, a));
      function codes(p: InputPreferences, a: string) {
        return [...held].some((c) => actionForCode(p, c) === a);
      }
      return {
        x: pressed("right") - pressed("left"),
        y: pressed("down") - pressed("up"),
      };
    },
    destroy() {
      clear();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", visible);
    },
  };
}
