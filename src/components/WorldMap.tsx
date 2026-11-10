"use client";
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
export default function WorldMap({
  onStart,
  onBack,
}: {
  onStart: (selection: StageSelection) => void;
  onBack: () => void;
}) {
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
  const w = worldById(world),
    stage = STAGES.find((s) => s.id === selected)!,
    reason = lockedReason(selected, difficulty, progress.clears);
  return (
    <section className="world-map">
      <div className="hub-heading">
        <div>
          <span className="eyebrow">THE SHATTERED ATLAS / CAMPAIGN</span>
          <h1>
            Worlds beyond <em>the veil.</em>
          </h1>
        </div>
        <button className="quiet-button" onClick={onBack}>
          ← HUB
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
                WORLD 0{i + 1} ·{" "}
                {lockedReason(`${w.id}-1`, difficulty, progress.clears)
                  ? "LOCKED"
                  : "OPEN"}
              </span>
              <strong>{w.name}</strong>
              <small>
                {done * 20}% COMPLETE · POWER {10 + i * 30}+
              </small>
            </button>
          );
        })}
      </div>
      <div className="campaign-panel">
        <div className="campaign-copy">
          <span className="eyebrow">{w.architecture.toUpperCase()}</span>
          <h2>{w.name}</h2>
          <p>{w.description}</p>
          <div className="difficulty-tabs" aria-label="Difficulty">
            {Object.keys(DIFFICULTIES).map((d) => (
              <button
                key={d}
                aria-pressed={difficulty === d}
                className={difficulty === d ? "selected" : ""}
                onClick={() => setDifficulty(d as DifficultyId)}
              >
                {d.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="muted">
            {difficulty === "normal"
              ? "Standard enemies and farming rewards."
              : difficulty === "hard"
                ? "Faster pressure, three-shot volleys, more elites. 1.6× rewards."
                : "Five-shot volleys, rapid boss cycles, triple hazards. 2.4× rewards."}
          </p>
          <h3>Stage selection</h3>
          <div className="stage-list">
            {STAGES.filter((s) => s.worldId === world).map((s) => {
              const lock = lockedReason(s.id, difficulty, progress.clears);
              return (
                <button
                  key={s.id}
                  aria-pressed={selected === s.id}
                  className={selected === s.id ? "selected" : ""}
                  onClick={() => setSelected(s.id)}
                >
                  <b>{s.number.toString().padStart(2, "0")}</b>
                  <span>
                    <strong>{s.name}</strong>
                    <small>
                      {lock ??
                        (progress.clears.includes(clearKey(s.id, difficulty))
                          ? "CLEARED · REPLAY AVAILABLE"
                          : s.clear.kind === "boss"
                            ? "BOSS ENCOUNTER"
                            : "SURVIVAL")}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <aside className="campaign-details">
          <div
            role="img"
            aria-label={w.boss.name}
            className="boss-preview"
            style={{
              backgroundImage: `url(/assets/worlds/${world}/boss.png)`,
              backgroundSize: "1280px 128px",
              backgroundPosition: "left top",
            }}
          />
          <span className="eyebrow">WORLD GUARDIAN</span>
          <h3>{w.boss.name}</h3>
          <p>{w.boss.patterns.join(" · ")}</p>
          <span className="eyebrow">LOCAL ENEMIES</span>
          <p>{w.enemies.map((e) => e.name).join(" · ")}</p>
          <hr />
          <h3>{stage.name}</h3>
          <p>
            Recommended power {stage.recommendedPower} ·{" "}
            {Math.round(
              (stage.clear.seconds * DIFFICULTIES[difficulty].duration) / 60,
            )}{" "}
            minutes
            <br />
            {stage.clear.kind === "boss"
              ? "Survive, then defeat the world guardian."
              : "Survive until the stage timer completes."}
          </p>
          <span className="eyebrow">POSSIBLE FARMING REWARDS</span>
          <p>
            {w.materials.map((x) => x.replaceAll("-", " ")).join(" · ")}
            <br />
            Guardian relic: {w.boss.reward.replaceAll("-", " ")}
          </p>
          <p className="muted">
            First clears grant additional gold, XP and materials. Equip guardian
            relics and enhance them in the sanctuary inventory.
          </p>
          <div className="campaign-wallet">
            {progress.gold} GOLD · {progress.xp} PROFILE XP
            <br />
            {Object.entries(progress.materials).map(([id, n]) => (
              <small key={id}>
                {id.replaceAll("-", " ")} ×{n} ·{" "}
              </small>
            ))}
          </div>
          {reason && (
            <p className="notice" role="status">
              {reason}
            </p>
          )}
          {error && (
            <p role="alert" className="notice">
              {error}
            </p>
          )}
          <button
            className="primary-button"
            disabled={!ready || !!reason}
            onClick={() => {
              if (!lockedReason(stage.id, difficulty, progress.clears))
                onStart({
                  stageId: stage.id,
                  difficulty,
                  seed: crypto.getRandomValues(new Uint32Array(1))[0],
                  clears: progress.clears,
                });
            }}
          >
            START STAGE →
          </button>
        </aside>
      </div>
    </section>
  );
}
