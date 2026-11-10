"use client";
import { useSyncExternalStore } from "react";
import { saveStatus } from "@/game/persistence/status";
import { useI18n } from "@/i18n/useI18n";
export default function SaveIndicator() {
  const status = useSyncExternalStore(
      saveStatus.subscribe,
      saveStatus.get,
      saveStatus.get,
    ),
    { text } = useI18n();
  return (
    <span
      className={`save-indicator save-${status.phase}`}
      role="status"
      aria-label={text("Save status")}
      aria-live="polite"
      title={
        status.error ||
        text(
          status.phase === "saved"
            ? "Local save confirmed on this device"
            : status.phase === "saving"
              ? "Waiting for storage confirmation"
              : "Progress is stored only on this browser",
        )
      }
    >
      <i />
      {text(
        status.phase === "saving"
          ? "Saving"
          : status.phase === "failed"
            ? "Save Failed"
            : status.phase === "saved"
              ? "Saved"
              : "Local save",
      )}
    </span>
  );
}
