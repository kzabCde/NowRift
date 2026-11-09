"use client";

import { useEffect, useState } from "react";
import NowRiftGame from "@/components/NowRiftGame";
import PwaControls from "@/components/PwaControls";

type Screen = "gateway" | "lobby" | "game";

const BEST_SCORE_KEY = "nowrift-phase1-best-kills";

function RiftMark() {
  return (
    <span className="nr-mark" aria-hidden="true">
      <span className="nr-mark-core">N</span>
      <span className="nr-mark-star">✦</span>
    </span>
  );
}

function Brand() {
  return (
    <span className="nr-brand">
      <RiftMark />
      <span className="nr-brand-word">NOW<span>RIFT</span><small>BEYOND THE BREACH</small></span>
    </span>
  );
}

function RiftVisual({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "nr-visual nr-visual-compact" : "nr-visual"} aria-hidden="true">
      <div className="nr-visual-halo nr-visual-halo-outer" />
      <div className="nr-visual-halo nr-visual-halo-middle" />
      <div className="nr-visual-halo nr-visual-halo-inner" />
      <div className="nr-visual-orbit nr-visual-orbit-one" />
      <div className="nr-visual-orbit nr-visual-orbit-two" />
      <div className="nr-visual-rift">
        <div className="nr-visual-rift-core" />
        <span className="nr-visual-rune">✧</span>
      </div>
      <span className="nr-visual-label nr-visual-label-one">NR–001 // ALPHA</span>
      <span className="nr-visual-label nr-visual-label-two">RIFT STABILITY 74%</span>
      <span className="nr-visual-corner nr-visual-corner-tl" />
      <span className="nr-visual-corner nr-visual-corner-br" />
    </div>
  );
}

function LockedModule({ number, name, note }: { number: string; name: string; note: string }) {
  return (
    <div className="nr-locked-module" aria-disabled="true">
      <span className="nr-module-number">{number}</span>
      <div>
        <strong>{name}</strong>
        <small>{note}</small>
      </div>
      <span className="nr-locked-pill"><span aria-hidden="true">◇</span> SOON</span>
    </div>
  );
}

