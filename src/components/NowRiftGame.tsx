"use client";
import SaveIndicator from "./SaveIndicator";
import RiftTransition from "./RiftTransition";
import { shortcutAllowed } from "@/game/navigation/flow";
import { profileRepository } from "@/game/persistence/repository";
import type { RunOwner } from "@/game/persistence/model";
import type { RunCheckpoint } from "@/game/persistence/checkpoint";
import type { ExpeditionPrompt } from "@/game/world/farming";
import { FARM, farmingNodes, travelReason } from "@/game/world/content";
import { ITEMS } from "@/game/rpg/content";
import { practiceLoadout } from "@/game/rpg/stats";
import { RARITIES } from "@/game/rpg/content";
import ItemIcon from "./ItemIcon";
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
import { campaignLoadout } from "@/game/rpg/stats";
import type { Rewards } from "@/game/campaign/rewards";
import { runRepository } from "@/game/services/saves";

type Props = {
  characterName?: string;
  returnToHaven?: boolean;
  loadout?: Loadout;
  slotId?: string;
  recovery?: RunCheckpoint;
  stage?: StageSelection;
  autoStart?: boolean;
  onExitToMenu?: (warning?: string) => void;
  weapon?: WeaponId;
};
export default function NowRiftGame({
  stage,
  loadout,
  slotId,
  recovery,
  autoStart = true,
  onExitToMenu,
  weapon = "arcane",
  returnToHaven = false,
  characterName,
}: Props) {
  const { t, text } = useI18n();
  const [revealed, setRevealed] = useState(!returnToHaven),
    [rendererError, setRendererError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [shortcutNotice, setShortcutNotice] = useState("");
  const cinematicComplete = useRef(!returnToHaven),
    loadingFailed = useRef(false);
  const definition = stage ? stageById(stage.stageId) : null,
    world = definition ? worldById(definition.worldId) : null;
  const resultRun = useRef<string | null>(null);
  const runContext = useRef<RunOwner | null>(null),
    pendingCheckpoint = useRef<Promise<unknown> | null>(null),
    bootStart = useRef<() => void>(() => {}),
    didRecover = useRef(false);
  const pendingResult = useRef<Promise<void> | null>(null),
    startGuard = useRef(false);
  const [starting, setStarting] = useState(false);
  const [saveBlocked, setSaveBlocked] = useState(false);
  const [expedition, setExpedition] = useState<ExpeditionPrompt | null>(null);
  const farming = stage?.activity === "farming";
  const [reward, setReward] = useState<Rewards | null>(null);
  const [tonics, setTonics] = useState<Record<string, number>>({}),
    [tonicBusy, setTonicBusy] = useState(false);
  const tonicGuard = useRef(false);
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
      bridge.on("error", (message) => {
        if (!cinematicComplete.current) {
          loadingFailed.current = true;
          setRendererError(message);
        }
        setError(message);
      }),
      bridge.on("touch", setTouch),
      bridge.on("expedition", setExpedition),
      bridge.on("ready", (value) => {
        setReady(value);
        if (value && autoStart) bootStart.current();
      }),
      bridge.on("checkpoint", (checkpoint) => {
        pendingCheckpoint.current = profileRepository
          .checkpoint(checkpoint)
          .then(() => {
            setSaveBlocked(false);
            setError((message) =>
              message.startsWith("Checkpoint save failed.") ? "" : message,
            );
            bridge.emit("command", { type: "storage-ready" });
          })
          .catch((error) => {
            setSaveBlocked(true);
            setError("Checkpoint save failed. " + String(error));
            bridge.emit("command", { type: "storage-blocked" });
          });
      }),
      bridge.on("result", (run) => {
        resultRun.current = run.id;
        setSave("Saving run record…");
        pendingResult.current = (async () => {
          await pendingCheckpoint.current;
          let recordedGold = run.gold;
          if (run.campaign) {
            try {
              const settled = await campaignRepository.settle(run.campaign);
              recordedGold = settled.reward?.gold ?? 0;
              if (resultRun.current === run.id) setReward(settled.reward);
            } catch (e) {
              recordedGold = 0;
              if (resultRun.current === run.id)
                setError(
                  "Campaign save failed; progression was not changed. " +
                    String(e),
                );
            }
          }
          try {
            await runRepository.put({ ...run, gold: recordedGold });
            if (resultRun.current === run.id)
              setSave("Run record saved on this device.");
          } catch {
            if (resultRun.current === run.id)
              setSave(
                "Run record could not be saved. You can keep playing; previous records are preserved.",
              );
          }
        })();
      }),
    ];
    return () => {
      resultRun.current = null;
      off.forEach((fn) => fn());
    };
  }, [autoStart, bridge, weapon, stage, loadout]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === "h" &&
        shortcutAllowed(event, event.target)
      )
        setShortcutNotice(
          t(
            "journey",
            "Return to Rift Heaven to open Sanctuary. Finish or abandon your adventure first.",
          ),
        );
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [t]);
  useEffect(() => {
    document.body.classList.toggle("nowrift-immersive", immersive);
    return () => document.body.classList.remove("nowrift-immersive");
  }, [immersive]);
  useEffect(() => {
    if (stage && (hud.phase === "paused" || hud.phase === "playing"))
      campaignRepository
        .load(runContext.current?.slotId ?? slotId)
        .then((p) => setTonics(p.rpg?.consumables ?? {}))
        .catch(() => {});
  }, [stage, hud.phase]);
  const useTonic = async (definitionId: "health-tonic" | "focus-tonic") => {
    if (tonicGuard.current || !hud.runId || hud.phase !== "paused" || !stage)
      return;
    tonicGuard.current = true;
    setTonicBusy(true);
    const runId = hud.runId,
      id = "tonic-" + crypto.randomUUID();
    bridge.emit("command", { type: "tonic-lock", runId });
    try {
      const p = await campaignRepository.load(
        runContext.current?.slotId ?? slotId,
      );
      const result = await campaignRepository.act({
        id,
        at: Date.now(),
        expectedRevision: p.rpg!.revision,
        slotId: p.local?.id,
        run: runContext.current ?? undefined,
        action: { type: "consume", definitionId },
      });
      setTonics(result.progress.rpg!.consumables);
      bridge.emit("command", {
        type: "tonic",
        runId,
        receiptId: id,
        definitionId,
      });
    } catch (e) {
      setError("Tonic could not be used. " + String(e));
      bridge.emit("command", { type: "tonic-unlock", runId });
    } finally {
      tonicGuard.current = false;
      setTonicBusy(false);
    }
  };
  const pause = useCallback(() => {
    if (!tonicGuard.current) bridge.emit("command", { type: "pause" });
  }, [bridge]);
  const start = async () => {
    if (tonicGuard.current || startGuard.current || loadingFailed.current)
      return;
    startGuard.current = true;
    setStarting(true);
    try {
      await pendingResult.current;
      await pendingCheckpoint.current;
      const p = await profileRepository.load(
        slotId ?? runContext.current?.slotId,
      );
      const recovering = !!recovery && !didRecover.current;
      if (stage) {
        const reason = travelReason(stage, p.clears);
        if (reason) throw new Error(reason);
      }
      const prepared = await profileRepository.beginRun(
        p.local.id,
        recovering,
        runContext.current?.id,
        !!stage,
      );
      runContext.current = prepared.run;
      didRecover.current = true;
      const c = prepared.checkpoint;
      const canonical = prepared.save;
      const selection =
        c?.stage ??
        (stage
          ? {
              ...stage,
              ...(stage.activity === "farming"
                ? {
                    startingHp: canonical.local.world!.hp,
                    outfit: canonical.local.world!.outfit,
                  }
                : {}),
              outfit: canonical.local.world!.outfit,
              clears: canonical.clears,
              ...campaignLoadout(canonical),
            }
          : undefined);
      resultRun.current = null;
      setSave("");
      setReward(null);
      setError((previous) =>
        previous.startsWith("Missing art:") ? previous : "",
      );
      bridge.emit("command", {
        type: "start",
        weapon: c?.weapon ?? selection?.weaponSnapshot?.attackId ?? weapon,
        stage: selection,
        loadout:
          c?.loadout ?? practiceLoadout(canonical, canonical.local.character),
        run: prepared.run,
        checkpoint: c,
        hold: returnToHaven && !cinematicComplete.current,
      });
    } catch (e) {
      setError("Run could not start. " + String(e));
      if (
        !stage &&
        !recovery &&
        /storage (?:is )?unavailable|indexedDB|QuotaExceededError|SecurityError/i.test(
          String(e),
        )
      ) {
        runContext.current = null;
        setError(
          "Temporary practice: progress and recovery cannot be saved. " +
            String(e),
        );
        bridge.emit("command", { type: "start", weapon, loadout });
      }
    } finally {
      startGuard.current = false;
      setStarting(false);
    }
  };
  bootStart.current = () => {
    void start();
  };
  const leave = async () => {
    if (tonicGuard.current || startGuard.current) return;
    await pendingResult.current;
    const run = runContext.current;
    let warning: string | undefined;
    if (
      run &&
      !["victory", "gameover", "menu"].includes(currentHud.current.phase)
    ) {
      bridge.emit("command", { type: "checkpoint" });
      await pendingCheckpoint.current;
      try {
        await profileRepository.discardRun(run.slotId, run);
      } catch (error) {
        warning = /another tab|replaced|deleted|no longer exists/.test(
          String(error),
        )
          ? "This run is owned by another tab. Its saved checkpoint was preserved."
          : "The saved checkpoint was kept because it could not be discarded. " +
            String(error);
      }
    }
    bridge.emit("command", { type: "exit" });
    onExitToMenu?.(warning);
  };
  const requestLeave = () => {
    if (tonicGuard.current) return;
    if (["gameover", "victory", "menu"].includes(hud.phase)) {
      void leave();
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
      {returnToHaven && (!revealed || rendererError) && (
        <RiftTransition
          key={attempt}
          progress={loading}
          ready={ready && !!hud.runId && hud.phase !== "menu" && !starting}
          error={rendererError || error}
          onReveal={() => {
            cinematicComplete.current = true;
            setRevealed(true);
            bridge.emit("command", { type: "transition-lock", locked: false });
          }}
          onRetry={() => {
            if (!rendererError) void start();
            else {
              loadingFailed.current = false;
              setRendererError("");
              setError("");
              setReady(false);
              setLoading(0);
              setAttempt((n) => n + 1);
            }
          }}
          onBack={() => onExitToMenu?.()}
        />
      )}
      {shortcutNotice && (
        <button
          className="haven-toast"
          role="status"
          onClick={() => setShortcutNotice("")}
        >
          {shortcutNotice}
        </button>
      )}
      <header className="topbar">
        <Brand />
        <div className="header-right">
          <SaveIndicator />
          <LanguageSwitcher compact />
          <span className="eyebrow">
            {t("game", "A JOURNEY BEYOND THE BREACH")}
          </span>
          <button className="quiet-button" onClick={requestLeave} type="button">
            {returnToHaven
              ? t("journey", "RETURN TO RIFT HEAVEN")
              : t("game", "← MAIN MENU")}{" "}
          </button>
        </div>
      </header>
      <section className="content">
        <div className="run-heading hero">
          <div>
            <span className="eyebrow">
              {farming
                ? t("haven", "Farming Expedition")
                : definition
                  ? `${text(world!.name).toUpperCase()} / ${t("game", "STAGE")} ${definition.number}`
                  : t("game", "CHAPTER I / THE FIRST BREACH")}
            </span>
            <h1>
              {world ? (
                text(world.name)
              ) : (
                <>
                  {t("main", "Whispering")} <em>{t("main", "Forest")}</em>
                </>
              )}
            </h1>
          </div>
          <p>
            {farming ? (
              t(
                "haven",
                "Extraction requires 20 seconds and 5 kills. Return to the portal near your starting point.",
              )
            ) : definition && stage ? (
              `${text(definition.name)} · ${text(stage.difficulty.toUpperCase())} · ${clock(Math.round(definition.clear.seconds * DIFFICULTIES[stage.difficulty].duration))} ${definition.clear.kind === "boss" ? t("game", "then defeat the guardian") : t("game", "survival")}`
            ) : (
              <>
                {t("game", "Survive until")} <strong>08:00</strong>
                {t("game", ". Defeat the Forest Guardian.")}{" "}
              </>
            )}
          </p>
        </div>
        <section
          className="game-card"
          aria-label={t("game", "NowRift playable game")}
        >
          <div className="game-topbar">
            <div className="sector-heading">
              {characterName && (
                <span className="run-identity">{characterName}</span>
              )}
              <span className="live-dot" />{" "}
              {text(world?.name ?? "Whispering Forest").toUpperCase()}{" "}
              <span className="game-state">
                {hud.phase === "playing"
                  ? t("game", "LIVE RUN")
                  : text(hud.phase.toUpperCase())}
              </span>
            </div>
            <div className="game-actions">
              <button
                className="action-button"
                onClick={pause}
                disabled={
                  saveBlocked ||
                  !ready ||
                  !["playing", "paused"].includes(hud.phase)
                }
                type="button"
              >
                {hud.phase === "paused"
                  ? t("game", "RESUME")
                  : t("game", "PAUSE")}
              </button>
              <button
                className="action-button"
                onClick={() => setImmersive((v) => !v)}
                aria-label={
                  immersive
                    ? t("game", "Exit focus mode")
                    : t("game", "Enter focus mode")
                }
                aria-pressed={immersive}
                type="button"
              >
                {immersive ? t("game", "EXIT FOCUS") : t("game", "FOCUS")}
              </button>
              <button
                className="action-button"
                aria-label={t("game", "Settings")}
                onClick={openSettings}
                type="button"
              >
                {t("game", "SETTINGS")}{" "}
              </button>
              <button
                className="action-button"
                onClick={start}
                disabled={!ready || starting}
                type="button"
              >
                {t("game", "RESTART")}{" "}
              </button>
              <button
                className="action-button compact-menu"
                onClick={requestLeave}
                type="button"
              >
                {t("game", "MAIN MENU")}{" "}
              </button>
            </div>
          </div>
          <div className="hud-row">
            <div className="level-shape">
              <small>{t("game", "LEVEL")}</small>
              <strong>{String(hud.level).padStart(2, "0")}</strong>
            </div>
            <div className="bars">
              <div className="bar-heading">
                <span>
                  {text(
                    CHARACTERS[loadout?.character ?? "wanderer"].name,
                  ).toUpperCase()}
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
                [t("game", "TIME"), clock(hud.time)],
                [t("game", "KILLS"), hud.kills],
                [t("game", "ENEMIES"), hud.enemies],
              ].map(([label, value]) => (
                <div className="stat" key={label}>
                  <span className="stat-label">{label}</span>
                  <strong className="stat-value">{value}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="arena">
            {farming && expedition && hud.phase === "playing" && (
              <div className="expedition-context">
                {expedition.target ? (
                  <button
                    disabled={
                      expedition.target === "extract" && !expedition.ready
                    }
                    onClick={() =>
                      bridge.emit("command", { type: "expedition-interact" })
                    }
                  >
                    {t(
                      "haven",
                      expedition.target === "extract"
                        ? "Extract to Rift Heaven"
                        : expedition.target === "fallen-wood"
                          ? "Gather fallen wood"
                          : expedition.target === "slime-nest"
                            ? "Gather slime residue"
                            : "Mine copper",
                    )}{" "}
                    <kbd>E</kbd>
                  </button>
                ) : (
                  <p>
                    {t(
                      "haven",
                      expedition.ready
                        ? "Return to the marked portal to extract."
                        : "Reach 20 seconds and 5 kills to extract.",
                    )}
                  </p>
                )}
              </div>
            )}
            {hud.statuses.length > 0 && (
              <span className="campaign-status">
                {hud.statuses.map(text).join(" · ")}
              </span>
            )}
            <PhaserHost key={attempt} bridge={bridge} world={world?.id} />
            {!ready && !returnToHaven && (
              <div className="arena-overlay">
                <span className="eyebrow">
                  {t("game", "ENTERING THE FOREST")}
                </span>
                <h2>{t("game", "Through the veil…")}</h2>
                <progress
                  max={1}
                  value={loading}
                  aria-label={t("game", "Loading game assets")}
                />
                <p>
                  {Math.round(loading * 100)}% ·{" "}
                  {t("game", "Preparing your journey")}
                </p>
                {error && <p role="alert">{text(error)}</p>}
              </div>
            )}
            {hud.boss && (
              <div
                className="boss-hud"
                aria-label={`${text(world?.boss.name ?? "Forest Guardian")} ${t("game", "health")}`}
              >
                <span>
                  {world?.boss.name.toUpperCase() ??
                    t("game", "FOREST GUARDIAN")}{" "}
                  <small>
                    {hud.boss.phase === 2
                      ? t("game", "ENRAGED · PHASE II")
                      : t("game", "THE ANCIENT WARDEN")}
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
                    ? t("game", "THE FOREST STIRS")
                    : hud.time < 240
                      ? t("game", "THE HUNT BEGINS")
                      : hud.time < 360
                        ? t("game", "THORNS AWAKEN")
                        : hud.time < 480
                          ? t("game", "THE LAST STAND")
                          : t("game", "BREAK THE GUARDIAN")}
                </span>
                <span className="touch-hint">
                  {touch ? t("game", "MOVING") : t("game", "DRAG TO MOVE")}
                </span>
              </>
            )}
            {revealed &&
              hud.phase === "paused" &&
              !confirmLeave &&
              !settings && (
                <DialogSurface
                  className="arena-overlay"
                  title={t("game", "Paused")}
                  onClose={pause}
                >
                  <span className="eyebrow">{t("game", "TAKE A BREATH")}</span>
                  <h2>{t("game", "Paused")}</h2>
                  <p>{t("game", "The forest will wait.")}</p>
                  {stage && (
                    <div
                      className="run-tonics"
                      aria-label="Campaign consumables"
                    >
                      <button
                        className="rpg-button"
                        disabled={
                          tonicBusy ||
                          !tonics["health-tonic"] ||
                          hud.hp >= hud.maxHp
                        }
                        onClick={() => void useTonic("health-tonic")}
                      >
                        {text("CRIMSON TONIC")} ×{tonics["health-tonic"] ?? 0}
                        <small>{text("Restore 35 HP")}</small>
                      </button>
                      <button
                        className="rpg-button"
                        disabled={tonicBusy || !tonics["focus-tonic"]}
                        onClick={() => void useTonic("focus-tonic")}
                      >
                        {text("AZURE TONIC")} ×{tonics["focus-tonic"] ?? 0}
                        <small>{text("30% faster attacks / 20s")}</small>
                      </button>
                    </div>
                  )}
                  {tonicBusy && <p role="status">{text("Using tonic…")}</p>}
                  <button
                    className="primary-button"
                    onClick={pause}
                    disabled={saveBlocked || tonicBusy}
                    type="button"
                  >
                    {t("game", "RESUME RUN")} <span>→</span>
                  </button>
                  <button
                    className="quiet-button"
                    onClick={openSettings}
                    type="button"
                  >
                    {t("game", "Settings")}{" "}
                  </button>
                  <button
                    className="quiet-button"
                    onClick={requestLeave}
                    type="button"
                  >
                    {t("game", "Return to main menu")}{" "}
                  </button>
                </DialogSurface>
              )}
            {revealed &&
              hud.phase === "upgrade" &&
              !confirmLeave &&
              !settings && (
                <DialogSurface
                  className="arena-overlay upgrade-overlay"
                  title={t("game", "Choose an upgrade")}
                >
                  <span className="eyebrow">
                    {t("game", "LEVEL")} {hud.level} /{" "}
                    {t("game", "A NEW AWAKENING")}
                  </span>
                  <h2>
                    {t("game", "Choose your")} <em>{t("game", "power.")}</em>
                  </h2>
                  <p>{t("game", "One choice. A different path.")}</p>
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
                            {t("game", "BLESSING")} ·{" "}
                            {(hud.stacks[id] ?? 0) + 1}/{u.max}
                          </span>
                          <PixelIcon index={u.icon} large />
                          <strong>{text(u.name)}</strong>
                          <small>{text(u.description)}</small>
                          {hud.equippedWeapon &&
                            ["slash", "sweep"].includes(
                              hud.equippedWeapon.attack.kind ?? "",
                            ) &&
                            ["velocity", "multishot"].includes(id) && (
                              <small>
                                {t(
                                  "equipment",
                                  "Melee weapons gain reach from velocity and stronger strikes from extra projectiles.",
                                )}
                              </small>
                            )}
                          <span className="upgrade-select">
                            {t("game", "EMBRACE →")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </DialogSurface>
              )}
            {revealed && terminal && (
              <DialogSurface
                className="arena-overlay results-overlay"
                title={
                  hud.phase === "victory"
                    ? t("game", "Victory")
                    : t("game", "Defeat")
                }
              >
                <span className="eyebrow">
                  {hud.phase === "victory"
                    ? t("game", "THE FOREST REMEMBERS")
                    : t("game", "EVERY END IS A BEGINNING")}
                </span>
                <h2>
                  {farming
                    ? t(
                        "haven",
                        hud.phase === "victory"
                          ? "Expedition complete"
                          : "Expedition lost",
                      )
                    : hud.phase === "victory"
                      ? t("game", "The veil is lifted.")
                      : t("game", "Your light fades.")}
                </h2>
                <p>
                  {farming
                    ? !reward
                      ? t("haven", "Saving expedition results…")
                      : t(
                          "haven",
                          hud.phase === "victory"
                            ? "Your supplies are banked. Return to Rift Heaven to craft and rest."
                            : "Unbanked expedition loot was lost. Previously owned items are safe.",
                        )
                    : hud.phase === "victory"
                      ? definition
                        ? t(
                            "game",
                            "Stage cleared. Campaign rewards are banked locally.",
                          )
                        : t(
                            "game",
                            "Forest Guardian defeated. +150 victory gold.",
                          )
                      : t("game", "The Rift Wanderer will rise again.")}
                </p>
                {reward && (
                  <p className="campaign-reward" role="status">
                    {reward.firstClear
                      ? t("game", "FIRST CLEAR · ")
                      : t("game", "FARMING REWARDS · ")}
                    {reward.gold} {t("main", "gold")} · {reward.xp} XP
                    <br />
                    {reward.equipmentCount ?? 0} equipment ·{" "}
                    {reward.overflow ?? 0} protected overflow parcels
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
                      <small>{t("game", "GUARDIAN RELIC EARNED")}</small>
                      <strong>{text(RELICS[id as RelicId]?.name ?? id)}</strong>
                    </span>
                  </div>
                ))}
                <div className="result-row">
                  <span>
                    <strong>{clock(hud.time)}</strong>
                    {t("game", "SURVIVED")}{" "}
                  </span>
                  <span>
                    <strong>{hud.kills}</strong>
                    {t("game", "ENEMIES SLAIN")}{" "}
                  </span>
                  <span>
                    <strong>{stage ? (reward?.gold ?? "…") : hud.gold}</strong>
                    {text(stage ? "BANKED GOLD" : "PRACTICE SCORE")}
                  </span>
                </div>
                <p className="save-message" role="status">
                  {text(save)}
                </p>
                <button
                  className="primary-button"
                  onClick={start}
                  disabled={starting}
                  type="button"
                >
                  {t("game", "TRY AGAIN")} <span>→</span>
                </button>
                <button
                  className="quiet-button"
                  onClick={() => void leave()}
                  type="button"
                >
                  {returnToHaven
                    ? t("journey", "RETURN TO RIFT HEAVEN")
                    : t("game", "RETURN TO MAIN MENU")}{" "}
                </button>
                <small className="muted">
                  {stage
                    ? "Earned gold, materials and equipment are banked for your RPG inventory. Gear changes apply when a new campaign run starts."
                    : "Practice gold is a run score. Enter the World Map campaign to earn permanent inventory rewards."}
                </small>
              </DialogSurface>
            )}
          </div>
          {farming && expedition && (
            <p className="expedition-ledger">
              {t("haven", "UNBANKED EXPEDITION")} ·{" "}
              {expedition.gathered
                .map((id) => {
                  const n = farmingNodes(stage?.stageId).find((n) => n.id === id)!;
                  return `${text(ITEMS[n.item].name)} ×${n.amount}`;
                })
                .join(" · ")}
              <br />
              {t(
                "haven",
                "Successful extraction banks enemy loot and gathered supplies. Defeat or abandonment loses unbanked loot. Your owned equipment is safe.",
              )}
            </p>
          )}
          <div className="arena-footer">
            <div className="active-weapon">
              {hud.equippedWeapon ? (
                <ItemIcon id={hud.equippedWeapon.definitionId} />
              ) : (
                <PixelIcon index={WEAPONS[hud.weaponId].icon} />
              )}
              <span>
                <strong
                  style={
                    hud.equippedWeapon
                      ? { color: RARITIES[hud.equippedWeapon.rarity].color }
                      : undefined
                  }
                >
                  {hud.equippedWeapon
                    ? `${text(hud.equippedWeapon.name)} +${hud.equippedWeapon.enhancement}`
                    : text(WEAPONS[hud.weaponId].name)}
                </strong>
                <small>
                  {hud.damage.toFixed(1)} {t("game", "DMG")} ·{" "}
                  {hud.interval.toFixed(2)}s · {Math.round(hud.crit * 100)}%{" "}
                  {t("game", "CRIT")}
                  {hud.equippedWeapon &&
                    ` · ${text(RARITIES[hud.equippedWeapon.rarity].name)} · ${t("equipment", "Range")} ${Math.round(hud.range)}`}
                  {stage &&
                    !hud.equippedWeapon &&
                    ` · ${t("equipment", "Legacy attack snapshot")}`}
                </small>
              </span>
            </div>
            <div className="control-hint">
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd>
              <span>{t("game", "MOVE")}</span>
              <kbd>ESC</kbd>
              <span>{t("game", "PAUSE")}</span>
            </div>
            <span className="auto-attack">
              {t("game", "AUTO ATTACK ACTIVE")}
            </span>
          </div>
        </section>
        {error && ready && (
          <div role="alert" className="notice">
            {error}
            {saveBlocked && (
              <button
                className="quiet-button"
                onClick={() => bridge.emit("command", { type: "checkpoint" })}
              >
                {text("Retry checkpoint")}
              </button>
            )}
          </div>
        )}
        <p className="field-note">
          {t("game", "FIELD NOTES")}{" "}
          <span>
            {t(
              "game",
              "Collect emerald crystals to grow stronger. Red roots warn of an incoming strike. Keep moving.",
            )}{" "}
          </span>
        </p>
      </section>
      {settings && <Settings onClose={closeSettings} />}
      {confirmLeave && (
        <Modal title="Return to hub" onClose={cancelLeave}>
          <span className="eyebrow">{t("game", "LEAVE THE FOREST?")}</span>
          <h2>{t("game", "Return to hub?")}</h2>
          <p>
            {farming
              ? t(
                  "haven",
                  "Abandoning loses all unbanked expedition loot. Previously owned items stay safe.",
                )
              : t(
                  "game",
                  "Your active run will end. Completed run records and your best score remain on this device.",
                )}{" "}
          </p>
          <div className="dialog-actions">
            <button
              className="quiet-button"
              onClick={cancelLeave}
              type="button"
            >
              {t("game", "CONTINUE RUN")}{" "}
            </button>
            <button
              className="primary-button"
              onClick={() => void leave()}
              type="button"
            >
              {t("game", "EXIT TO HUB →")}{" "}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
