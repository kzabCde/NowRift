"use client";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "@/i18n/useI18n";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { audio } from "@/game/audio/engine";
import { QUALITY, useSettings } from "@/state/settings";
export function PixelIcon({
  index = 0,
  large = false,
}: {
  index?: number;
  large?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={large ? "pixel-icon large" : "pixel-icon"}
      style={{ backgroundPosition: `-${index * (large ? 48 : 32)}px 0` }}
    />
  );
}
function useDialogFocus(onClose?: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = ref.current;
    element
      ?.querySelector<HTMLElement>("button:not(:disabled),select,input")
      ?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        if (onClose) {
          event.preventDefault();
          onClose();
        }
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = Array.from(
        element?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),select,input,[tabindex="0"]',
        ) ?? [],
      );
      if (!nodes.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap, true);
    return () => {
      document.removeEventListener("keydown", trap, true);
      previous?.focus();
    };
  }, [onClose]);
  return ref;
}
export function DialogSurface({
  children,
  title,
  className,
  onClose,
}: {
  children: ReactNode;
  title: string;
  className: string;
  onClose?: () => void;
}) {
  const ref = useDialogFocus(onClose);
  return (
    <div
      ref={ref}
      className={className}
      role="dialog"
      aria-label={title}
      aria-modal="true"
    >
      {children}
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose?: () => void;
  children: ReactNode;
}) {
  const { t, locale } = useI18n();
  const ref = useDialogFocus(onClose);
  return (
    <div className="modal-shade">
      <div
        ref={ref}
        className={`modal-panel ${(title === "Settings" || title === t("settings","Settings")) ? "settings-panel" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {onClose && (
          <button
            className="modal-close"
            onClick={onClose}
            aria-label={locale === "th" ? `ปิด ${title}` : `Close ${title}`}
            type="button"
          >
            ×
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
export function Settings({ onClose }: { onClose: () => void }) {
  const {t,text,locale} = useI18n();
  const prefs = useSettings();
  const [status, setStatus] = useState(() => audio.diagnostics());
  useEffect(() => {
    const timer = setInterval(() => setStatus(audio.diagnostics()), 500);
    return () => clearInterval(timer);
  }, []);
  return (
    <Modal title={t("settings","Settings")} onClose={onClose}>
      <span className="eyebrow">{t("settings","TUNE YOUR JOURNEY")}</span>
      <h2>{t("settings","Settings")}</h2>
      <div className="setting-row language-setting"><span>{t("settings","Language")}</span><LanguageSwitcher /></div>
      <div className="settings-columns">
        <section aria-label={t("settings","Audio settings")}>
          <h3>{t("settings","Sound & atmosphere")}</h3>
          <label className="setting-row">
            <span>{t("settings","Mute all audio")}</span>
            <input
              aria-label={t("settings","Mute all audio")}
              type="checkbox"
              checked={prefs.muted}
              onChange={(e) => prefs.set({ muted: e.target.checked })}
            />
          </label>
          {(
            [
              ["master", "Master volume"],
              ["music", "Music volume"],
              ["sfx", "Sound effect volume"],
              ["ambient", "Ambient volume"],
            ] as const
          ).map(([key, label]) => (
            <label className="volume-row" key={key}>
              <span>
                {text(label)}
                <output>{Math.round(prefs[key] * 100)}%</output>
              </span>
              <input
                aria-label={text(label)}
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={prefs[key]}
                onChange={(e) => prefs.set({ [key]: Number(e.target.value) })}
              />
            </label>
          ))}
          <label className="setting-row">
            <span>{t("settings","Audio intensity")}</span>
            <select
              aria-label={t("settings","Audio intensity")}
              value={prefs.audioIntensity}
              onChange={(e) =>
                prefs.set({
                  audioIntensity: e.target.value as typeof prefs.audioIntensity,
                })
              }
            >
              <option value="gentle">{t("settings","Gentle")}</option>
              <option value="balanced">{t("settings","Balanced")}</option>
              <option value="full">{t("settings","Full")}</option>
            </select>
          </label>
          <button
            className="action-button"
            data-silent="true"
            type="button"
            onClick={() => {
              void audio.unlock().then(() => audio.play("confirm"));
            }}
          >{t("settings","TEST SOUND")}{" "}</button>
          <p className="audio-status" role="status">
            {text(status.error) ||
              (status.context === "locked"
                ? t("settings","Tap a button to enable audio.")
                : (locale === "th" ? `เสียง: ${status.context} · ${t("settings","Original procedural soundscape")}` : `Audio ${status.context} · Original procedural soundscape`))}
          </p>
        </section>
        <section aria-label={t("settings","Visual settings")}>
          <h3>{t("settings","Light & motion")}</h3>
          <label className="setting-row">
            <span>{t("settings","Graphics quality")}</span>
            <select
              aria-label={t("settings","Graphics quality")}
              value={prefs.quality}
              onChange={(e) => {
                const quality = e.target.value as typeof prefs.quality;
                prefs.set({ quality, ...QUALITY[quality] });
              }}
            >
              <option value="low">{t("settings","Low · battery saver")}</option>
              <option value="medium">{t("settings","Medium")}</option>
              <option value="high">{t("settings","High")}</option>
            </select>
          </label>
          <label className="setting-row">
            <span>{t("settings","Reduced effects")}{" "}<small>{t("settings","Still motion, fewer particles, no shake")}</small>
            </span>
            <input
              aria-label={t("settings","Reduced effects")}
              type="checkbox"
              checked={prefs.reducedEffects}
              onChange={(e) => prefs.set({ reducedEffects: e.target.checked })}
            />
          </label>
          {(
            [
              ["particles", "Particle density"],
              ["glow", "Glow strength"],
              ["shake", "Screen shake"],
            ] as const
          ).map(([key, label]) => (
            <label className="volume-row" key={key}>
              <span>
                {text(label)}
                <output>{Math.round(prefs[key] * 100)}%</output>
              </span>
              <input
                aria-label={text(label)}
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={prefs[key]}
                onChange={(e) => prefs.set({ [key]: Number(e.target.value) })}
              />
            </label>
          ))}
          <label className="setting-row">
            <span>{t("settings","Damage numbers")}</span>
            <select
              aria-label={t("settings","Damage numbers")}
              value={prefs.damageNumbers}
              onChange={(e) =>
                prefs.set({
                  damageNumbers: e.target.value as typeof prefs.damageNumbers,
                })
              }
            >
              <option value="all">{t("settings","All")}</option>
              <option value="sparse">{t("settings","Sparse")}</option>
              <option value="off">{t("settings","Off")}</option>
            </select>
          </label>
          <label className="setting-row">
            <span>{t("settings","Camera scale")}</span>
            <select
              aria-label={t("settings","Camera scale")}
              value={prefs.zoom}
              onChange={(e) => prefs.set({ zoom: Number(e.target.value) })}
            >
              <option value="0.85">{t("settings","Wide")}</option>
              <option value="1">{t("settings","Balanced")}</option>
              <option value="1.15">{t("settings","Close")}</option>
            </select>
          </label>
        </section>
      </div>
      <p className="muted">{t("settings","Saved on this browser. Attack warnings remain visible at every quality setting. Music and effects are original procedural synthesis.")}{" "}</p>
      {prefs.warning && (
        <p role="status" className="notice">
          {text(prefs.warning)}
        </p>
      )}
      <button className="primary-button" onClick={onClose} type="button">{t("settings","DONE")}{" "}</button>
    </Modal>
  );
}
export function Brand() {
  const { t } = useI18n();
  return (
    <div className="wordmark">
      <span className="brand-rune" aria-hidden="true">
        N
      </span>
      <span>
        NOW<span className="gold">RIFT</span>
        <small>{t("settings","A WORLD BETWEEN WORLDS")}</small>
      </span>
    </div>
  );
}
export const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
