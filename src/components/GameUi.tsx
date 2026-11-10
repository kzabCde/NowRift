"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useSettings } from "@/state/settings";
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
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose?: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = ref.current;
    element?.querySelector<HTMLElement>("button,select,input")?.focus();
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
  return (
    <div className="modal-shade">
      <div
        ref={ref}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {onClose && (
          <button
            className="modal-close"
            onClick={onClose}
            aria-label={`Close ${title}`}
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
  const prefs = useSettings();
  return (
    <Modal title="Settings" onClose={onClose}>
      <span className="eyebrow">MAKE YOURSELF AT HOME</span>
      <h2>Settings</h2>
      <label className="setting-row">
        <span>
          Reduced effects<small>Less camera shake and fewer particles</small>
        </span>
        <input
          type="checkbox"
          checked={prefs.reducedEffects}
          onChange={(e) => prefs.set({ reducedEffects: e.target.checked })}
        />
      </label>
      <label className="setting-row">
        <span>
          Camera scale<small>Adjust character and world size</small>
        </span>
        <select
          value={prefs.zoom}
          onChange={(e) => prefs.set({ zoom: Number(e.target.value) })}
        >
          <option value="0.85">Wide</option>
          <option value="1">Balanced</option>
          <option value="1.15">Close</option>
        </select>
      </label>
      <p className="muted">
        Preferences are stored on this browser. Active runs remain in memory.
      </p>
      {prefs.warning && (
        <p role="status" className="notice">
          {prefs.warning}
        </p>
      )}
      <button className="primary-button" onClick={onClose} type="button">
        DONE
      </button>
    </Modal>
  );
}
export function Brand() {
  return (
    <div className="wordmark">
      <span className="brand-rune" aria-hidden="true">
        N
      </span>
      <span>
        NOW<span className="gold">RIFT</span>
        <small>A WORLD BETWEEN WORLDS</small>
      </span>
    </div>
  );
}
export const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
