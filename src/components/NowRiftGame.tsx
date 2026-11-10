"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PhaserHost from "./PhaserHost";
import { Brand, Modal, PixelIcon, Settings, clock } from "./GameUi";
import { GameBridge } from "@/game/bridge";
import { makeGame, snapshot, type Snapshot } from "@/game/engine";
import {
  FOREST,
  UPGRADES,
  WEAPONS,
  type WeaponId,
} from "@/game/content/forest";
import { stageById, worldById, DIFFICULTIES } from "@/game/campaign/content";
import type { StageSelection } from "@/game/campaign/loader";
import { campaignRepository } from "@/game/campaign/persistence";
import type { Rewards } from "@/game/campaign/rewards";
import { runRepository } from "@/game/services/saves";
import { BEST_SCORE_KEY, parseBestKills } from "@/game/services/metadata";

type Props = {
  stage?: StageSelection;
  autoStart?: boolean;
  onExitToMenu?: () => void;
  weapon?: WeaponId;
};
export default function NowRiftGame({
  stage,
  autoStart = true,
  onExitToMenu,
  weapon = "arcane",
}: Props) {
  const definition = stage ? stageById(stage.stageId) : null,
    world = definition ? worldById(definition.worldId) : null;
  const [reward, setReward] = useState<Rewards | null>(null);
  const bridge = useMemo(() => new GameBridge(), []);
  const [hud, setHud] = useState<Snapshot>(() =>
    snapshot(makeGame(FOREST.width, FOREST.height, weapon)),
  );
  const [ready, setReady] = useState(false),
    [loading, setLoading] = useState(0),
    [error, setError] = useState(""),
    [save, setSave] = useState("");
  const [immersive, setImmersive] = useState(false),
    [touch, setTouch] = useState(false),
    [confirmLeave, setConfirmLeave] = useState(false),
    [settings, setSettings] = useState(false);
  const resume = useRef(false),
    currentHud = useRef(hud);
  currentHud.current = hud;
  useEffect(() => {
    const off = [
      bridge.on("hud", setHud),
      bridge.on("loading", setLoading),
      bridge.on("error", setError),
      bridge.on("touch", setTouch),
      bridge.on("ready", (value) => {
        setReady(value);
        if (value && autoStart)
          bridge.emit("command", { type: "start", weapon, stage });
      }),
      bridge.on("result", (run) => {
        if (run.campaign)
          campaignRepository
            .settle(run.campaign)
            .then((r) => setReward(r.reward))
            .catch((e) =>
              setError(
                "Campaign save failed; progression was not changed. " +
                  String(e),
              ),
            );
        setSave("Saving run record…");
        runRepository
          .put(run)
          .then(() => setSave("Run record saved on this device."))
          .catch(() =>
            setSave(
              "Run record could not be saved. You can keep playing; previous records are preserved.",
            ),
          );
        try {
          const best = Math.max(
            parseBestKills(localStorage.getItem(BEST_SCORE_KEY)),
            run.kills,
          );
          localStorage.setItem(BEST_SCORE_KEY, String(best));
        } catch {
          /* Record storage is optional. */
        }
      }),
    ];
    return () => {
      off.forEach((fn) => fn());
    };
  }, [autoStart, bridge, weapon, stage]);
  useEffect(() => {
    document.body.classList.toggle("nowrift-immersive", immersive);
    return () => document.body.classList.remove("nowrift-immersive");
  }, [immersive]);
  const pause = () => bridge.emit("command", { type: "pause" });
  const start = () => {
    setSave("");
    setReward(null);
    bridge.emit("command", { type: "start", weapon, stage });
  };
  const requestLeave = () => {
    if (["gameover", "victory", "menu"].includes(hud.phase)) {
      onExitToMenu?.();
      return;
    }
    resume.current = hud.phase === "playing";
    if (resume.current) pause();
    setConfirmLeave(true);
  };
  const cancelLeave = useCallback(() => {
    setConfirmLeave(false);
    if (resume.current && currentHud.current.phase === "paused")
      bridge.emit("command", { type: "pause" });
    resume.current = false;
  }, [bridge]);
  const openSettings = () => {
    resume.current = hud.phase === "playing";
    if (resume.current) pause();
    setSettings(true);
  };
  const closeSettings = useCallback(() => {
    setSettings(false);
    if (resume.current && currentHud.current.phase === "paused")
      bridge.emit("command", { type: "pause" });
    resume.current = false;
  }, [bridge]);
  const terminal = hud.phase === "gameover" || hud.phase === "victory";
  return (
    <main className={`site-shell ${immersive ? "immersive" : ""}`}>
      <header className="topbar">
        <Brand />
        <div className="header-right">
          <span className="eyebrow">A JOURNEY BEYOND THE BREACH</span>
          <button className="quiet-button" onClick={requestLeave} type="button">
            ← MAIN MENU
          </button>
        </div>
      </header>
      <section className="content">
        <div className="run-heading hero">
          <div>
            <span className="eyebrow">
              {definition
                ? `${world!.name.toUpperCase()} / STAGE ${definition.number}`
                : "CHAPTER I / THE FIRST BREACH"}
            </span>
            <h1>
              {world ? (
                world.name
              ) : (
                <>
                  Whispering <em>Forest</em>
                </>
              )}
            </h1>
          </div>
          <p>
            {definition && stage ? (
              `${definition.name} · ${stage.difficulty.toUpperCase()} · ${clock(Math.round(definition.clear.seconds * DIFFICULTIES[stage.difficulty].duration))} ${definition.clear.kind === "boss" ? "then defeat the guardian" : "survival"}`
            ) : (
              <>
                Survive until <strong>08:00</strong>. Defeat the Forest
                Guardian.
              </>
            )}
          </p>
        </div>
        <section className="game-card" aria-label="NowRift playable game">
          <div className="game-topbar">
            <div className="sector-heading">
              <span className="live-dot" />{" "}
              {world?.name.toUpperCase() ?? "WHISPERING FOREST"}{" "}
              <span className="game-state">
                {hud.phase === "playing" ? "LIVE RUN" : hud.phase.toUpperCase()}
              </span>
            </div>
            <div className="game-actions">
              <button
                className="action-button"
                onClick={pause}
                disabled={!ready || !["playing", "paused"].includes(hud.phase)}
                type="button"
              >
                {hud.phase === "paused" ? "RESUME" : "PAUSE"}
              </button>
              <button
                className="action-button"
                onClick={() => setImmersive((v) => !v)}
                aria-label={immersive ? "Exit focus mode" : "Enter focus mode"}
                aria-pressed={immersive}
                type="button"
              >
                {immersive ? "EXIT FOCUS" : "FOCUS"}
              </button>
              <button
                className="action-button"
                aria-label="Settings"
                onClick={openSettings}
                type="button"
              >
                SETTINGS
              </button>
              <button
                className="action-button"
                onClick={start}
                disabled={!ready}
                type="button"
              >
                RESTART
              </button>
              <button
                className="action-button compact-menu"
                onClick={requestLeave}
                type="button"
              >
                MAIN MENU
              </button>
            </div>
          </div>
          <div className="hud-row">
            <div className="level-shape">
              <small>LEVEL</small>
              <strong>{String(hud.level).padStart(2, "0")}</strong>
            </div>
            <div className="bars">
              <div className="bar-heading">
                <span>RIFT WANDERER</span>
                <strong>
                  {hud.hp} <small>/ {hud.maxHp} HP</small>
                </strong>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill health-fill"
                  style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }}
                />
              </div>
              <div className="bar-track xp-track">
                <div
                  className="bar-fill xp-fill"
                  style={{
                    width: `${Math.min(100, (hud.xp / hud.xpToNext) * 100)}%`,
                  }}
                />
              </div>
              <span className="xp-label">
                {hud.xp} / {hud.xpToNext} XP
              </span>
            </div>
            <div className="hud-stats">
              {[
                ["TIME", clock(hud.time)],
                ["KILLS", hud.kills],
                ["ENEMIES", hud.enemies],
              ].map(([label, value]) => (
                <div className="stat" key={label}>
                  <span className="stat-label">{label}</span>
                  <strong className="stat-value">{value}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="arena">
            {hud.statuses.length > 0 && (
              <span className="campaign-status">
                {hud.statuses.join(" · ")}
              </span>
            )}
            <PhaserHost bridge={bridge} />
            {!ready && (
              <div className="arena-overlay">
                <span className="eyebrow">ENTERING THE FOREST</span>
                <h2>Through the veil…</h2>
                <progress
                  max={1}
                  value={loading}
                  aria-label="Loading game assets"
                />
                <p>{Math.round(loading * 100)}% · Preparing your journey</p>
                {error && <p role="alert">{error}</p>}
              </div>
            )}
            {hud.boss && (
              <div
                className="boss-hud"
                aria-label={`${world?.boss.name ?? "Forest Guardian"} health`}
              >
                <span>
                  {world?.boss.name.toUpperCase() ?? "FOREST GUARDIAN"}{" "}
                  <small>
                    {hud.boss.phase === 2
                      ? "ENRAGED · PHASE II"
                      : "THE ANCIENT WARDEN"}
                  </small>
                </span>
                <div className="bar-track">
                  <div
                    className="bar-fill boss-fill"
                    style={{
                      width: `${Math.max(0, (hud.boss.hp / hud.boss.maxHp) * 100)}%`,
                    }}
                  />
                </div>
                <small>
                  {hud.boss.hp} / {hud.boss.maxHp}
                </small>
              </div>
            )}
            {hud.phase === "playing" && (
              <>
                <span className="in-game-hint">
                  {hud.time < 120
                    ? "THE FOREST STIRS"
                    : hud.time < 240
                      ? "THE HUNT BEGINS"
                      : hud.time < 360
                        ? "THORNS AWAKEN"
                        : hud.time < 480
                          ? "THE LAST STAND"
                          : "BREAK THE GUARDIAN"}
                </span>
                <span className="touch-hint">
                  {touch ? "MOVING" : "DRAG TO MOVE"}
                </span>
              </>
            )}
            {hud.phase === "paused" && !confirmLeave && !settings && (
              <div className="arena-overlay">
                <span className="eyebrow">TAKE A BREATH</span>
                <h2>Paused</h2>
                <p>The forest will wait.</p>
                <button
                  className="primary-button"
                  onClick={pause}
                  type="button"
                >
                  RESUME RUN <span>→</span>
                </button>
                <button
                  className="quiet-button"
                  onClick={openSettings}
                  type="button"
                >
                  Settings
                </button>
                <button
                  className="quiet-button"
                  onClick={requestLeave}
                  type="button"
                >
                  Return to main menu
                </button>
              </div>
            )}
            {hud.phase === "upgrade" && !confirmLeave && !settings && (
              <div
                className="arena-overlay upgrade-overlay"
                role="dialog"
                aria-label="Choose an upgrade"
                aria-modal="true"
              >
                <span className="eyebrow">
                  LEVEL {hud.level} / A NEW AWAKENING
                </span>
                <h2>
                  Choose your <em>power.</em>
                </h2>
                <p>One choice. A different path.</p>
                <div className="upgrade-grid">
                  {hud.offers.map((id) => {
                    const u = UPGRADES.find((u) => u.id === id)!;
                    return (
                      <button
                        className="upgrade-card"
                        key={id}
                        onClick={() =>
                          bridge.emit("command", { type: "upgrade", id })
                        }
                        type="button"
                      >
                        <span className="card-rarity">
                          BLESSING · {(hud.stacks[id] ?? 0) + 1}/{u.max}
                        </span>
                        <PixelIcon index={u.icon} large />
                        <strong>{u.name}</strong>
                        <small>{u.description}</small>
                        <span className="upgrade-select">EMBRACE →</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {terminal && (
              <div className="arena-overlay results-overlay">
                <span className="eyebrow">
                  {hud.phase === "victory"
                    ? "THE FOREST REMEMBERS"
                    : "EVERY END IS A BEGINNING"}
                </span>
                <h2>
                  {hud.phase === "victory"
                    ? "The veil is lifted."
                    : "Your light fades."}
                </h2>
                <p>
                  {hud.phase === "victory"
                    ? definition
                      ? "Stage cleared. Campaign rewards are banked locally."
                      : "Forest Guardian defeated. +150 victory gold."
                    : "The Rift Wanderer will rise again."}
                </p>
                {reward && (
                  <p className="campaign-reward" role="status">
                    {reward.firstClear
                      ? "FIRST CLEAR · "
                      : "FARMING REWARDS · "}
                    {reward.gold} gold · {reward.xp} XP
                    <br />
                    {Object.entries(reward.materials)
                      .map(([id, n]) => `${id.replaceAll("-", " ")} ×${n}`)
                      .join(" · ")}
                  </p>
                )}
                <div className="result-row">
                  <span>
                    <strong>{clock(hud.time)}</strong>SURVIVED
                  </span>
                  <span>
                    <strong>{hud.kills}</strong>ENEMIES SLAIN
                  </span>
                  <span>
                    <strong>{hud.gold}</strong>RUN GOLD
                  </span>
                </div>
                <p className="save-message" role="status">
                  {save}
                </p>
                <button
                  className="primary-button"
                  onClick={start}
                  type="button"
                >
                  TRY AGAIN <span>→</span>
                </button>
                <button
                  className="quiet-button"
                  onClick={onExitToMenu}
                  type="button"
                >
                  RETURN TO MAIN MENU
                </button>
                <small className="muted">
                  Run gold is a score in Phase 1; it has no permanent spending
                  system.
                </small>
              </div>
            )}
          </div>
          <div className="arena-footer">
            <div className="active-weapon">
              <PixelIcon index={WEAPONS[weapon].icon} />
              <span>
                <strong>{WEAPONS[weapon].name}</strong>
                <small>
                  {hud.damage.toFixed(1)} DMG · {hud.interval.toFixed(2)}s ·{" "}
                  {Math.round(hud.crit * 100)}% CRIT
                </small>
              </span>
            </div>
            <div className="control-hint">
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd>
              <span>MOVE</span>
              <kbd>ESC</kbd>
              <span>PAUSE</span>
            </div>
            <span className="auto-attack">AUTO ATTACK ACTIVE</span>
          </div>
        </section>
        {error && ready && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        <p className="field-note">
          FIELD NOTES{" "}
          <span>
            Collect emerald crystals to grow stronger. Red roots warn of an
            incoming strike. Keep moving.
          </span>
        </p>
      </section>
      {settings && <Settings onClose={closeSettings} />}
      {confirmLeave && (
        <Modal title="Return to hub" onClose={cancelLeave}>
          <span className="eyebrow">LEAVE THE FOREST?</span>
          <h2>Return to hub?</h2>
          <p>
            Your active run will end. Completed run records and your best score
            remain on this device.
          </p>
          <div className="dialog-actions">
            <button
              className="quiet-button"
              onClick={cancelLeave}
              type="button"
            >
              CONTINUE RUN
            </button>
            <button
              className="primary-button"
              onClick={onExitToMenu}
              type="button"
            >
              EXIT TO HUB →
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
