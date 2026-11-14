"use client";
import {
  REGIONS,
  regionAccessReason,
  type RegionId,
} from "@/game/world/regions";
import type { QuestJournal } from "@/game/quests/types";
import { questById } from "@/game/quests/catalog";
import type { WorldSave } from "@/game/world/save";
import { currentRegion } from "@/game/world/exploration";
import { useI18n } from "@/i18n/useI18n";
const outlines: Record<RegionId, string> = {
  north:
    "208,70 260,42 340,40 388,78 408,102 454,202 396,270 320,280 250,220 196,144",
  northeast:
    "440,183 510,154 610,150 658,188 698,224 732,324 694,365 652,400 514,388 402,310 396,264",
  central: "316,262 398,250 436,292 472,326 474,418 420,476 363,434 312,366",
  south:
    "362,432 408,465 373,516 360,560 388,610 410,676 392,722 338,748 290,700 302,636 272,584 300,540 314,476",
};
export default function ThailandOverview({
  world,
  selection,
  clears,
  legacy,
  journal,
  onSelect,
}: {
  world: WorldSave;
  selection: RegionId;
  clears: readonly string[];
  legacy: readonly string[];
  journal?: QuestJournal;
  onSelect: (id: RegionId) => void;
}) {
  const { text } = useI18n(),
    region = currentRegion(world),
    tracked = journal?.tracked ? questById(journal.tracked) : undefined;
  return (
    <div className="thailand-overview" data-testid="thailand-world-overview">
      <svg viewBox="0 0 800 840" aria-hidden="true" shapeRendering="crispEdges">
        <defs>
          <pattern
            id="atlas-sea"
            width="80"
            height="70"
            patternUnits="userSpaceOnUse"
          >
            <rect width="80" height="70" fill="#284f5b" />
            <path d="M8 32h21m32 22h13" stroke="#47717a" strokeWidth="3" />
          </pattern>
        </defs>
        <rect width="800" height="840" fill="url(#atlas-sea)" />
        <path
          d="M330 163Q462 163 574 285Q434 317 363 359L307 628"
          fill="none"
          stroke="#dac493"
          strokeWidth="4"
          strokeDasharray="7 13"
          opacity=".35"
        />
        {REGIONS.map((r) => (
          <g key={r.id}>
            <polygon
              points={outlines[r.id]}
              fill={
                r.id === "north"
                  ? "#839b76"
                  : r.id === "northeast"
                    ? "#bb9c68"
                    : r.id === "central"
                      ? "#a5ac78"
                      : "#6e9f83"
              }
              stroke="#e4d0a2"
              strokeWidth={selection === r.id ? 8 : 4}
            />
            {[0, 1, 2].map((i) => (
              <path
                key={i}
                d={`M${r.overview.x - 75 + i * 48},${r.overview.y + 70}l18 -27 18 27-18-9z`}
                fill={
                  r.id === "north"
                    ? "#b5c8b7"
                    : r.id === "northeast"
                      ? "#8e7756"
                      : "#44745f"
                }
              />
            ))}
            <path
              d={`M${r.overview.x - 35},${r.overview.y - 14}h70l-35-25zM${r.overview.x - 23},${r.overview.y - 14}v35h46v-35`}
              fill="#e3ca94"
              stroke="#695c47"
              strokeWidth="5"
            />
          </g>
        ))}
        <path
          d="M352 290Q400 345 388 420L365 443"
          fill="none"
          stroke="#508e98"
          strokeWidth="10"
        />
        <g fill="#9fbcaf" opacity=".7">
          <path d="M105 245h35v6h28v6h-73v-6h10z" />
          <path d="M582 570h41v7h24v6h-86v-6h21z" />
        </g>
        <path
          d="M665 630v70m-30-35h60m-60-35l60 70m0-70l-60 70"
          stroke="#bba36e"
          strokeWidth="3"
        />
        <text
          x="665"
          y="616"
          textAnchor="middle"
          fill="#e2cc9a"
          fontFamily="monospace"
          fontSize="19"
        >
          N
        </text>
      </svg>
      {REGIONS.map((r) => {
        const id = r.id === "central" ? "plaza" : `${r.id}-plaza`,
          visited = world.waypoints.includes(id),
          locked = regionAccessReason(r.id, clears, legacy);
        return (
          <button
            key={r.id}
            className="atlas-region-marker"
            style={{
              left: `${r.overview.x / 8}%`,
              top: `${r.overview.y / 8.4}%`,
            }}
            aria-pressed={selection === r.id}
            data-region-marker={r.id}
            data-region-locked={!!locked}
            onClick={() => onSelect(r.id)}
          >
            <span>
              {region === r.id
                ? "●"
                : tracked?.chapterId === r.worldId
                  ? "!"
                  : visited
                    ? "◆"
                    : "◇"}
            </span>
            <strong>{text(r.name)}</strong>
            <small>{text(r.capital)}</small>
            <i>
              {text(
                locked
                  ? "Story route locked"
                  : visited
                    ? "Discovered"
                    : "New regional route",
              )}
            </i>
          </button>
        );
      })}
    </div>
  );
}
