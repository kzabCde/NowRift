"use client";
import { useI18n } from "@/i18n/useI18n";

import { useEffect, useRef, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  const iOSStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || iOSStandalone === true;
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export default function PwaControls() {
  const {t} = useI18n();
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [offline, setOffline] = useState(false);
  const [updateWaiting, setUpdateWaiting] = useState(false);
  const waitingWorker = useRef<ServiceWorker | null>(null);
  const requestedReload = useRef(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setOffline(!navigator.onLine);

    const online = () => setOffline(false);
    const offlineEvent = () => setOffline(true);
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPrompt.current = event as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setCanInstall(false);
      setShowGuide(false);
      deferredPrompt.current = null;
    };
    const onDisplayChange = () => setInstalled(isStandalone());
    const media = window.matchMedia("(display-mode: standalone)");
    window.addEventListener("online", online);
    window.addEventListener("offline", offlineEvent);
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    media.addEventListener?.("change", onDisplayChange);

    let cancelled = false;
    const onControllerChange = () => {
      if (requestedReload.current) window.location.reload();
    };

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
      navigator.serviceWorker.register("/sw.js", { scope: "/" })
        .then(async (registration) => {
          if (cancelled) return;
          const checkForUpdate = () => {
            if (registration.waiting && navigator.serviceWorker.controller) {
              waitingWorker.current = registration.waiting;
              setUpdateWaiting(true);
            }
          };
          checkForUpdate();
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            worker?.addEventListener("statechange", checkForUpdate);
          });
          const ready = await navigator.serviceWorker.ready;
          if (cancelled) return;
          const urls = performance.getEntriesByType("resource")
            .map((resource) => resource.name)
            .filter((url) => {
              try { return new URL(url).origin === location.origin && new URL(url).pathname.startsWith("/_next/static/"); }
              catch { return false; }
            });
          ready.active?.postMessage({ type: "WARM_ASSETS", urls });
        })
        .catch(() => {
          // PWA caching is optional; live gameplay continues even if registration fails.
        });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offlineEvent);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      media.removeEventListener?.("change", onDisplayChange);
      navigator.serviceWorker?.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  async function install() {
    if (deferredPrompt.current) {
      const prompt = deferredPrompt.current;
      deferredPrompt.current = null;
      setCanInstall(false);
      await prompt.prompt();
      await prompt.userChoice;
    } else {
      setShowGuide(true);
    }
  }

  return (
    <div className="pwa-actions">
      <span className={offline ? "network-status is-offline" : "network-status"} title={offline ? t("pwa","No network connection") : t("pwa","Network connected")}>
        <span className="online-dot" />{offline ? t("pwa","OFFLINE") : t("pwa","ONLINE")}
      </span>
      {updateWaiting && (
        <button className="pwa-button update-button" type="button" onClick={() => {
          requestedReload.current = true;
          waitingWorker.current?.postMessage({ type: "SKIP_WAITING" });
        }}>{t("pwa","UPDATE ↻")}</button>
      )}
      {!installed && <button type="button" className="pwa-button" onClick={install}>⇩ <span>{canInstall ? t("pwa","INSTALL") : t("pwa","ADD TO HOME")}</span></button>}
      {installed && <span className="installed-badge">{t("pwa","✓ INSTALLED")}</span>}
      {showGuide && (
        <div className="install-modal-backdrop" onClick={() => setShowGuide(false)}>
          <div className="install-modal" role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label={t("pwa","Close install instructions")} type="button" onClick={() => setShowGuide(false)}>✕</button>
            <span className="eyebrow">{t("pwa","PWA / INSTALLATION")}</span>
            <h2 id="install-title">{t("pwa","Take NowRift with you.")}</h2>
            {isIOS() ? (
              <p>{t("pwa","Open this page in Safari, tap the")}{" "}<strong>{t("pwa","Share")}</strong>{" "}{t("pwa","icon, then select")}{" "}<strong>{t("pwa","Add to Home Screen")}</strong>{" "}{t("pwa","and confirm.")}</p>
            ) : (
              <p>{t("pwa","Open your browser menu and choose")}{" "}<strong>{t("pwa","Install app")}</strong>{" "}{t("pwa","or")}{" "}<strong>{t("pwa","Add to Home Screen")}</strong>{t("pwa",". If the option is missing, try Chrome or Edge over HTTPS.")}</p>
            )}
            <p className="install-footnote">{t("pwa","Visit once while online to cache game assets for future offline play. Progress remains on this device and active runs are not saved on exit.")}</p>
            <button className="primary-button" type="button" onClick={() => setShowGuide(false)}>{t("pwa","GOT IT")}{" "}<span>✓</span></button>
          </div>
        </div>
      )}
    </div>
  );
}
