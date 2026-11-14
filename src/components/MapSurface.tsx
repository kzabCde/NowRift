"use client";
import { useId } from "react";
import { regionalCity } from "@/game/world/regional-city";
import { regionById, type RegionId } from "@/game/world/regions";
import {
  emptyFog,
  exploredCell,
  fogGrid,
  fogState,
  FOG_CELL,
  projectPoint,
} from "@/game/world/exploration";
import type { Point } from "@/game/world/city";
import type { MapMarker } from "@/game/world/map";
import { useI18n } from "@/i18n/useI18n";

const angles = { up: 0, right: 90, down: 180, left: 270 };
export default function MapSurface({
  region,
  position,
  facing = "down",
  explored,
  markers,
  selected,
  destination,
  mini = false,
  onSelect,
}: {
  region: RegionId;
  position: Point;
  facing?: keyof typeof angles;
  explored?: string;
  markers: readonly MapMarker[];
  selected?: string;
  destination?: Point | null;
  mini?: boolean;
  onSelect?: (id: string) => void;
}) {
  const { text } = useI18n(),
    id = useId().replaceAll(":", ""),
    city = regionalCity(region),
    r = regionById(region),
    fog = explored ?? emptyFog(region),
    grid = fogGrid(region);
  const view = mini
    ? {
        x: Math.max(
          0,
          Math.min(city.width - Math.min(1050, city.width), position.x - 525),
        ),
        y: Math.max(
          0,
          Math.min(city.height - Math.min(850, city.height), position.y - 425),
        ),
        width: Math.min(1050, city.width),
        height: Math.min(850, city.height),
      }
    : { x: 0, y: 0, width: city.width, height: city.height };
  const project = (p: Point) =>
    projectPoint({ x: p.x - view.x, y: p.y - view.y }, view, {
      width: 100,
      height: 100,
    });
  const player = project(position);
  const visibleMarkers = markers.filter(
    (m) =>
      (!mini ||
        (m.x >= view.x &&
          m.x <= view.x + view.width &&
          m.y >= view.y &&
          m.y <= view.y + view.height)) &&
      (m.kind !== "npc" || fogState(fog, region, m, position) === "visible"),
  );
  return (
    <div
      className={`atlas-surface ${mini ? "atlas-mini-surface" : ""}`}
      style={{ aspectRatio: `${view.width}/${view.height}` }}
      data-map-region={region}
    >
      <svg
        viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
        aria-hidden="true"
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
      >
        <defs>
          <pattern
            id={`ground-${id}`}
            width="64"
            height="64"
            patternUnits="userSpaceOnUse"
          >
            <rect
              width="64"
              height="64"
              fill={
                region === "northeast"
                  ? "#b7a276"
                  : region === "south"
                    ? "#819b70"
                    : "#8c9c79"
              }
            />
            <path
              d="M8 14h10m24 31h8M20 55h6"
              stroke="#a7ac81"
              strokeWidth="3"
            />
          </pattern>
        </defs>
        <rect
          width={city.width}
          height={city.height}
          fill={`url(#ground-${id})`}
        />
        {city.yards.map((y, i) => (
          <rect
            key={`yard-${i}`}
            x={y.x}
            y={y.y}
            width={y.w}
            height={y.h}
            fill="#b4ae8a"
            opacity=".65"
          />
        ))}
        {city.roads.map((road, i) => (
          <polyline
            key={`road-${i}`}
            points={road.points.map((p) => p.join(",")).join(" ")}
            fill="none"
            stroke="#d4c69c"
            strokeWidth={road.width}
            strokeLinejoin="round"
          />
        ))}
        {city.water.map((w, i) => (
          <rect
            key={`water-${i}`}
            x={w.x}
            y={w.y}
            width={w.w}
            height={w.h}
            fill="#4b8585"
            stroke="#a4c0a0"
            strokeWidth="5"
          />
        ))}
        {city.bridges.map((w, i) => (
          <rect
            key={`bridge-${i}`}
            x={w.x}
            y={w.y}
            width={w.w}
            height={w.h}
            fill="#b99f70"
            stroke="#796e50"
            strokeWidth="8"
          />
        ))}
        {[
          ...city.landmarks.flatMap((l) => (l.solid ? [l.solid] : [])),
          ...city.structures.map((s) => s.solid),
        ].map((b, i) => (
          <g key={`building-${i}`}>
            <rect
              x={b.x + 8}
              y={b.y + 12}
              width={b.w}
              height={b.h}
              fill="#3e5146"
              opacity=".35"
            />
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              fill={r.color}
              stroke="#665646"
              strokeWidth="8"
            />
            <path
              d={`M${b.x + 5},${b.y + b.h / 2}h${b.w - 10}`}
              stroke="#927c5b"
              strokeWidth="5"
            />
          </g>
        ))}
        {Array.from({ length: grid.cells }, (_, i) => {
          const x = (i % grid.columns) * FOG_CELL,
            y = Math.floor(i / grid.columns) * FOG_CELL;
          if (
            x + FOG_CELL < view.x ||
            x > view.x + view.width ||
            y + FOG_CELL < view.y ||
            y > view.y + view.height
          )
            return null;
          const seen = exploredCell(fog, i),
            visible =
              fogState(
                fog,
                region,
                { x: x + FOG_CELL / 2, y: y + FOG_CELL / 2 },
                position,
              ) === "visible";
          return visible ? null : (
            <rect
              key={`fog-${i}`}
              x={x}
              y={y}
              width={FOG_CELL}
              height={FOG_CELL}
              fill="#203c36"
              opacity={seen ? 0.17 : 0.72}
              data-fog-state={seen ? "explored" : "undiscovered"}
            />
          );
        })}
        {mini &&
          visibleMarkers.map((m) => (
            <g key={m.id} transform={`translate(${m.x},${m.y})`}>
              <rect
                x={m.kind === "npc" ? -10 : -18}
                y={m.kind === "npc" ? -10 : -18}
                width={m.kind === "npc" ? 20 : 36}
                height={m.kind === "npc" ? 20 : 36}
                fill={
                  m.kind === "quest"
                    ? "#f0cb78"
                    : m.kind === "waypoint"
                      ? "#95d2c6"
                      : m.kind === "exit"
                        ? "#aabbe2"
                        : "#e3ce97"
                }
                stroke="#273f38"
                strokeWidth="6"
              />
            </g>
          ))}
        {destination && (
          <g transform={`translate(${destination.x},${destination.y})`}>
            <path
              d="M0-30l25 30L0 30l-25-30z"
              fill="none"
              stroke="#f4d991"
              strokeWidth="9"
            />
            <path
              d="M0-46v18M0 28v18M-46 0h18M28 0h18"
              stroke="#f4d991"
              strokeWidth="7"
            />
          </g>
        )}
      </svg>
      {!mini &&
        visibleMarkers.map((m) => {
          const p = project(m);
          return (
            <button
              key={m.id}
              type="button"
              className={`atlas-marker atlas-marker-${m.kind} ${m.waypointId ? "town-waypoint-marker" : ""}`}
              data-waypoint-marker={m.waypointId}
              data-map-marker={m.id}
              data-unlocked={m.discovered}
              aria-pressed={selected === m.id}
              aria-label={`${text(m.waypointId ? "Select district" : "Select location")}: ${text(m.name)}`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              onClick={() => onSelect?.(m.id)}
            >
              <b>{m.symbol}</b>
              <span>{text(m.name)}</span>
            </button>
          );
        })}
      <i
        className="atlas-player town-player-marker"
        data-testid={mini ? "minimap-player" : "town-player-marker"}
        aria-label={text("You are here")}
        style={{
          left: `${player.x}%`,
          top: `${player.y}%`,
          transform: `translate(-50%,-50%) rotate(${angles[facing]}deg)`,
        }}
      >
        ▲
      </i>
    </div>
  );
}
