"use client";
import { COMBAT_SPEEDS, type CombatSpeed } from "@/game/simulation-clock";
import { keyHint } from "@/game/input/bindings";
import { useSettings } from "@/state/settings";
import { useI18n } from "@/i18n/useI18n";

export default function CombatSpeedControl({
  speed,
  disabled,
  onChange,
}: {
  speed: CombatSpeed;
  disabled: boolean;
  onChange: (speed: CombatSpeed) => void;
}) {
  const { t } = useI18n(),
    prefs = useSettings();
  return (
    <div
      className="combat-speed"
      role="group"
      aria-label={t("qol", "Combat speed")}
    >
      <span>
        {t("qol", "Combat speed")} <kbd>{keyHint(prefs, "speed")}</kbd>
      </span>
      <div>
        {COMBAT_SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            aria-label={t("qol", "Combat speed {speed}x", { speed: value })}
            aria-pressed={speed === value}
            disabled={disabled}
            onClick={() => onChange(value)}
          >
            {value}×
          </button>
        ))}
      </div>
    </div>
  );
}
