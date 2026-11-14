"use client";
import { useEffect, useRef } from "react";
import { useSettings } from "@/state/settings";
import {
  actionForCode,
  movementAction,
  type InputAction,
} from "@/game/input/bindings";
import { keyboardEventAllowed } from "@/game/input/keyboard";

export function useGameplayShortcuts(
  handler: (action: InputAction, event: KeyboardEvent) => boolean,
) {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const prefs = useSettings.getState();
      if (
        prefs.rebinding ||
        document.hidden ||
        event.repeat ||
        !keyboardEventAllowed(event)
      )
        return;
      const action = actionForCode(prefs, event.code);
      if (!action || movementAction(action) || action === "interact") return;
      if (latest.current(action, event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, []);
}
