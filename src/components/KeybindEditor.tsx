"use client";
import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/state/settings";
import {
  ACTION_NAMES,
  DEFAULT_KEYMAP,
  INPUT_ACTIONS,
  codesFor,
  keyHint,
  proposeBinding,
  type InputAction,
  type KeyboardPreset,
  type Keymap,
} from "@/game/input/bindings";
import { useI18n } from "@/i18n/useI18n";

export default function KeybindEditor() {
  const prefs = useSettings(),
    { text, t } = useI18n();
  const [capable, setCapable] = useState(false),
    [expanded, setExpanded] = useState(false),
    [capture, setCapture] = useState<InputAction | null>(null),
    [message, setMessage] = useState("");
  const [proposal, setProposal] = useState<{
      action: InputAction;
      conflict: InputAction;
      keymap: Keymap;
    } | null>(null),
    [preset, setPreset] = useState<KeyboardPreset | null>(null);
  const source = useRef<HTMLElement | null>(null),
    confirm = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const media = matchMedia("(any-pointer: fine)"),
      detect = (event: KeyboardEvent) => {
        if (event.code && event.code !== "Unidentified" && !event.isComposing)
          setCapable(true);
      },
      changed = () => {
        if (media.matches) setCapable(true);
      };
    changed();
    window.addEventListener("keydown", detect);
    media.addEventListener("change", changed);
    return () => {
      window.removeEventListener("keydown", detect);
      media.removeEventListener("change", changed);
      useSettings.getState().setRebinding(false);
    };
  }, []);
  const finish = () => {
    setCapture(null);
    setProposal(null);
    setPreset(null);
    useSettings.getState().setRebinding(false);
    requestAnimationFrame(
      () => source.current?.isConnected && source.current.focus(),
    );
  };
  const commit = (keymap: Keymap) => {
    useSettings.getState().set({ keyboard: "custom", keymap });
    setMessage("Key bindings updated.");
    finish();
  };
  useEffect(() => {
    if (proposal || preset) confirm.current?.focus();
  }, [proposal, preset]);
  useEffect(() => {
    if (!capture && !proposal && !preset) return;
    const key = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        finish();
        return;
      }
      if (!capture) return; // Confirmation buttons retain normal keyboard focus/activation.
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.repeat || event.isComposing) return;
      if (event.ctrlKey || event.altKey || event.metaKey) {
        setMessage("Use one physical key without Ctrl, Alt or Meta.");
        return;
      }
      try {
        const current = useSettings.getState();
        if (codesFor(current, capture)[0] === event.code) {
          setMessage("This action already uses that key.");
          finish();
          return;
        }
        const next = proposeBinding(current, capture, event.code, event.key);
        if (next.conflict) {
          setProposal({
            action: capture,
            conflict: next.conflict,
            keymap: next.keymap,
          });
          setCapture(null);
        } else commit(next.keymap);
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Invalid key mapping.",
        );
      }
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  });
  function assign(
    action: InputAction,
    code?: string,
    button?: HTMLButtonElement,
  ) {
    source.current = button ?? null;
    setMessage("");
    prefs.setRebinding(true);
    if (!code) {
      setCapture(action);
      return;
    }
    const next = proposeBinding(prefs, action, code);
    if (next.conflict)
      setProposal({ action, conflict: next.conflict, keymap: next.keymap });
    else commit(next.keymap);
  }
  function applyPreset(value: KeyboardPreset) {
    prefs.set({ keyboard: value, keymap: structuredClone(DEFAULT_KEYMAP) });
    setMessage("Default action keys restored.");
    finish();
  }
  if (!capable)
    return (
      <p className="controls-note">
        {text(
          "Connect a keyboard or press a physical key to customize desktop controls. Touch controls stay available.",
        )}
      </p>
    );
  return (
    <div className="keyboard-controls" aria-label={text("Desktop controls")}>
      <label className="setting-row">
        <span>{text("Keyboard controls")}</span>
        <select
          aria-label={text("Keyboard controls")}
          value={prefs.keyboard}
          disabled={!!capture || !!proposal || !!preset}
          onChange={(e) => {
            source.current = e.currentTarget;
            const value = e.target.value as KeyboardPreset;
            if (value === "custom") {
              const keys = Object.fromEntries(
                INPUT_ACTIONS.map((a) => [a, codesFor(prefs, a)[0]]),
              ) as Keymap["keys"];
              prefs.set({ keyboard: "custom", keymap: { version: 1, keys } });
            } else if (prefs.keyboard === "custom") {
              prefs.setRebinding(true);
              setPreset(value);
            } else applyPreset(value);
          }}
        >
          <option value="both">{text("WASD + arrows")}</option>
          <option value="wasd">WASD</option>
          <option value="arrows">{text("Arrow keys")}</option>
          <option value="custom">{text("Custom keys")}</option>
        </select>
      </label>
      <details
        className="keybind-details"
        open={expanded || !!capture || !!proposal || !!preset}
        onToggle={(e) => setExpanded(e.currentTarget.open)}
      >
        <summary>{text("Custom key bindings")}</summary>
        <p className="controls-note">
          {text(
            "Bindings use physical keys. Captured labels follow your keyboard layout. Presets restore default action keys.",
          )}
        </p>
        <p className="controls-note">
          {text(
            "Escape always closes dialogs. During capture, Escape cancels the binding.",
          )}
        </p>
        <div className="keybind-list">
          {INPUT_ACTIONS.map((action) => (
            <div
              className="keybind-row"
              key={action}
              data-keybind-action={action}
            >
              <span>{text(ACTION_NAMES[action])}</span>
              <kbd>{keyHint(prefs, action)}</kbd>
              <button
                type="button"
                aria-label={t("qol", "Rebind {action}", {
                  action: text(ACTION_NAMES[action]),
                })}
                disabled={!!capture || !!proposal || !!preset}
                onClick={(e) => assign(action, undefined, e.currentTarget)}
              >
                {text("Rebind")}
              </button>
              <button
                type="button"
                aria-label={t("qol", "Reset {action}", {
                  action: text(ACTION_NAMES[action]),
                })}
                disabled={!!capture || !!proposal || !!preset}
                onClick={(e) =>
                  assign(action, DEFAULT_KEYMAP.keys[action], e.currentTarget)
                }
              >
                {text("Reset")}
              </button>
            </div>
          ))}
        </div>
        {capture && (
          <div className="keybind-prompt" role="status">
            <strong>
              {t("qol", "Press a key for {action}", {
                action: text(ACTION_NAMES[capture]),
              })}
            </strong>
            <button onClick={finish}>{text("Cancel")}</button>
          </div>
        )}
        {proposal && (
          <div className="keybind-prompt" role="alert">
            <p>
              {t(
                "qol",
                "That key belongs to {action}. Swap these two bindings?",
                { action: text(ACTION_NAMES[proposal.conflict]) },
              )}
            </p>
            <button ref={confirm} onClick={() => commit(proposal.keymap)}>
              {text("Swap bindings")}
            </button>
            <button onClick={finish}>{text("Cancel")}</button>
          </div>
        )}
        {preset && (
          <div className="keybind-prompt" role="alert">
            <p>
              {text("Apply this preset and restore its default action keys?")}
            </p>
            <button ref={confirm} onClick={() => applyPreset(preset)}>
              {text("Apply preset")}
            </button>
            <button onClick={finish}>{text("Cancel")}</button>
          </div>
        )}
        <button
          className="quiet-button"
          disabled={!!capture || !!proposal || !!preset}
          onClick={() => applyPreset("both")}
        >
          {text("Restore default keys")}
        </button>
      </details>
      {message && (
        <p role="status" className="controls-note">
          {text(message)}
        </p>
      )}
    </div>
  );
}
