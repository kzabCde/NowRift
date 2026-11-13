"use client";
import { useState } from "react";
import Image from "next/image";
import { DISTRICTS, districtAt, type Point } from "@/game/world/city";
import { HAVEN, LANDMARKS } from "@/game/world/content";
import type { WorldSave } from "@/game/world/save";
import { WAYPOINTS, fastTravelReason } from "@/game/world/waypoints";
import { useI18n } from "@/i18n/useI18n";

export default function TownMap({
  world,
  position,
  busy,
  onTravel,
  onMark,
}: {
  world: WorldSave;
  position: Point;
  busy: boolean;
  onTravel: (id: string) => void;
  onMark: (id: string) => void;
}) {
  const { text } = useI18n();
  const [selection, setSelection] = useState(
    () =>
      WAYPOINTS.find((w) => w.district === districtAt(position).id)?.id ??
      "plaza",
  );
  const selected = WAYPOINTS.find((w) => w.id === selection)!,
    district = DISTRICTS.find((d) => d.id === selected.district)!;
  const blocked = fastTravelReason(world, selected.id),
    unlocked = world.waypoints.includes(selected.id);
  return (
    <section className="town-map" aria-label={text("Town Map & Fast Travel")}>
      <span className="eyebrow">{text("ONE CITY · NINE DISTRICTS")}</span>
      <h2>{text("Town map")}</h2>
      <p>
        {text(
          "Choose a district to travel or mark a walking route. Your character and equipment stay with you.",
        )}
      </p>
      <div
        className="haven-map town-map-overview"
        style={{ aspectRatio: `${HAVEN.width}/${HAVEN.height}` }}
      >
        <Image
          unoptimized
          fill
          src="/assets/haven/terrain.png"
          alt={text("Full city overview")}
          sizes="(max-width: 650px) 90vw, 700px"
        />
        {WAYPOINTS.map((w, i) => (
          <button
            key={w.id}
            className="town-waypoint-marker"
            data-waypoint-marker={w.id}
            data-unlocked={world.waypoints.includes(w.id)}
            aria-pressed={selection === w.id}
            aria-label={`${text("Select district")}: ${text(w.name)}`}
            style={{
              left: `${(w.spawn.x / HAVEN.width) * 100}%`,
              top: `${(w.spawn.y / HAVEN.height) * 100}%`,
            }}
            onClick={() => setSelection(w.id)}
          >
            <b>{i + 1}</b>
            <span>{text(w.name)}</span>
          </button>
        ))}
        <i
          className="town-player-marker"
          data-testid="town-player-marker"
          aria-label={text("You are here")}
          style={{
            left: `${(position.x / HAVEN.width) * 100}%`,
            top: `${(position.y / HAVEN.height) * 100}%`,
          }}
        >
          ●
        </i>
      </div>
      <div className="town-map-content">
        <div
          className="town-waypoint-list"
          role="group"
          aria-label={text("District waypoints")}
        >
          {WAYPOINTS.map((w, i) => (
            <button
              key={w.id}
              data-waypoint-entry={w.id}
              aria-pressed={selection === w.id}
              onClick={() => setSelection(w.id)}
            >
              <b>{i + 1}</b>
              <strong>{text(w.name)}</strong>
              <small>
                {text(
                  world.waypoints.includes(w.id)
                    ? w.initial
                      ? "Available from the start"
                      : "Discovered"
                    : "Undiscovered",
                )}
              </small>
            </button>
          ))}
        </div>
        <article
          className="town-waypoint-detail"
          data-selected-waypoint={selected.id}
          aria-live="polite"
        >
          <span className="eyebrow">
            {text(unlocked ? "ATTUNED WAYPOINT" : "EXPLORATION REQUIRED")}
          </span>
          <h3>{text(selected.name)}</h3>
          <p>{district.motifs.map(text).join(" · ")}</p>
          {!unlocked && (
            <p>
              {text(
                "Attune the beacon or visit a station in this district to unlock its waypoint.",
              )}
            </p>
          )}
          {blocked && (
            <p className="town-travel-reason" role="status">
              {text(blocked)}
            </p>
          )}
          <button
            className="primary-button"
            disabled={busy || !!blocked}
            onClick={() => onTravel(selected.id)}
          >
            {text("Fast Travel")} →
          </button>
          <button
            className="quiet-button"
            disabled={busy}
            onClick={() => onMark(selected.landmarkId)}
          >
            {text("Mark walking route")} →
          </button>
          <small>
            {text(
              "Town travel is free. World expeditions still depart from the Rift Gate.",
            )}
          </small>
        </article>
      </div>
      <details className="town-stations">
        <summary>{text("Stations & entrances")}</summary>
        <div className="haven-map-list">
          {LANDMARKS.filter(
            (l) =>
              l.kind !== "waypoint" &&
              (!["treasure", "lore"].includes(l.kind) ||
                world.discoveries.includes(l.id)),
          ).map((l) => (
            <button key={l.id} onClick={() => onMark(l.id)}>
              {text(l.name)}
              <small>
                {text(
                  world.discoveries.includes(l.id)
                    ? "Discovered"
                    : "Not visited",
                )}
              </small>
            </button>
          ))}
        </div>
      </details>
    </section>
  );
}
