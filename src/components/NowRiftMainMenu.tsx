"use client";
import RpgScreen from "./RpgScreen";
import WorldMap from "./WorldMap";
import type { StageSelection } from "@/game/campaign/loader";

import { useCallback, useEffect, useState } from "react";
import NowRiftGame from "./NowRiftGame";
import PwaControls from "./PwaControls";
import { Brand, Modal, PixelIcon, Settings, clock } from "./GameUi";
import { WEAPONS, type WeaponId } from "@/game/content/forest";
import { runRepository } from "@/game/services/saves";
import { BEST_SCORE_KEY, parseBestKills } from "@/game/services/metadata";
import type { RunResult } from "@/game/bridge";
import { useSettings } from "@/state/settings";
export default function NowRiftMainMenu() {
  const [screen, setScreen] = useState<
    "gateway" | "lobby" | "game" | "worlds" | "rpg"
  >("gateway");
  const [selection, setSelection] = useState<StageSelection | undefined>();
  const [weapon, setWeapon] = useState<WeaponId>("arcane"),
    [controls, setControls] = useState(false),
    [settings, setSettings] = useState(false),
    [history, setHistory] = useState(false);
  const [runs, setRuns] = useState<RunResult[]>([]),
    [best, setBest] = useState(0),
    [warning, setWarning] = useState("");
  const closeControls = useCallback(() => setControls(false), []),
    closeSettings = useCallback(() => setSettings(false), []),
    closeHistory = useCallback(() => setHistory(false), []);
  useEffect(() => {
    useSettings.getState().load();
    // Warm browser-only async gameplay chunks as well as the initial app shell.
    import("@/game/phaser/create-game")
      .then(async () => {
        if (
          process.env.NODE_ENV !== "production" ||
          !("serviceWorker" in navigator)
        )
          return;
        const ready = await navigator.serviceWorker.ready;
        const urls = performance
          .getEntriesByType("resource")
          .map((r) => r.name)
          .filter(
            (url) =>
              new URL(url).origin === location.origin &&
              new URL(url).pathname.startsWith("/_next/static/"),
          );
        ready.active?.postMessage({ type: "WARM_ASSETS", urls });
      })
      .catch(() => {
        /* PhaserHost reports a failed load if the player starts a run. */
      });
  }, []);
  useEffect(() => {
    if (screen !== "lobby") return;
    let cancelled = false;
    runRepository
      .list()
      .then((r) => {
        if (!cancelled) setRuns(r);
      })
      .catch((e) => {
        if (!cancelled)
          setWarning(
            e instanceof Error
              ? e.message
              : "Local records are unavailable; gameplay still works.",
          );
      });
    try {
      setBest(parseBestKills(localStorage.getItem(BEST_SCORE_KEY)));
    } catch {
      setWarning(
        "Browser storage is unavailable. Runs remain playable without saving.",
      );
    }
    return () => {
      cancelled = true;
    };
  }, [screen]);
  if (screen === "rpg")
    return <RpgScreen weapon={weapon} onBack={() => setScreen("lobby")} />;
  if (screen === "worlds")
    return (
      <main className="nr-main">
        <header className="topbar">
          <Brand />
        </header>
        <WorldMap
          weapon={weapon}
          onBack={() => setScreen("lobby")}
          onStart={(s) => {
            setSelection(s);
            setScreen("game");
          }}
        />
      </main>
    );
  if (screen === "game")
    return (
      <NowRiftGame
        autoStart
        stage={selection}
        weapon={weapon}
        onExitToMenu={() => setScreen("lobby")}
      />
    );
  return (
    <main className="nr-main">
      <header className="topbar">
        <Brand />
        <div className="header-right">
          <span className="build-tag">
            PHASE III <span>·</span> LOCAL ADVENTURE
          </span>
          <PwaControls />
          <button
            className="quiet-button"
            aria-label="Settings"
            onClick={() => setSettings(true)}
            type="button"
          >
            SETTINGS
          </button>
        </div>
      </header>
      {screen === "gateway" ? (
        <div className="gateway">
          <div className="gateway-art" aria-hidden="true" />
          <div className="gateway-content">
            <span className="eyebrow">
              <span className="eyebrow-rule" /> A LIGHT IN THE FORGOTTEN WOODS
            </span>
            <h1>
              Beyond the breach.
              <br />
              <em>Into the unknown.</em>
            </h1>
            <p>
              An ancient forest. A thousand restless souls.
              <br />
              One wanderer standing between worlds.
            </p>
            <button
              className="primary-button gateway-enter"
              onClick={() => setScreen("lobby")}
              type="button"
            >
              CONTINUE AS GUEST <span>→</span>
            </button>
            <small className="gateway-note">
              No account. No connection required after caching.
              <br />
              Your run records stay on this device.
            </small>
          </div>
          <div className="gateway-bottom">
            <span>01 — WHISPERING FOREST</span>
            <span>AN ORIGINAL PIXEL-ART ADVENTURE</span>
          </div>
        </div>
      ) : (
        <div className="hub-layout">
          <aside className="hub-sidebar">
            <span className="eyebrow">YOUR SANCTUARY</span>
            <h2>
              The Hub<span className="gold">.</span>
            </h2>
            <nav aria-label="Main navigation">
              <button className="nav-button" onClick={() => setScreen("rpg")}>
                INVENTORY & GEAR →
              </button>
              <button
                className="nav-button"
                onClick={() => setScreen("worlds")}
              >
                WORLD MAP →
              </button>
              <button
                className="nav-button selected"
                type="button"
                onClick={() => {
                  setHistory(false);
                  setControls(false);
                }}
              >
                <PixelIcon index={0} />
                Embark<span>01</span>
              </button>
              <button
                className="nav-button"
                onClick={() => setHistory(true)}
                type="button"
              >
                <PixelIcon index={5} />
                Run records<span>{runs.length}</span>
              </button>
              <button
                className="nav-button"
                onClick={() => setControls(true)}
                type="button"
              >
                <PixelIcon index={4} />
                Field manual<span>↗</span>
              </button>
            </nav>
            <div className="wanderer-card">
              <span className="portrait" aria-hidden="true" />
              <span className="eyebrow">LOCAL ADVENTURER</span>
              <strong>Rift Wanderer</strong>
              <small>Some journeys begin alone.</small>
              <div className="nr-record">
                <span>PERSONAL BEST</span>
                <strong>
                  {String(best).padStart(3, "0")} <small>KILLS</small>
                </strong>
              </div>
              <button
                className="quiet-button"
                onClick={() => setScreen("gateway")}
                type="button"
              >
                ← CHANGE MODE
              </button>
            </div>
          </aside>
          <section className="hub-main">
            <div className="hub-heading">
              <div>
                <span className="eyebrow">YOUR NEXT CHAPTER</span>
                <h1>
                  The forest <em>is calling.</em>
                </h1>
              </div>
              <span className="local-badge">
                <span className="live-dot" /> SINGLE PLAYER
              </span>
            </div>
            <section className="expedition-card" aria-labelledby="forest-title">
              <div className="expedition-art" aria-hidden="true" />
              <div className="expedition-top">
                <span className="chapter-badge">CHAPTER I</span>
                <span className="region-tag">THE VERDANT FRONTIER</span>
              </div>
              <div className="expedition-copy">
                <span className="eyebrow">SURVIVAL / BOSS ENCOUNTER</span>
                <h2 id="forest-title">
                  Whispering
                  <br />
                  <em>Forest</em>
                </h2>
                <p>
                  Something ancient stirs beneath the canopy.
                  <br />
                  Gather your strength. Break the Guardian’s hold.
                </p>
                <div className="expedition-meta">
                  <span>
                    <b>08</b> MINUTES TO BOSS
                  </span>
                  <span>
                    <b>05</b> ENEMY ARCHETYPES
                  </span>
                  <span>
                    <b>01</b> ANCIENT GUARDIAN
                  </span>
                </div>
              </div>
              <span className="art-coordinate" aria-hidden="true">
                N 48° 12′ · THE FIRST BREACH
              </span>
            </section>
            <button
              className="primary-button campaign-entry"
              onClick={() => setScreen("worlds")}
            >
              OPEN WORLD MAP · 20 STAGES →
            </button>
            <div className="loadout-heading">
              <div>
                <span className="eyebrow">YOUR STARTING COMPANION</span>
                <h3>Choose your weapon</h3>
              </div>
              <span className="muted">Each path plays differently.</span>
            </div>
            <div className="weapon-grid">
              {(Object.keys(WEAPONS) as WeaponId[]).map((id) => {
                const w = WEAPONS[id];
                return (
                  <button
                    className={`weapon-card ${weapon === id ? "selected" : ""}`}
                    aria-pressed={weapon === id}
                    key={id}
                    onClick={() => setWeapon(id)}
                    type="button"
                  >
                    <span className="weapon-number">0{w.icon + 1}</span>
                    <PixelIcon index={w.icon} large />
                    <strong>{w.name}</strong>
                    <small>{w.description}</small>
                    <span className="weapon-footer">
                      {weapon === id ? "EQUIPPED" : "SELECT WEAPON"}
                      <span>{weapon === id ? "✓" : "+"}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="embark-row">
              <p>
                <span className="live-dot" /> Ready when you are.
                <small>
                  100 HP · 180 movement speed · Temporary run upgrades
                </small>
              </p>
              <button
                className="primary-button embark-button"
                onClick={() => {
                  setSelection(undefined);
                  setScreen("game");
                }}
                type="button"
              >
                START NEW RUN <span>→</span>
              </button>
            </div>
            {warning && (
              <p className="notice" role="status">
                {warning}
              </p>
            )}
          </section>
        </div>
      )}
      <footer className="site-footer">
        <span>
          NOWRIFT <span className="gold">/</span> A WORLD BETWEEN WORLDS
        </span>
        <span>PHASE III · LOCAL RPG ADVENTURE · NO CLOUD SAVE</span>
      </footer>
      {settings && <Settings onClose={closeSettings} />}
      {controls && (
        <Modal title="How to survive" onClose={closeControls}>
          <span className="eyebrow">THE WANDERER’S FIELD MANUAL</span>
          <h2>How to survive</h2>
          <div className="manual-row">
            <strong>MOVE</strong>
            <span>
              WASD, arrow keys, or touch and drag anywhere on the arena.
              Movement is normalized diagonally.
            </span>
          </div>
          <div className="manual-row">
            <strong>ATTACK</strong>
            <span>
              Your selected weapon attacks nearby enemies automatically. Daggers
              favor close range; Frost Pulse slows enemies around you.
            </span>
          </div>
          <div className="manual-row">
            <strong>GROW</strong>
            <span>
              Collect emerald XP crystals. Choose one blessing each level. Red
              crystals heal you.
            </span>
          </div>
          <div className="manual-row">
            <strong>SURVIVE</strong>
            <span>
              Use Pause or Escape. Focus mode fills your screen. Red root
              circles warn before the Guardian strikes.
            </span>
          </div>
          <div className="manual-row">
            <strong>WIN</strong>
            <span>
              At eight minutes, defeat the Forest Guardian. At half health it
              enrages. Run records are saved locally; active runs reset on exit.
            </span>
          </div>
          <button
            className="primary-button"
            onClick={closeControls}
            type="button"
          >
            UNDERSTOOD →
          </button>
        </Modal>
      )}
      {history && (
        <Modal title="Run records" onClose={closeHistory}>
          <span className="eyebrow">REMEMBER EVERY JOURNEY</span>
          <h2>Run records</h2>
          <p className="muted">
            Your latest 20 completed runs, stored in IndexedDB on this device.
          </p>
          {runs.length ? (
            <div className="run-records">
              {runs.map((r) => (
                <div className="run-record" key={r.id}>
                  <PixelIcon index={WEAPONS[r.weapon].icon} />
                  <span>
                    <strong>
                      {r.outcome === "victory"
                        ? "Guardian defeated"
                        : "Wanderer fallen"}
                    </strong>
                    <small>
                      {WEAPONS[r.weapon].name} ·{" "}
                      {new Date(r.at).toLocaleDateString()}
                    </small>
                  </span>
                  <b>
                    {r.kills} kills
                    <small>
                      {clock(r.seconds)} · {r.gold}{" "}
                      {r.campaign ? "gold" : "score"}
                    </small>
                  </b>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-record">
              Your story is unwritten.
              <br />
              Complete a run to leave your first mark.
            </p>
          )}
          {warning && <p className="notice">{warning}</p>}
        </Modal>
      )}
    </main>
  );
}
