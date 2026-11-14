"use client";
import { useSettings } from "@/state/settings";
import { keyHint } from "@/game/input/bindings";
import { useI18n } from "@/i18n/useI18n";

export default function HudToggle() {
  const prefs = useSettings(),
    { text } = useI18n();
  return (
    <button
      type="button"
      className="hud-toggle"
      aria-label={text(prefs.hideHud ? "Show HUD" : "Hide HUD")}
      aria-pressed={prefs.hideHud}
      onClick={() => prefs.set({ hideHud: !prefs.hideHud })}
    >
      <span aria-hidden="true">{prefs.hideHud ? "◉" : "◌"}</span>{" "}
      {text(prefs.hideHud ? "Show HUD" : "Hide HUD")}{" "}
      <kbd>{keyHint(prefs, "hud")}</kbd>
    </button>
  );
}
