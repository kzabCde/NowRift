"use client";
import type { CharacterId } from "@/game/loadout";
import {
  calculateStats,
  campaignLoadout,
  characterLevel,
  resolveEquippedWeapon,
} from "@/game/rpg/stats";
import EquippedWeapon from "./EquippedWeapon";
import CharacterPreview from "./CharacterPreview";
import { useI18n } from "@/i18n/useI18n";
import Atmosphere from "./Atmosphere";
import { audio } from "@/game/audio/engine";
import { useEffect, useState } from "react";
import {
  WORLDS,
  STAGES,
  DIFFICULTIES,
  worldById,
  type WorldId,
  type DifficultyId,
} from "@/game/campaign/content";
import {
  emptyProgress,
  lockedReason,
  clearKey,
  type Progress,
} from "@/game/campaign/progression";
import { campaignRepository } from "@/game/campaign/persistence";
import type { StageSelection } from "@/game/campaign/loader";
import { CHAPTERS, missionById } from "@/game/story/content";
import { enemyScale } from "@/game/campaign/scaling";
import { ITEMS } from "@/game/rpg/content";
export default function WorldMap({
  onStart,
  onBack,
  character = "wanderer",
  onInventory,
  initialMode = "story",
}: {
  initialMode?: "story" | "free";
  onStart: (selection: StageSelection) => void;
  onBack: () => void;
  character?: CharacterId;
  onInventory: () => void;
}) {
  const { t, text } = useI18n();
  const [mode, setMode] = useState<"story" | "free">(initialMode);
  const [world, setWorld] = useState<WorldId>("forest"),
    [difficulty, setDifficulty] = useState<DifficultyId>("normal"),
    [selected, setSelected] = useState("forest-1");
  const [progress, setProgress] = useState<Progress>(emptyProgress),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    campaignRepository
      .load()
      .then((p) => {
        if (!cancelled) {
          setProgress(p);
          setReady(true);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    audio.setScene("character", world);
  }, [world]);
  const legacyAccess = progress.local?.journal?.legacyAccess ?? [];
  const mission = missionById(selected);
  const chapter = CHAPTERS.find((c) => c.id === world)!;
  const w = worldById(world),
    equipped = resolveEquippedWeapon(progress, character),
    stage = STAGES.find((s) => s.id === selected)!,
    playerLevel = characterLevel(progress.xp).level,
    enemyMinimum = enemyScale(
      playerLevel,
      stage.worldId,
      stage.number,
      "slime",
    ).level,
    enemyMaximum = enemyScale(
      playerLevel,
      stage.worldId,
      stage.number,
      "boss",
    ).level,
    reason = lockedReason(selected, difficulty, progress.clears, legacyAccess);
  return (
    <section className="world-map">
      <div className="hub-heading">
        <div>
          <span className="eyebrow">
            {t("world", "THE SHATTERED ATLAS / CAMPAIGN")}
          </span>
          <h1>
            {t("world", "Worlds beyond")} <em>{t("world", "the veil.")}</em>
          </h1>
        </div>
        <button className="quiet-button" onClick={onBack}>
          {t("world", "← HUB")}{" "}
        </button>
      </div>
      <div
        role="group"
        aria-label={text("Game mode")}
        style={{ display: "flex", gap: 12, marginBottom: 16 }}
      >
        <button
          className={mode === "story" ? "primary-button" : "quiet-button"}
          aria-pressed={mode === "story"}
          onClick={() => setMode("story")}
        >
          {text("Story Mode")}
        </button>
        <button
          className={mode === "free" ? "primary-button" : "quiet-button"}
          aria-pressed={mode === "free"}
          onClick={() => setMode("free")}
        >
          {text("Free Mode · Supply Expeditions")}
        </button>
      </div>
      <div className="world-cards">
        {WORLDS.map((w, i) => {
          const done = STAGES.filter(
            (s) =>
              s.worldId === w.id &&
              progress.clears.includes(clearKey(s.id, difficulty)),
          ).length;
          return (
            <button
              key={w.id}
              className={`world-card ${world === w.id ? "selected" : ""}`}
              aria-pressed={world === w.id}
              onClick={() => {
                setWorld(w.id);
                setSelected(`${w.id}-1`);
              }}
              style={{
                backgroundImage: `linear-gradient(0deg,#0e1918,transparent),url(/assets/worlds/${w.id}/preview.png)`,
              }}
            >
              <Atmosphere world={w.id} />
              <span>
                {t("world", "WORLD")} 0{i + 1} ·{" "}
                {lockedReason(
                  `${w.id}-1`,
                  difficulty,
                  progress.clears,
                  legacyAccess,
                )
                  ? t("world", "LOCKED")
                  : t("world", "OPEN")}
              </span>
              <strong>{text(w.name)}</strong>
              <small>
                {Math.round(
                  (done / STAGES.filter((s) => s.worldId === w.id).length) *
                    100,
                )}
                % {t("world", "COMPLETE")} · {t("world", "POWER")} {10 + i * 30}
                +
              </small>
            </button>
          );
        })}
      </div>
      <div className="campaign-panel">
        <div className="campaign-copy">
          <span className="eyebrow">{text(w.architecture.toUpperCase())}</span>
          <h2>{text(w.name)}</h2>
          <p>{text(w.description)}</p>
          {mode === "story" && (
            <>
              <h3>{text(chapter.title.en)}</h3>
              <p>{text(chapter.introduction.en)}</p>
            </>
          )}
          <div
            className="difficulty-tabs"
            aria-label={t("world", "Difficulty")}
          >
            {Object.keys(DIFFICULTIES).map((d) => (
              <button
                key={d}
                aria-pressed={difficulty === d}
                className={difficulty === d ? "selected" : ""}
                onClick={() => setDifficulty(d as DifficultyId)}
              >
                {text(d.toUpperCase())}
              </button>
            ))}
          </div>
          <p className="muted">
            {difficulty === "normal"
              ? t("world", "Standard enemies and farming rewards.")
              : difficulty === "hard"
                ? t(
                    "world",
                    "Faster pressure, three-shot volleys, more elites. 1.6× rewards.",
                  )
                : t(
                    "world",
                    "Five-shot volleys, rapid boss cycles, triple hazards. 2.4× rewards.",
                  )}
          </p>
          <h3>{t("world", "Stage selection")}</h3>
          <div className="stage-list">
            {STAGES.filter((s) => s.worldId === world).map((s) => {
              const lock = lockedReason(
                s.id,
                difficulty,
                progress.clears,
                legacyAccess,
              );
              return (
                <button
                  key={s.id}
                  aria-pressed={selected === s.id}
                  className={selected === s.id ? "selected" : ""}
                  onClick={() => setSelected(s.id)}
                >
                  <b>{s.number.toString().padStart(2, "0")}</b>
                  <span>
                    <strong>{text(s.name)}</strong>
                    <small>
                      {(lock ? text(lock) : null) ??
                        (mode === "free"
                          ? t("haven", "Gather supplies and extract")
                          : progress.clears.includes(clearKey(s.id, difficulty))
                            ? t("world", "CLEARED · REPLAY AVAILABLE")
                            : s.clear.kind === "boss"
                              ? t("world", "BOSS ENCOUNTER")
                              : text("Story mission"))}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <aside className="campaign-details">
          <CharacterPreview
            character={character}
            outfit={progress.local?.world?.outfit ?? "moss"}
            weapon={equipped}
            profile={progress}
            decorative
          />
          <EquippedWeapon weapon={equipped} onInventory={onInventory} />
          <div
            role="img"
            aria-label={text(mission?.finale?.name.en ?? w.boss.name)}
            className="boss-preview"
            style={{
              backgroundImage: `url(/assets/worlds/${world}/boss.png)`,
              backgroundSize: "1280px 128px",
              backgroundPosition: "left top",
            }}
          />
          <span className="eyebrow">{t("world", "WORLD GUARDIAN")}</span>
          <h3>{text(mission?.finale?.name.en ?? w.boss.name)}</h3>
          <p>{w.boss.patterns.map(text).join(" · ")}</p>
          <span className="eyebrow">{t("world", "LOCAL ENEMIES")}</span>
          <p>{w.enemies.map((e) => text(e.name)).join(" · ")}</p>
          <hr />
          <h3>{text(stage.name)}</h3>
          <p>
            {text("Player Level")} {playerLevel} · {text("Enemy Level")}{" "}
            {enemyMinimum} – {enemyMaximum}
          </p>
          <p>
            {t("world", "Recommended power")} {stage.recommendedPower}
          </p>
          {mode === "free" ? (
            <p>
              {t(
                "haven",
                "Gather supplies, survive 20 seconds and defeat 5 enemies, then return through the extraction portal.",
              )}
            </p>
          ) : (
            mission && (
              <>
                <p>{text(mission.briefing.en)}</p>
                <ol className="map-mission-objectives">
                  {mission.objectives.map((o) => (
                    <li key={o.id}>{text(o.text.en)}</li>
                  ))}
                </ol>
                {mission.finale && (
                  <small>{text("Three-phase chapter finale")}</small>
                )}
              </>
            )
          )}
          <span className="eyebrow">
            {t("world", "POSSIBLE FARMING REWARDS")}
          </span>
          <p>
            {w.materials.map((id) => text(ITEMS[id].name)).join(" · ")}
            <br />
            {mode === "story" && (
              <>
                {t("world", "Guardian relic:")} {text(w.boss.reward)}
              </>
            )}
          </p>
          <p className="muted">
            {mode === "free"
              ? t(
                  "haven",
                  "Only extracted supplies and enemy loot are stored. Defeat or abandonment loses unbanked supplies.",
                )
              : t(
                  "world",
                  "First clears grant additional gold, XP and materials. Equip guardian relics and enhance them in the sanctuary inventory.",
                )}{" "}
          </p>
          <div className="campaign-wallet">
            {text("YOUR POWER")}{" "}
            {calculateStats(progress, undefined, character).power}
            <br />
            <span data-testid="campaign-gold">
              {progress.gold} {t("world", "GOLD")}
            </span>{" "}
            · {progress.xp} {t("world", "PROFILE XP")}
            <br />
            {Object.entries(progress.materials).map(([id, n]) => (
              <small key={id}>
                {text(id)} ×{n} ·{" "}
              </small>
            ))}
          </div>
          {mode === "free" && (
            <p className="notice" role="status">
              {text(
                "Choose an accessible area to gather supplies and extract. Story progression is not changed.",
              )}
            </p>
          )}
          {reason && (
            <p className="notice" role="status">
              {text(reason)}
            </p>
          )}
          {error && (
            <p role="alert" className="notice">
              {text(error)}
            </p>
          )}
          <button
            className="primary-button"
            disabled={!ready || !!reason || !equipped}
            onClick={() => {
              if (
                !lockedReason(
                  stage.id,
                  difficulty,
                  progress.clears,
                  legacyAccess,
                )
              )
                onStart({
                  stageId: stage.id,
                  mode,
                  missionVersion: mode === "story" ? 1 : 0,
                  legacyAccess,
                  ...(mode === "free" ? { activity: "farming" as const } : {}),
                  difficulty,
                  seed: crypto.getRandomValues(new Uint32Array(1))[0],
                  clears: progress.clears,
                  ...campaignLoadout(progress, undefined, character),
                });
            }}
          >
            {mode === "free"
              ? t("haven", "BEGIN SUPPLY EXPEDITION →")
              : t("world", "START STAGE →")}{" "}
          </button>
        </aside>
      </div>
    </section>
  );
}
