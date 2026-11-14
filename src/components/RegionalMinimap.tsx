"use client";
import { useMemo } from "react";
import type { WorldSave } from "@/game/world/save";
import type { Point } from "@/game/world/city";
import type { QuestJournal } from "@/game/quests/types";
import { currentRegion } from "@/game/world/exploration";
import { regionalCity } from "@/game/world/regional-city";
import { regionById } from "@/game/world/regions";
import { localMapMarkers, type MapResident } from "@/game/world/map";
import { useI18n } from "@/i18n/useI18n";
import MapSurface from "./MapSurface";

export default function RegionalMinimap({
  world,
  position,
  facing,
  explored,
  npcs,
  journal,
  disabled,
  onOpen,
}: {
  world: WorldSave;
  position: Point;
  facing?: "up" | "down" | "left" | "right";
  explored?: string;
  npcs?: MapResident[];
  journal?: QuestJournal;
  disabled: boolean;
  onOpen: () => void;
}) {
  const { text } = useI18n(),
    region = currentRegion(world);
  const markers = useMemo(
    () => localMapMarkers(region, world, journal, npcs),
    [region, world, journal, npcs],
  );
  const target =
    world.atlas?.destination?.region === region
      ? regionalCity(region).landmarks.find(
          (l) => l.id === world.atlas?.destination?.landmarkId,
        )
      : undefined;
  const bearing = target
    ? (Math.atan2(
        target.entrance.y - position.y,
        target.entrance.x - position.x,
      ) *
        180) /
        Math.PI +
      90
    : 0;
  return (
    <aside className="regional-minimap" aria-label={text("Regional minimap")}>
      <button
        className="regional-minimap-open"
        aria-label={text("Open map")}
        onClick={onOpen}
        disabled={disabled}
      >
        <MapSurface
          region={region}
          position={position}
          facing={facing}
          explored={explored ?? world.atlas?.explored[region]}
          markers={markers}
          destination={target?.entrance}
          mini
        />
        <span>
          <b>{text(regionById(region).name)}</b>
          <kbd>M</kbd>
        </span>
      </button>
      {target && (
        <div className="minimap-destination" data-testid="minimap-destination">
          <i style={{ transform: `rotate(${bearing}deg)` }} aria-hidden="true">
            ↑
          </i>
          <span>
            {text(target.name)}
            <small>{text("Direction only · follow walkable ground")}</small>
          </span>
        </div>
      )}
    </aside>
  );
}
