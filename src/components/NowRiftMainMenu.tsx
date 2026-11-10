"use client";
import ProfileScreen from "./ProfileScreen";
import SaveIndicator from "./SaveIndicator";
import { profileRepository } from "@/game/persistence/repository";
import type { SaveData } from "@/game/persistence/model";
import type { RunCheckpoint } from "@/game/persistence/checkpoint";
import { enterPreferredFullscreen } from "@/game/persistence/display";
import { practiceLoadout, characterLevel } from "@/game/rpg/stats";
import RpgScreen from "./RpgScreen";
import LanguageSwitcher from "./LanguageSwitcher";
import Image from "next/image";
import { useI18n } from "@/i18n/useI18n";
import Atmosphere from "./Atmosphere";
import { CharacterSelection } from "./Sanctuary";
import { CHARACTERS, type CharacterId, type Loadout } from "@/game/loadout";
import { campaignRepository } from "@/game/campaign/persistence";
import { emptyProgress, type Progress } from "@/game/campaign/progression";
import WorldMap from "./WorldMap";
import { audio } from "@/game/audio/engine";
import type { StageSelection } from "@/game/campaign/loader";

import { useCallback, useEffect, useMemo, useState } from "react";
import NowRiftGame from "./NowRiftGame";
import PwaControls from "./PwaControls";
import { Brand, Modal, PixelIcon, Settings, clock } from "./GameUi";
import { WEAPONS, type WeaponId } from "@/game/content/forest";
import { runRepository } from "@/game/services/saves";
import type { RunResult } from "@/game/bridge";
import { useSettings } from "@/state/settings";
export default function NowRiftMainMenu() {
  const { t, text, date, plural } = useI18n();
  const [screen, setScreen] = useState<
    "gateway" | "lobby" | "game" | "worlds" | "rpg" | "profile"
  >("gateway");
  useEffect(() => {
    window.scrollTo(0, 0);
    audio.setScene(
      screen === "gateway"
        ? "menu"
        : screen === "game"
          ? "exploration"
          : "character",
    );
  }, [screen]);
  const [character, setCharacter] = useState<CharacterId>("wanderer");
  const [characterOpen, setCharacterOpen] = useState(false);
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const closeCharacter = useCallback(() => setCharacterOpen(false), []);
  const loadout: Loadout = useMemo(
    () => practiceLoadout(progress, character),
    [character, progress],
  );
  const [selection, setSelection] = useState<StageSelection | undefined>();
  const [recovery, setRecovery] = useState<RunCheckpoint | undefined>();
  const onProfileChange = useCallback((p: SaveData) => {
    setProgress(p);
    setCharacter(p.local.character);
    setWeapon(p.local.weapon);
  }, []);
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
    campaignRepository
      .load()
      .then((p) => {
        if (!cancelled) {
          setProgress(p);
          if (p.local) {
            setCharacter(p.local.character);
            setWeapon(p.local.weapon);
            setBest(p.local.stats.bestKills);
            if (p.local.legacyWarning) setWarning(p.local.legacyWarning);
          }
          void runRepository
            .list(p.local?.id)
            .then(setRuns)
            .catch((e) => setWarning(String(e)));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWarning(
            "Campaign storage is unavailable. Survival remains playable; existing data was preserved.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [screen]);
  if (screen === "profile")
    return (
      <ProfileScreen
        onBack={() => setScreen("lobby")}
        onChanged={onProfileChange}
        onResume={(save, checkpoint) => {
          enterPreferredFullscreen();
          onProfileChange(save);
          setSelection(checkpoint.stage);
          setWeapon(checkpoint.weapon);
          setRecovery(checkpoint);
          setScreen("game");
        }}
      />
    );
  if (screen === "rpg")
    return (
      <RpgScreen
        weapon={weapon}
        character={character}
        onBack={() => setScreen("lobby")}
      />
    );
  if (screen === "worlds")
    return (
      <main className="nr-main">
        <header className="topbar">
          <Brand />
          <SaveIndicator />
          <LanguageSwitcher compact />
        </header>
        <WorldMap
          weapon={weapon}
          character={character}
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
      <>
        <NowRiftGame
          autoStart
          slotId={progress.local?.id}
          recovery={recovery}
          loadout={loadout}
          stage={selection}
          weapon={weapon}
          onExitToMenu={(message) => {
            if (message) setWarning(message);
            setScreen("lobby");
          }}
        />
      </>
    );
  return (
    <main className="nr-main">
      <header className="topbar">
        <Brand />
        <div className="header-right">
          <span className="build-tag">
            {t("main", "GUEST EDITION")} <span>·</span>{" "}
            {t("main", "LOCAL ADVENTURE")}{" "}
          </span>
          <SaveIndicator />
          <LanguageSwitcher compact />
          <PwaControls />
          <button
            className="quiet-button"
            aria-label={t("main", "Settings")}
            onClick={() => setSettings(true)}
            type="button"
          >
            {t("main", "SETTINGS")}{" "}
          </button>
        </div>
      </header>
      {screen === "gateway" ? (
        <div className="gateway">
          <div className="gateway-art" aria-hidden="true" />
          <Atmosphere />
          <div className="gateway-content">
            <Image
              src="/branding/nowrift-logo-transparent.png"
              width={384}
              height={384}
              className="gateway-official-logo"
              alt="NowRift official fantasy pixel-art logo"
              priority
              unoptimized
            />
            <span className="eyebrow">
              <span className="eyebrow-rule" />{" "}
              {t("main", "A LIGHT IN THE FORGOTTEN WOODS")}{" "}
            </span>
            <h1>
              {t("main", "Beyond the breach.")} <br />
              <em>{t("main", "Into the unknown.")}</em>
            </h1>
            <p>
              {t("main", "An ancient forest. A thousand restless souls.")}{" "}
              <br />
              {t("main", "One wanderer standing between worlds.")}{" "}
            </p>
            <button
              className="primary-button gateway-enter"
              onClick={() => setScreen("lobby")}
              type="button"
            >
              {t("main", "CONTINUE AS GUEST")} <span>→</span>
            </button>
            <small className="gateway-note">
              {t("main", "No account. No connection required after caching.")}{" "}
              <br />
              {t("main", "Your run records stay on this device.")}{" "}
            </small>
          </div>
          <div className="gateway-bottom">
            <span>{t("main", "01 — WHISPERING FOREST")}</span>
            <span>{t("main", "AN ORIGINAL PIXEL-ART ADVENTURE")}</span>
          </div>
        </div>
      ) : (
        <div className="hub-layout">
          <aside className="hub-sidebar">
            <span className="eyebrow">{t("main", "YOUR SANCTUARY")}</span>
            <h2>
              {t("main", "The Hub")}
              <span className="gold">.</span>
            </h2>
            <nav aria-label={t("main", "Main navigation")}>
              <button
                className="nav-button"
                onClick={() => setScreen("profile")}
              >
                {text("PROFILE & SAVES")}
                <span>↗</span>
              </button>
              <button
                className="nav-button"
                onClick={() => setScreen("worlds")}
              >
                {t("main", "WORLD MAP →")}{" "}
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
                {t("main", "Embark")}
                <span>01</span>
              </button>
              <button
                className="nav-button"
                type="button"
                onClick={() => setCharacterOpen(true)}
              >
                <PixelIcon index={4} />
                {t("main", "Wanderer")}
                <span>↗</span>
              </button>
              <button
                className="nav-button"
                type="button"
                onClick={() => setScreen("rpg")}
              >
                <PixelIcon index={7} />
                {t("main", "Inventory & equipment")}
                <span>↗</span>
              </button>
              <button
                className="nav-button"
                onClick={() => setHistory(true)}
                type="button"
              >
                <PixelIcon index={5} />
                {t("main", "Run records")}
                <span>{runs.length}</span>
              </button>
              <button
                className="nav-button"
                onClick={() => setControls(true)}
                type="button"
              >
                <PixelIcon index={4} />
                {t("main", "Field manual")}
                <span>↗</span>
              </button>
            </nav>
            <div className="wanderer-card">
              <span
                className={`portrait character-${character}`}
                aria-hidden="true"
              />
              <span className="eyebrow">{t("main", "LOCAL ADVENTURER")}</span>
              <strong>{text(CHARACTERS[character].name)}</strong>
              <small>{t("main", "Some journeys begin alone.")}</small>
              <div className="nr-record">
                <span>{t("main", "PERSONAL BEST")}</span>
                <strong>
                  {String(best).padStart(3, "0")}{" "}
                  <small>{t("main", "KILLS")}</small>
                </strong>
              </div>
              <button
                className="quiet-button"
                onClick={() => setScreen("gateway")}
                type="button"
              >
                {t("main", "← CHANGE MODE")}{" "}
              </button>
            </div>
          </aside>
          <section className="hub-main">
            <div className="hub-heading">
              <div>
                <span className="eyebrow">
                  {t("main", "YOUR NEXT CHAPTER")}
                </span>
                <h1>
                  {t("main", "The forest")} <em>{t("main", "is calling.")}</em>
                </h1>
              </div>
              <span className="local-badge">
                <span className="live-dot" /> {t("main", "SINGLE PLAYER")}{" "}
              </span>
            </div>
            <section className="expedition-card" aria-labelledby="forest-title">
              <div className="expedition-art" aria-hidden="true" />
              <Atmosphere />
              <div className="expedition-top">
                <span className="chapter-badge">{t("main", "CHAPTER I")}</span>
                <span className="region-tag">
                  {t("main", "THE VERDANT FRONTIER")}
                </span>
              </div>
              <div className="expedition-copy">
                <span className="eyebrow">
                  {t("main", "SURVIVAL / BOSS ENCOUNTER")}
                </span>
                <h2 id="forest-title">
                  {t("main", "Whispering")} <br />
                  <em>{t("main", "Forest")}</em>
                </h2>
                <p>
                  {t("main", "Something ancient stirs beneath the canopy.")}{" "}
                  <br />
                  {t(
                    "main",
                    "Gather your strength. Break the Guardian’s hold.",
                  )}{" "}
                </p>
                <div className="expedition-meta">
                  <span>
                    <b>08</b> {t("main", "MINUTES TO BOSS")}{" "}
                  </span>
                  <span>
                    <b>05</b> {t("main", "ENEMY ARCHETYPES")}{" "}
                  </span>
                  <span>
                    <b>01</b> {t("main", "ANCIENT GUARDIAN")}{" "}
                  </span>
                </div>
              </div>
              <span className="art-coordinate" aria-hidden="true">
                {t("main", "N 48° 12′ · THE FIRST BREACH")}{" "}
              </span>
            </section>
            <button
              className="primary-button campaign-entry"
              onClick={() => setScreen("worlds")}
            >
              {t("main", "OPEN WORLD MAP · 20 STAGES →")}{" "}
            </button>
            <div className="loadout-heading">
              <div>
                <span className="eyebrow">
                  {t("main", "YOUR STARTING COMPANION")}
                </span>
                <h3>{t("main", "Choose your weapon")}</h3>
              </div>
              <span className="muted">
                {t("main", "Each path plays differently.")}
              </span>
            </div>
            <div className="weapon-grid">
              {(Object.keys(WEAPONS) as WeaponId[]).map((id) => {
                const w = WEAPONS[id];
                return (
                  <button
                    className={`weapon-card ${weapon === id ? "selected" : ""}`}
                    aria-pressed={weapon === id}
                    key={id}
                    onClick={() => {
                      setWeapon(id);
                      void profileRepository
                        .configure({ weapon: id }, progress.local?.id)
                        .then(setProgress)
                        .catch((e) => setWarning(String(e)));
                    }}
                    type="button"
                  >
                    <span className="weapon-number">0{w.icon + 1}</span>
                    <PixelIcon index={w.icon} large />
                    <strong>{text(w.name)}</strong>
                    <small>{text(w.description)}</small>
                    <span className="weapon-footer">
                      {weapon === id
                        ? t("main", "EQUIPPED")
                        : t("main", "SELECT WEAPON")}
                      <span>{weapon === id ? "✓" : "+"}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {progress.local && (
              <p className="profile-subtitle">
                {progress.local.name} · {text("Level")}{" "}
                {characterLevel(progress.xp).level}{" "}
                <button
                  className="quiet-button"
                  onClick={() => setScreen("profile")}
                >
                  {text("PROFILES & DAILY REWARDS →")}
                </button>
              </p>
            )}
            {progress.local?.checkpoint && (
              <div className="profile-lobby-recovery">
                <div>
                  <strong>{text("Saved run available")}</strong>
                  <p>
                    {clock(Math.floor(progress.local.checkpoint.state.time))} ·{" "}
                    {text("Resume paused from your latest checkpoint.")}
                  </p>
                </div>
                <button
                  className="rpg-button"
                  onClick={() => setScreen("profile")}
                >
                  {text("RECOVER RUN →")}
                </button>
              </div>
            )}
            <div className="embark-row">
              <p>
                <span className="live-dot" />{" "}
                {t("main", "Survival practice · 8 minutes.")}{" "}
                <small>
                  {CHARACTERS[character].hp} HP · {CHARACTERS[character].speed}{" "}
                  {t("sanctuary", "MOVEMENT")} ·{" "}
                  {loadout.relic
                    ? t("main", "Relic equipped")
                    : t("main", "No relic equipped")}
                </small>
              </p>
              <button
                className="primary-button embark-button"
                onClick={() => {
                  enterPreferredFullscreen();
                  setSelection(undefined);
                  setRecovery(undefined);
                  setScreen("game");
                }}
                type="button"
              >
                {t("main", "START NEW RUN")} <span>→</span>
              </button>
            </div>
            <p className="practice-note">
              {t(
                "main",
                "Campaign rewards and stage unlocks are earned through the World Map.",
              )}{" "}
            </p>
            {warning && (
              <p className="notice" role="status">
                {text(warning)}
              </p>
            )}
          </section>
        </div>
      )}
      <footer className="site-footer">
        <span>
          NOWRIFT <span className="gold">/</span>{" "}
          {t("main", "A WORLD BETWEEN WORLDS")}{" "}
        </span>
        <span>{t("main", "FOUR WORLDS · GUEST ONLY · NO CLOUD SAVE")}</span>
      </footer>
      {characterOpen && (
        <CharacterSelection
          selected={character}
          onSelect={(id) => {
            setCharacter(id);
            try {
              void profileRepository
                .configure({ character: id }, progress.local?.id)
                .then(setProgress)
                .catch((e) => setWarning(String(e)));
            } catch {
              /* session choice */
            }
          }}
          onClose={closeCharacter}
        />
      )}
      {settings && <Settings onClose={closeSettings} />}
      {controls && (
        <Modal title={t("main", "How to survive")} onClose={closeControls}>
          <span className="eyebrow">
            {t("main", "THE WANDERER’S FIELD MANUAL")}
          </span>
          <h2>{t("main", "How to survive")}</h2>
          <div className="manual-row">
            <strong>{t("main", "MOVE")}</strong>
            <span>
              {t(
                "main",
                "WASD, arrow keys, or touch and drag anywhere on the arena. Movement is normalized diagonally.",
              )}{" "}
            </span>
          </div>
          <div className="manual-row">
            <strong>{t("main", "ATTACK")}</strong>
            <span>
              {t(
                "main",
                "Your selected weapon attacks nearby enemies automatically. Daggers favor close range; Frost Pulse slows enemies around you.",
              )}{" "}
            </span>
          </div>
          <div className="manual-row">
            <strong>{t("main", "GROW")}</strong>
            <span>
              {t(
                "main",
                "Collect emerald XP crystals. Choose one blessing each level. Red crystals heal you.",
              )}{" "}
            </span>
          </div>
          <div className="manual-row">
            <strong>{t("main", "SURVIVE")}</strong>
            <span>
              {t(
                "main",
                "Use Pause or Escape. Focus mode fills your screen. Red root circles warn before the Guardian strikes.",
              )}{" "}
            </span>
          </div>
          <div className="manual-row">
            <strong>{t("main", "WIN")}</strong>
            <span>
              {t(
                "main",
                "At eight minutes, defeat the Forest Guardian. At half health it enrages. Interrupted runs can resume from a checkpoint in Profile & Saves. Exiting to the Hub discards the unfinished run.",
              )}{" "}
            </span>
          </div>
          <button
            className="primary-button"
            onClick={closeControls}
            type="button"
          >
            {t("main", "UNDERSTOOD →")}{" "}
          </button>
        </Modal>
      )}
      {history && (
        <Modal title={t("main", "Run records")} onClose={closeHistory}>
          <span className="eyebrow">{t("main", "REMEMBER EVERY JOURNEY")}</span>
          <h2>{t("main", "Run records")}</h2>
          <p className="muted">
            {t(
              "main",
              "Your latest 20 completed runs, saved only on this device.",
            )}{" "}
          </p>
          {runs.length ? (
            <div className="run-records">
              {runs.map((r) => (
                <div className="run-record" key={r.id}>
                  <PixelIcon index={WEAPONS[r.weapon].icon} />
                  <span>
                    <strong>
                      {r.outcome === "victory"
                        ? t("main", "Guardian defeated")
                        : t("main", "Wanderer fallen")}
                    </strong>
                    <small>
                      {text(WEAPONS[r.weapon].name)} · {date(r.at)}
                    </small>
                  </span>
                  <b>
                    {r.kills}{" "}
                    {plural(r.kills, {
                      one: t("main", "kill"),
                      other: t("main", "kills"),
                    })}
                    <small>
                      {clock(r.seconds)} · {r.gold}{" "}
                      {text(r.campaign ? "gold" : "score")}
                    </small>
                  </b>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-record">
              {t("main", "Your story is unwritten.")} <br />
              {t("main", "Complete a run to leave your first mark.")}{" "}
            </p>
          )}
          {warning && <p className="notice">{text(warning)}</p>}
        </Modal>
      )}
    </main>
  );
}
