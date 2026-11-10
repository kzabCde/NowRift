"use client";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "@/i18n/useI18n";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHARACTERS, RELICS, type RelicId, type Loadout } from "@/game/loadout";
import PhaserHost from "./PhaserHost";
import {
  Brand,
  DialogSurface,
  Modal,
  PixelIcon,
  Settings,
  clock,
} from "./GameUi";
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
  loadout?: Loadout;
  stage?: StageSelection;
  autoStart?: boolean;
  onExitToMenu?: () => void;
  weapon?: WeaponId;
};
export default function NowRiftGame({
  stage,
  loadout,
  autoStart = true,
  onExitToMenu,
  weapon = "arcane",
}: Props) {
  const { t, text, locale } = useI18n();
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
          bridge.emit("command", { type: "start", weapon, stage, loadout });
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
  }, [autoStart, bridge, weapon, stage, loadout]);
  useEffect(() => {
    document.body.classList.toggle("nowrift-immersive", immersive);
    return () => document.body.classList.remove("nowrift-immersive");
  }, [immersive]);
  const pause = useCallback(
    () => bridge.emit("command", { type: "pause" }),
    [bridge],
  );
  const start = () => {
    setSave("");
    setReward(null);
    bridge.emit("command", { type: "start", weapon, stage, loadout });
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
          <LanguageSwitcher compact />
          <span className="eyebrow">{t("game","A JOURNEY BEYOND THE BREACH")}</span>
          <button className="quiet-button" onClick={requestLeave} type="button">{t("game","← MAIN MENU")}{" "}</button>
        </div>
      </header>
      <section className="content">
        <div className="run-heading hero">
          <div>
            <span className="eyebrow">
              {definition
                ? `${text(world!.name).toUpperCase()} / ${t("game","STAGE")} ${definition.number}`
                : t("game","CHAPTER I / THE FIRST BREACH")}
            </span>
            <h1>
              {world ? (
                text(world.name)
              ) : (
                <>{t("main","Whispering")} <em>{t("main","Forest")}</em></>
              )}
            </h1>
          </div>
          <p>
            {definition && stage ? (
              `${text(definition.name)} · ${text(stage.difficulty.toUpperCase())} · ${clock(Math.round(definition.clear.seconds * DIFFICULTIES[stage.difficulty].duration))} ${definition.clear.kind === "boss" ? t("game","then defeat the guardian") : t("game","survival")}`
            ) : (
              <>{t("game","Survive until")}{" "}<strong>08:00</strong>{t("game",". Defeat the Forest Guardian.")}{" "}</>
            )}
          </p>
        </div>
        <section className="game-card" aria-label={t("game","NowRift playable game")}>
          <div className="game-topbar">
            <div className="sector-heading">
              <span className="live-dot" />{" "}
              {text(world?.name ?? "Whispering Forest").toUpperCase()}{" "}
              <span className="game-state">
                {hud.phase === "playing" ? t("game","LIVE RUN") : text(hud.phase.toUpperCase())}
              </span>
            </div>
            <div className="game-actions">
              <button
                className="action-button"
                onClick={pause}
                disabled={!ready || !["playing", "paused"].includes(hud.phase)}
                type="button"
              >
                {hud.phase === "paused" ? t("game","RESUME") : t("game","PAUSE")}
              </button>
              <button
                className="action-button"
                onClick={() => setImmersive((v) => !v)}
                aria-label={immersive ? t("game","Exit focus mode") : t("game","Enter focus mode")}
                aria-pressed={immersive}
                type="button"
              >
                {immersive ? t("game","EXIT FOCUS") : t("game","FOCUS")}
              </button>
              <button
                className="action-button"
                aria-label={t("game","Settings")}
                onClick={openSettings}
                type="button"
              >{t("game","SETTINGS")}{" "}</button>
              <button
                className="action-button"
                onClick={start}
                disabled={!ready}
                type="button"
              >{t("game","RESTART")}{" "}</button>
              <button
                className="action-button compact-menu"
                onClick={requestLeave}
                type="button"
              >{t("game","MAIN MENU")}{" "}</button>
            </div>
          </div>
          <div className="hud-row">
            <div className="level-shape">
              <small>{t("game","LEVEL")}</small>
              <strong>{String(hud.level).padStart(2, "0")}</strong>
            </div>
            <div className="bars">
              <div className="bar-heading">
                <span>
                  {text(CHARACTERS[loadout?.character ?? "wanderer"].name).toUpperCase()}
                </span>
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
                [t("game","TIME"), clock(hud.time)],
                [t("game","KILLS"), hud.kills],
                [t("game","ENEMIES"), hud.enemies],
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
                {hud.statuses.map(text).join(" · ")}
              </span>
            )}
            <PhaserHost bridge={bridge} world={world?.id} />
            {!ready && (
              <div className="arena-overlay">
                <span className="eyebrow">{t("game","ENTERING THE FOREST")}</span>
                <h2>{t("game","Through the veil…")}</h2>
                <progress
                  max={1}
                  value={loading}
                  aria-label={t("game","Loading game assets")}
                />
                <p>{Math.round(loading * 100)}% · {t("game","Preparing your journey")}</p>
                {error && <p role="alert">{text(error)}</p>}
              </div>
            )}
            {hud.boss && (
              <div
                className="boss-hud"
                aria-label={`${text(world?.boss.name ?? "Forest Guardian")} ${t("game","health")}`}
              >
                <span>
                  {world?.boss.name.toUpperCase() ?? t("game","FOREST GUARDIAN")}{" "}
                  <small>
                    {hud.boss.phase === 2
                      ? t("game","ENRAGED · PHASE II")
                      : t("game","THE ANCIENT WARDEN")}
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
                    ? t("game","THE FOREST STIRS")
                    : hud.time < 240
                      ? t("game","THE HUNT BEGINS")
                      : hud.time < 360
                        ? t("game","THORNS AWAKEN")
                        : hud.time < 480
                          ? t("game","THE LAST STAND")
                          : t("game","BREAK THE GUARDIAN")}
                </span>
                <span className="touch-hint">
                  {touch ? t("game","MOVING") : t("game","DRAG TO MOVE")}
                </span>
              </>
            )}
            {hud.phase === "paused" && !confirmLeave && !settings && (
              <DialogSurface
                className="arena-overlay"
                title={t("game","Paused")}
                onClose={pause}
              >
                <span className="eyebrow">{t("game","TAKE A BREATH")}</span>
                <h2>{t("game","Paused")}</h2>
                <p>{t("game","The forest will wait.")}</p>
                <button
                  className="primary-button"
                  onClick={pause}
                  type="button"
                >{t("game","RESUME RUN")}{" "}<span>→</span>
                </button>
                <button
                  className="quiet-button"
                  onClick={openSettings}
                  type="button"
                >{t("game","Settings")}{" "}</button>
                <button
                  className="quiet-button"
                  onClick={requestLeave}
                  type="button"
                >{t("game","Return to main menu")}{" "}</button>
              </DialogSurface>
            )}
            {hud.phase === "upgrade" && !confirmLeave && !settings && (
              <DialogSurface
                className="arena-overlay upgrade-overlay"
                title={t("game","Choose an upgrade")}
              >
                <span className="eyebrow">
                  {t("game","LEVEL")} {hud.level} / {t("game","A NEW AWAKENING")}
                </span>
                <h2>{t("game","Choose your")}{" "}<em>{t("game","power.")}</em>
                </h2>
                <p>{t("game","One choice. A different path.")}</p>
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
                          {t("game","BLESSING")} · {(hud.stacks[id] ?? 0) + 1}/{u.max}
                        </span>
                        <PixelIcon index={u.icon} large />
                        <strong>{text(u.name)}</strong>
                        <small>{text(u.description)}</small>
                        <span className="upgrade-select">{t("game","EMBRACE →")}</span>
                      </button>
                    );
                  })}
                </div>
              </DialogSurface>
            )}
            {terminal && (
              <DialogSurface
                className="arena-overlay results-overlay"
                title={hud.phase === "victory" ? t("game","Victory") : t("game","Defeat")}
              >
                <span className="eyebrow">
                  {hud.phase === "victory"
                    ? t("game","THE FOREST REMEMBERS")
                    : t("game","EVERY END IS A BEGINNING")}
                </span>
                <h2>
                  {hud.phase === "victory"
                    ? t("game","The veil is lifted.")
                    : t("game","Your light fades.")}
                </h2>
                <p>
                  {hud.phase === "victory"
                    ? definition
                      ? t("game","Stage cleared. Campaign rewards are banked locally.")
                      : t("game","Forest Guardian defeated. +150 victory gold.")
                    : t("game","The Rift Wanderer will rise again.")}
                </p>
                {reward && (
                  <p className="campaign-reward" role="status">
                    {reward.firstClear
                      ? t("game","FIRST CLEAR · ")
                      : t("game","FARMING REWARDS · ")}
                    {reward.gold} {t("main","gold")} · {reward.xp} XP
                    <br />
                    {Object.entries(reward.materials)
                      .map(([id, n]) => `${text(id)} ×${n}`)
                      .join(" · ")}
                  </p>
                )}
                {reward?.candidates.map((id, index) => (
                  <div className="earned-relic" key={`${id}-${index}`}>
                    <PixelIcon index={RELICS[id as RelicId]?.icon ?? 7} />
                    <span>
                      <small>{t("game","GUARDIAN RELIC EARNED")}</small>
                      <strong>
                        {text(RELICS[id as RelicId]?.name ?? id)}
                      </strong>
                    </span>
                  </div>
                ))}
                <div className="result-row">
                  <span>
                    <strong>{clock(hud.time)}</strong>{t("game","SURVIVED")}{" "}</span>
                  <span>
                    <strong>{hud.kills}</strong>{t("game","ENEMIES SLAIN")}{" "}</span>
                  <span>
                    <strong>{hud.gold}</strong>{t("game","RUN GOLD")}{" "}</span>
                </div>
                <p className="save-message" role="status">
                  {text(save)}
                </p>
                <button
                  className="primary-button"
                  onClick={start}
                  type="button"
                >{t("game","TRY AGAIN")}{" "}<span>→</span>
                </button>
                <button
                  className="quiet-button"
                  onClick={onExitToMenu}
                  type="button"
                >{t("game","RETURN TO MAIN MENU")}{" "}</button>
                <small className="muted">
                  {definition
                    ? t("game","Campaign gold can enhance relics at the sanctuary.")
                    : t("game","Survival gold is a run score. Play campaign stages to bank rewards.")}
                </small>
              </DialogSurface>
            )}
          </div>
          <div className="arena-footer">
            <div className="active-weapon">
              <PixelIcon index={WEAPONS[weapon].icon} />
              <span>
                <strong>{text(WEAPONS[weapon].name)}</strong>
                <small>
                  {hud.damage.toFixed(1)} {t("game","DMG")} · {hud.interval.toFixed(2)}s ·{" "}
                  {Math.round(hud.crit * 100)}% {t("game","CRIT")}
                </small>
              </span>
            </div>
            <div className="control-hint">
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd>
              <span>{t("game","MOVE")}</span>
              <kbd>ESC</kbd>
              <span>{t("game","PAUSE")}</span>
            </div>
            <span className="auto-attack">{t("game","AUTO ATTACK ACTIVE")}</span>
          </div>
        </section>
        {error && ready && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        <p className="field-note">
          {t("game","FIELD NOTES")}{" "}
          <span>{t("game","Collect emerald crystals to grow stronger. Red roots warn of an incoming strike. Keep moving.")}{" "}</span>
        </p>
      </section>
      {settings && <Settings onClose={closeSettings} />}
      {confirmLeave && (
        <Modal title="Return to hub" onClose={cancelLeave}>
          <span className="eyebrow">{t("game","LEAVE THE FOREST?")}</span>
          <h2>{t("game","Return to hub?")}</h2>
          <p>{t("game","Your active run will end. Completed run records and your best score remain on this device.")}{" "}</p>
          <div className="dialog-actions">
            <button
              className="quiet-button"
              onClick={cancelLeave}
              type="button"
            >{t("game","CONTINUE RUN")}{" "}</button>
            <button
              className="primary-button"
              onClick={onExitToMenu}
              type="button"
            >{t("game","EXIT TO HUB →")}{" "}</button>
          </div>
        </Modal>
      )}
    </main>
  );
}
