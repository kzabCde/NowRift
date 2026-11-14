"use client";
import { useMemo } from "react";
import type { WildernessNavigation } from "@/game/world/wilderness-map";
import {
  exploredCell,
  FOG_CELL,
  fogGrid,
  fogState,
  projectPoint,
} from "@/game/world/exploration";
import { useI18n } from "@/i18n/useI18n";

export default function WildernessSurface({
  navigation: n,
  mini = false,
  selected,
  onSelect,
}: {
  navigation: WildernessNavigation;
  mini?: boolean;
  selected?: string;
  onSelect?: (id: string) => void;
}) {
  const { text } = useI18n(),
    b = n.layout,
    p = n.position,
    grid = fogGrid(n.region, "wilderness"),
    view = mini
      ? {
          x: Math.max(0, Math.min(b.width - 960, p.x - 480)),
          y: Math.max(0, Math.min(b.height - 750, p.y - 375)),
          width: 960,
          height: 750,
        }
      : { x: 0, y: 0, width: b.width, height: b.height };
  const ground = useMemo(() => {
    const colors =
      n.region === "south"
        ? ["#47644b", "#998f66", "#52734d"]
        : n.region === "northeast"
          ? ["#b79c6c", "#d3bb88", "#aa815b"]
          : n.region === "north"
            ? ["#839f9f", "#a8beb8", "#729ba6"]
            : ["#705e57", "#a07961", "#b66b43"];
    const paths = ["", "", ""];
    n.layout.tiles.forEach((row, y) =>
      row.forEach((tile, x) => {
        paths[tile] += `M${x * 32},${y * 32}h32v32h-32z`;
      }),
    );
    return (
      <g>
        {paths.map((d, i) => (
          <path key={i} d={d} fill={colors[i]} />
        ))}
        {n.layout.props.map((o, i) => (
          <circle
            key={i}
            cx={o.x}
            cy={o.y}
            r={o.r + 7}
            fill={o.type === "tree" ? "#354b3e" : "#6c7060"}
            stroke="#a1a58b"
            strokeWidth="2"
          />
        ))}
      </g>
    );
  }, [n.layout, n.region]);
  const project = (point: { x: number; y: number }) =>
      projectPoint({ x: point.x - view.x, y: point.y - view.y }, view, {
        width: 100,
        height: 100,
      }),
    player = project(p),
    target = n.markers.find((m) => m.id === n.target);
  const visible = n.markers.filter(
    (m) =>
      !mini ||
      (m.x >= view.x &&
        m.x <= view.x + view.width &&
        m.y >= view.y &&
        m.y <= view.y + view.height),
  );
  const angle = { up: 0, right: 90, down: 180, left: 270 }[n.facing];
  return (
    <div
      className={`atlas-surface wilderness-surface ${mini ? "atlas-mini-surface" : ""}`}
      style={{ aspectRatio: `${view.width}/${view.height}` }}
      data-wilderness-region={n.region}
    >
      <svg
        viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        shapeRendering="crispEdges"
      >
        {ground}
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
          const seen = exploredCell(n.explored, i),
            visible =
              fogState(
                n.explored,
                n.region,
                { x: x + 64, y: y + 64 },
                p,
                "wilderness",
              ) === "visible";
          return visible ? null : (
            <rect
              key={i}
              x={x}
              y={y}
              width={FOG_CELL}
              height={FOG_CELL}
              fill="#243c38"
              opacity={seen ? 0.17 : 0.72}
            />
          );
        })}
        {mini &&
          visible.map((m) => (
            <rect
              key={m.id}
              x={m.x - 16}
              y={m.y - 16}
              width="32"
              height="32"
              fill={
                m.kind === "portal"
                  ? "#9fd3d3"
                  : m.kind === "boss"
                    ? "#e1a06f"
                    : m.kind === "objective"
                      ? "#e9cd81"
                      : m.complete
                        ? "#778e7d"
                        : "#d7c196"
              }
              stroke="#263e38"
              strokeWidth="5"
            />
          ))}
        {target && (
          <path
            d={`M${target.x} ${target.y - 32}l27 32-27 32-27-32z`}
            fill="none"
            stroke="#f2d58d"
            strokeWidth="7"
          />
        )}
      </svg>
      {!mini &&
        visible.map((m) => {
          const a = project(m);
          return (
            <button
              key={m.id}
              className={`atlas-marker ${m.kind === "objective" ? "atlas-marker-quest" : ""}`}
              data-wilderness-marker={m.id}
              aria-label={`${text("Select location")}: ${text(m.name)}`}
              aria-pressed={selected === m.id}
              style={{ left: `${a.x}%`, top: `${a.y}%` }}
              onClick={() => onSelect?.(m.id)}
            >
              <b>
                {m.kind === "portal"
                  ? "↗"
                  : m.kind === "boss" || m.kind === "objective"
                    ? "!"
                    : m.complete
                      ? "·"
                      : "◆"}
              </b>
              <span>{text(m.name)}</span>
            </button>
          );
        })}
      <i
        className="atlas-player"
        data-testid={
          mini ? "expedition-minimap-player" : "expedition-map-player"
        }
        aria-label={text("You are here")}
        style={{
          left: `${player.x}%`,
          top: `${player.y}%`,
          transform: `translate(-50%,-50%) rotate(${angle}deg)`,
        }}
      >
        ▲
      </i>
    </div>
  );
}
