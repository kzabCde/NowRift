"use client";
import { useMemo, useState } from "react";
import { districtAt, type Point } from "@/game/world/city";
import type { WorldSave } from "@/game/world/save";
import { fastTravelReason, waypointsIn } from "@/game/world/waypoints";
import { currentRegion, emptyFog, validFog } from "@/game/world/exploration";
import { localMapMarkers, type MapResident } from "@/game/world/map";
import { regionalCity } from "@/game/world/regional-city";
import {
  regionById,
  regionAccessReason,
  type RegionId,
} from "@/game/world/regions";
import { worldById } from "@/game/campaign/content";
import type { QuestJournal } from "@/game/quests/types";
import { useI18n } from "@/i18n/useI18n";
import MapSurface from "./MapSurface";
import MapViewport from "./MapViewport";
import ThailandOverview from "./ThailandOverview";

/** The existing Town Map now owns local and regional navigation; campaign selection stays a game activity. */
export default function TownMap({
  world,
  position,
  busy,
  onTravel,
  onMark,
  facing,
  explored,
  npcs,
  journal,
  clears = [],
  legacy = [],
}: {
  world: WorldSave;
  position: Point;
  busy: boolean;
  facing?: "up" | "down" | "left" | "right";
  explored?: string;
  npcs?: MapResident[];
  journal?: QuestJournal;
  clears?: readonly string[];
  legacy?: readonly string[];
  onTravel: (id: string, viaGate?: boolean) => void;
  onMark: (id: string | null) => void;
}) {
  const { text, t } = useI18n(),
    region = currentRegion(world),
    city = regionalCity(region),
    points = waypointsIn(region);
  const [mode, setMode] = useState<"local" | "world">("local"),
    [selection, setSelection] = useState(
      () =>
        points.find(
          (w) => w.district === districtAt(position, city.districts).id,
        )?.id ?? points[0].id,
    ),
    [worldSelection, setWorldSelection] = useState<RegionId>(region),
    [worldWaypoint, setWorldWaypoint] = useState<string | null>(null);
  const markers = useMemo(
    () => localMapMarkers(region, world, journal, npcs),
    [region, world, journal, npcs],
  );
  const marker = markers.find((m) => m.id === selection),
    landmark = city.landmarks.find((l) => l.id === marker?.landmarkId),
    selected =
      points.find((w) => w.id === selection) ??
      points.find(
        (w) =>
          w.district ===
          (landmark?.district ??
            districtAt(marker ?? position, city.districts).id),
      ),
    effective = { ...world, position };
  const blocked = selected
      ? fastTravelReason(effective, selected.id, { clears, legacy })
      : null,
    unlocked = !!selected && world.waypoints.includes(selected.id);
  const destination =
    world.atlas?.destination?.region === region
      ? city.landmarks.find(
          (l) => l.id === world.atlas?.destination?.landmarkId,
        )
      : undefined;
  const fog = validFog(explored, region)
    ? explored
    : (world.atlas?.explored[region] ?? emptyFog(region));
  const chosen = regionById(worldSelection),
    capitalId =
      worldSelection === "central" ? "plaza" : `${worldSelection}-plaza`,
    regionalPoints = waypointsIn(worldSelection),
    regionalPoint =
      regionalPoints.find((w) => w.id === worldWaypoint) ??
      regionalPoints.find((w) => w.id === capitalId)!,
    visited = world.waypoints.includes(regionalPoint.id),
    viaGate =
      !visited && regionalPoint.id === capitalId && worldSelection !== region;
  const regionLocked =
      worldSelection === region
        ? null
        : regionAccessReason(worldSelection, clears, legacy),
    regionBlocked = fastTravelReason(
      effective,
      regionalPoint.id,
      { clears, legacy },
      viaGate,
    ),
    currentGate = city.landmarks.find((l) => l.kind === "portal")!;
  return (
    <section
      className="town-map unified-atlas"
      aria-label={text("Town Map & Fast Travel")}
    >
      <span className="eyebrow">{text("FOUR REGIONS · ONE CHARACTER")}</span>
      <h2>{text("Town map")}</h2>
      <p>
        {text(
          "Explore the city, discover its beacons and follow the roads between four regions.",
        )}
      </p>
      <div
        className="atlas-mode-tabs"
        role="group"
        aria-label={text("Map view")}
      >
        <button
          aria-pressed={mode === "local"}
          onClick={() => setMode("local")}
        >
          {text("Local map")}
        </button>
        <button
          aria-pressed={mode === "world"}
          onClick={() => setMode("world")}
        >
          {text("Thailand world map")}
        </button>
      </div>
      {mode === "local" ? (
        <>
          <article
            className="town-waypoint-detail town-travel-panel"
            data-selected-waypoint={selected?.id}
            aria-live="polite"
          >
            <div className="town-selected-copy">
              <span className="eyebrow">
                {text(unlocked ? "ATTUNED WAYPOINT" : "EXPLORATION REQUIRED")}
              </span>
              <h3>
                {text(marker?.name ?? selected?.name ?? "Select location")}
              </h3>
              <small>
                {t("qol", "Travel destination: {name}", {
                  name: text(selected?.name ?? "Select location"),
                })}
              </small>
            </div>
            <div className="town-selected-actions">
              <button
                className="primary-button"
                disabled={busy || !selected || !!blocked}
                onClick={() => selected && onTravel(selected.id)}
              >
                {text("Fast Travel")} →
              </button>
              {(selected || landmark) && (
                <button
                  className="quiet-button"
                  disabled={busy}
                  onClick={() => onMark(landmark?.id ?? selected!.landmarkId)}
                >
                  {text("Set destination")} →
                </button>
              )}
            </div>
            {blocked ? (
              <p className="town-travel-reason" role="status">
                {text(blocked)}
              </p>
            ) : (
              <p className="town-travel-available">
                {text(
                  "Town travel is free. World expeditions still depart from the Rift Gate.",
                )}
              </p>
            )}
          </article>
          <MapViewport
            key={`local-${region}`}
            ratio={city.width / city.height}
            center={{ x: position.x / city.width, y: position.y / city.height }}
            className="town-map-overview"
          >
            <MapSurface
              region={region}
              position={position}
              facing={facing}
              explored={fog}
              markers={markers}
              selected={selection}
              destination={destination?.entrance}
              onSelect={setSelection}
            />
          </MapViewport>
          <div className="atlas-legend" aria-label={text("Map legend")}>
            <span>S {text("Shops")}</span>
            <span>! {text("Quests")}</span>
            <span>◆ {text("Waypoints")}</span>
            <span>↗ {text("Region exits")}</span>
            <span className="fog-visible">{text("Currently visible")}</span>
            <span className="fog-explored">{text("Explored")}</span>
            <span className="fog-unknown">{text("Undiscovered")}</span>
          </div>
          <div className="town-map-content">
            <div
              className="town-waypoint-list"
              role="group"
              aria-label={text("District waypoints")}
            >
              {points.map((w, i) => (
                <button
                  key={w.id}
                  data-waypoint-entry={w.id}
                  aria-pressed={selected?.id === w.id}
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
          </div>
          <details className="town-stations">
            <summary>{text("Stations & entrances")}</summary>
            <div className="haven-map-list">
              {city.landmarks
                .filter(
                  (l) =>
                    l.kind !== "waypoint" &&
                    (!["treasure", "lore"].includes(l.kind) ||
                      world.discoveries.includes(l.id)),
                )
                .map((l) => (
                  <button
                    key={l.id}
                    data-map-location-entry={l.id}
                    onClick={() => setSelection(l.id)}
                  >
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
        </>
      ) : (
        <>
          <article
            className="atlas-region-detail town-travel-panel"
            aria-live="polite"
            data-selected-region={chosen.id}
          >
            <div className="town-selected-copy">
              <span className="eyebrow">
                {text(
                  worldSelection === region
                    ? "CURRENT REGION"
                    : visited
                      ? "Discovered"
                      : "New regional route",
                )}
              </span>
              <h3>
                {text(chosen.name)} · {text(chosen.capital)}
              </h3>
            </div>
            <div className="town-selected-actions">
              <button
                className="primary-button"
                data-region-travel={chosen.id}
                disabled={busy || !!regionBlocked}
                onClick={() => onTravel(regionalPoint.id, viaGate)}
              >
                {text(viaGate ? "Travel via Rift Gate" : "Fast Travel")} →
              </button>
            </div>
            <label className="town-regional-destination">
              {text("Regional destination")}
              <select
                aria-label={text("Regional destination")}
                value={regionalPoint.id}
                onChange={(e) => setWorldWaypoint(e.target.value)}
              >
                {regionalPoints.map((w) => (
                  <option key={w.id} value={w.id}>
                    {text(w.name)} ·{" "}
                    {text(
                      world.waypoints.includes(w.id)
                        ? "Discovered"
                        : "Undiscovered",
                    )}
                  </option>
                ))}
              </select>
            </label>
            {(regionLocked || regionBlocked) && (
              <p className="town-travel-reason" role="status">
                {text(regionLocked ?? regionBlocked!)}
              </p>
            )}
          </article>
          <MapViewport
            key="regional-world"
            ratio={800 / 840}
            center={{
              x: regionById(region).overview.x / 800,
              y: regionById(region).overview.y / 840,
            }}
            onCenter={() => setWorldSelection(region)}
          >
            <ThailandOverview
              world={world}
              selection={worldSelection}
              clears={clears}
              legacy={legacy}
              journal={journal}
              onSelect={(id) => {
                setWorldSelection(id);
                setWorldWaypoint(null);
              }}
            />
          </MapViewport>
          <article className="atlas-region-detail" aria-live="polite">
            <span className="eyebrow">
              {text(
                worldSelection === region
                  ? "CURRENT REGION"
                  : visited
                    ? "Discovered"
                    : "New regional route",
              )}
            </span>
            <h3>
              {text(chosen.name)} · {text(chosen.capital)}
            </h3>
            <p>{text(chosen.architecture)}</p>
            <p>
              <strong>{text("Regional story")}: </strong>
              {text(chosen.story)}
            </p>
            <p>
              <strong>{text("Regional guardian")}: </strong>
              {text(worldById(chosen.worldId).boss.name)} ·{" "}
              {text(
                clears.includes(chosen.bossStage + ":normal")
                  ? "Defeated"
                  : "Not yet defeated",
              )}
            </p>
            {viaGate && worldSelection !== region && (
              <p>
                {text(
                  "First arrival requires a Rift Gate. Later journeys use your discovered beacon.",
                )}
              </p>
            )}
            <button
              className="quiet-button"
              disabled={busy}
              onClick={() => onMark(currentGate.id)}
            >
              {text("Mark nearest Rift Gate")} →
            </button>
            <small>
              {text(
                "Story progress opens regional routes. City travel does not complete missions.",
              )}
            </small>
          </article>
        </>
      )}
      {world.atlas?.destination && (
        <div className="atlas-current-destination">
          <span>
            {text("Destination")}:{" "}
            {text(
              destination?.name ??
                regionById(world.atlas.destination.region).name,
            )}
          </span>
          <button
            className="quiet-button"
            disabled={busy}
            onClick={() => onMark(null)}
          >
            {text("Clear destination")}
          </button>
        </div>
      )}
    </section>
  );
}