export default function NowRiftMainMenu() {
  const [screen, setScreen] = useState<Screen>("gateway");
  const [bestKills, setBestKills] = useState(0);
  const [controlsOpen, setControlsOpen] = useState(false);

  useEffect(() => {
    if (screen !== "lobby") return;
    try {
      const saved = Number(window.localStorage.getItem(BEST_SCORE_KEY));
      setBestKills(Number.isFinite(saved) ? Math.max(0, Math.floor(saved)) : 0);
    } catch {
      setBestKills(0);
    }
  }, [screen]);

  useEffect(() => {
    if (!controlsOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setControlsOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [controlsOpen]);

  if (screen === "game") {
    return <NowRiftGame autoStart onExitToMenu={() => setScreen("lobby")} />;
  }

  return (
    <main className="nr-main">
      <div className="nr-backdrop-grid" aria-hidden="true" />
      <div className="nr-ambient-light" aria-hidden="true" />
      <header className="nr-topbar">
        <Brand />
        <div className="nr-top-actions">
          <span className="nr-build-badge"><span className="nr-status-dot" /> PRE-ALPHA / v0.1</span>
          <PwaControls />
        </div>
      </header>

      {screen === "gateway" ? (
        <div className="nr-gateway">
          <section className="nr-gateway-copy">
            <div className="nr-kicker"><span /> THE WORLD BETWEEN WORLDS</div>
            <h1 className="nr-gateway-title">NOW<span>RIFT</span><b>.</b></h1>
            <p className="nr-gateway-tagline">ONE LIFE. INFINITE POSSIBILITIES.</p>
            <p className="nr-gateway-description">
              Fight against the endless breach. Collect power, evolve your build and survive as long as you can.
              Your journey begins here.
            </p>

            <div className="nr-entry-box" aria-label="Choose how to enter NowRift">
              <div className="nr-entry-top">
                <span>SELECT ACCESS MODE</span>
                <span>01 / 01 AVAILABLE</span>
              </div>
              <button type="button" className="nr-guest-option" onClick={() => setScreen("lobby")}>
                <span className="nr-guest-symbol" aria-hidden="true">◈</span>
                <span className="nr-guest-copy">
                  <strong>CONTINUE AS GUEST</strong>
                  <small>No account required · Jump straight into the demo</small>
                </span>
                <span className="nr-guest-arrow" aria-hidden="true">↗</span>
              </button>
              <div className="nr-locked-accounts" aria-label="Future account modes">
                <div><span aria-hidden="true">⌁</span> SIGN IN <small>COMING SOON</small></div>
                <div><span aria-hidden="true">＋</span> CREATE ACCOUNT <small>COMING SOON</small></div>
              </div>
              <p className="nr-entry-warning">Guest progress is not synced. Each run resets on exit; only your best kills are saved on this device.</p>
            </div>
          </section>
          <div className="nr-gateway-art">
            <RiftVisual />
            <div className="nr-art-caption"><span>SECTOR ACCESS</span><span>UNRESTRICTED // GUEST</span></div>
          </div>
        </div>
      ) : (
        <div className="nr-lobby-shell">
          <aside className="nr-sidebar" aria-label="Main menu navigation">
            <div className="nr-side-heading">NAVIGATION <span>/ 01</span></div>
            <div className="nr-nav-item nr-nav-item-current"><span className="nr-nav-glyph">▰</span><strong>PLAY</strong><span className="nr-side-current">ACTIVE</span></div>
            <div className="nr-nav-item nr-nav-item-locked" aria-disabled="true"><span className="nr-nav-glyph">◇</span><span>CHARACTER</span><small>SOON</small></div>
            <div className="nr-nav-item nr-nav-item-locked" aria-disabled="true"><span className="nr-nav-glyph">▦</span><span>INVENTORY</span><small>SOON</small></div>
            <div className="nr-nav-item nr-nav-item-locked" aria-disabled="true"><span className="nr-nav-glyph">⬡</span><span>UPGRADES</span><small>SOON</small></div>
            <div className="nr-nav-item nr-nav-item-locked" aria-disabled="true"><span className="nr-nav-glyph">◎</span><span>SOCIAL / PVP</span><small>SOON</small></div>
            <div className="nr-side-footer">
              <span>SESSION</span>
              <div className="nr-side-profile"><span className="nr-avatar-mini">G</span><div><strong>GUEST</strong><small>LOCAL SESSION</small></div></div>
              <button type="button" className="nr-exit-guest" onClick={() => setScreen("gateway")}>← CHANGE MODE</button>
            </div>
          </aside>

          <div className="nr-lobby-main">
            <div className="nr-lobby-heading">
              <div><div className="nr-kicker"><span /> WELCOME TO THE RIFT</div><h1>THE <em>HUB.</em></h1><p>Choose your next move. For now, one arena is open.</p></div>
              <span className="nr-guest-status"><span className="nr-status-dot" /> GUEST SESSION</span>
            </div>

            <section className="nr-play-panel" aria-labelledby="nr-play-title">
              <div className="nr-play-copy">
                <span className="nr-panel-label">AVAILABLE GAME MODE <span>01 / 01</span></span>
                <div className="nr-live-line"><span className="nr-status-dot" /> SOLO SURVIVAL <small>PLAYABLE NOW</small></div>
                <h2 id="nr-play-title">ENTER THE<br /><span>BREACH.</span></h2>
                <p>Survive relentless waves, auto-attack incoming enemies, collect XP and select new abilities every level.</p>
                <div className="nr-play-chips"><span>◈ 1 ARENA</span><span>✦ AUTO COMBAT</span><span>∞ ENDLESS WAVES</span></div>
                <button className="nr-start-button" type="button" onClick={() => setScreen("game")}>
                  <span>START NEW RUN</span><span aria-hidden="true">↗</span>
                </button>
                <button type="button" className="nr-controls-button" onClick={() => setControlsOpen(true)}>▧ VIEW CONTROLS & HOW TO PLAY</button>
              </div>
              <div className="nr-play-art"><RiftVisual compact /><span>SECTOR 01 <b>—</b> THE BREACH</span></div>
            </section>

            <div className="nr-lobby-bottom">
              <section className="nr-account-panel" aria-label="Guest record">
                <div className="nr-card-heading"><span>PLAYER PROFILE</span><span className="nr-card-live">● ACTIVE</span></div>
                <div className="nr-account-profile">
                  <span className="nr-avatar-large">G<span>✦</span></span>
                  <div><h3>GUEST EXPLORER</h3><p>Temporary session · No account</p></div>
                </div>
                <div className="nr-record"><span>YOUR BEST RUN</span><strong>{String(bestKills).padStart(3, "0")} <small>KILLS</small></strong></div>
                <p className="nr-profile-footnote">Stored only on this browser. No cloud save or cross-device syncing.</p>
              </section>
              <section className="nr-future-panel" aria-label="Upcoming systems">
                <div className="nr-card-heading"><span>UPCOMING SYSTEMS</span><span>ROADMAP</span></div>
                <LockedModule number="02" name="STAGES & BOSSES" note="Maps, enemy variety and stage progression" />
                <LockedModule number="03" name="CHARACTER & EQUIPMENT" note="Builds, gear, inventory and loot farming" />
                <LockedModule number="04" name="PERSISTENT WORLD" note="Accounts, friends, trading and PvP" />
              </section>
            </div>
          </div>
        </div>
      )}

      <footer className="nr-footer"><span>© NOWRIFT — PRE-ALPHA</span><span>NO DATABASE / SINGLE PLAYER</span><span>BUILD 0.1.0</span></footer>
      {controlsOpen && (
        <div className="nr-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setControlsOpen(false);
        }}>
          <section className="nr-how-modal" role="dialog" aria-modal="true" aria-labelledby="nr-how-title">
            <button className="nr-modal-close" type="button" aria-label="Close controls" onClick={() => setControlsOpen(false)}>✕</button>
            <div className="nr-kicker"><span /> FIELD MANUAL</div>
            <h2 id="nr-how-title">HOW TO <em>SURVIVE.</em></h2>
            <div className="nr-how-row"><strong>MOVE</strong><span>WASD / ARROW KEYS or drag on the arena with your finger</span></div>
            <div className="nr-how-row"><strong>ATTACK</strong><span>Your weapon automatically fires at nearby enemies</span></div>
            <div className="nr-how-row"><strong>EVOLVE</strong><span>Collect dropped XP and choose one upgrade when you level up</span></div>
            <div className="nr-how-row"><strong>PAUSE</strong><span>Tap Pause or press Escape; use Focus mode for more screen space</span></div>
            <div className="nr-how-row"><strong>RECORD</strong><span>Best kills stay in this browser; the current run resets on exit</span></div>
            <button className="nr-start-button" type="button" onClick={() => {
              setControlsOpen(false);
              setScreen("game");
            }}>START NEW RUN <span aria-hidden="true">↗</span></button>
          </section>
        </div>
      )}
    </main>
  );
}
