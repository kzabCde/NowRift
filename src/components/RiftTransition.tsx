"use client";
import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/state/settings";
import { useI18n } from "@/i18n/useI18n";
import { DialogSurface } from "./GameUi";
/** Decoration has a finite duration; the real loader and scene-ready event gate reveal. */
export default function RiftTransition({
  progress,
  ready,
  error,
  onReveal,
  onRetry,
  onBack,
  returning = false,
  home = false,
}: {
  progress: number;
  ready: boolean;
  error?: string;
  onReveal: () => void;
  onRetry: () => void;
  onBack: () => void;
  returning?: boolean;
  home?: boolean;
}) {
  const { t, text } = useI18n(),
    reduced = useSettings((s) => s.reducedEffects),
    quality = useSettings((s) => s.quality),
    [phase, setPhase] = useState("fade");
  const started = useRef(Date.now()),
    reveal = useRef(onReveal);
  reveal.current = onReveal;
  useEffect(() => {
    const id = setTimeout(() => setPhase("forming"), reduced ? 0 : 180);
    return () => clearTimeout(id);
  }, [reduced]);
  useEffect(() => {
    if (!ready || error) return;
    const id = setTimeout(
      () => {
        setPhase("crossing");
      },
      Math.max(0, (reduced ? 0 : 1150) - (Date.now() - started.current)),
    );
    return () => clearTimeout(id);
  }, [ready, error, reduced]);
  useEffect(() => {
    if (phase !== "crossing" || error || !ready) return;
    const id = setTimeout(() => reveal.current(), reduced ? 80 : 480);
    return () => clearTimeout(id);
  }, [phase, error, ready, reduced]);
  return (
    <DialogSurface
      title={t("journey", "Crossing the Rift…")}
      className={`rift-transition haven-loading ${reduced ? "rift-reduced" : ""} rift-${phase} rift-${quality}`}
    >
      <div data-testid="rift-transition" aria-busy={!ready}>
        <div className="rift-art" aria-hidden="true">
          <span className="rift-island island-one" />
          <span className="rift-island island-two" />
          <div className="rift-portal">
            <span />
          </div>
          <div className="rift-fragments">
            {Array.from(
              { length: quality === "low" || reduced ? 6 : 14 },
              (_, n) => (
                <i
                  key={n}
                  style={
                    {
                      "--i": n,
                      "--x": `${16 + ((n * 31) % 72)}%`,
                      "--y": `${10 + ((n * 23) % 78)}%`,
                    } as React.CSSProperties
                  }
                />
              ),
            )}
          </div>
        </div>
        <div className="rift-copy" role={error ? "alert" : "status"}>
          <span className="eyebrow">NOWRIFT</span>
          <h2>
            {t(
              "journey",
              error
                ? "The rift could not open."
                : phase === "crossing"
                  ? "Your journey begins."
                  : returning
                    ? "Opening the way home…"
                    : "Crossing the Rift…",
            )}
          </h2>
          <p>
            {error
              ? text(error)
              : t(
                  "journey",
                  ready
                    ? "World ready"
                    : home
                      ? "Preparing Rift Heaven…"
                      : "Preparing your destination…",
                )}
          </p>
          <progress
            max={1}
            value={ready ? 1 : Math.max(0, Math.min(1, progress))}
            aria-label={t("journey", "Loading world assets")}
          />
          <small>
            {Math.round((ready ? 1 : progress) * 100)}% ·{" "}
            {t(
              "journey",
              error
                ? "Your character and saved progress are safe."
                : ready
                  ? "World ready"
                  : "Waiting for the world…",
            )}
          </small>
          {error && (
            <div className="rift-error-actions">
              <button className="primary-button" onClick={onRetry}>
                {t("journey", "Retry")}
              </button>
              <button className="quiet-button" onClick={onBack}>
                {t("journey", "Main Menu")}
              </button>
            </div>
          )}
        </div>
      </div>
    </DialogSurface>
  );
}
