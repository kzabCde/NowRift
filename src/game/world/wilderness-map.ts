import type { Game } from "../engine";
import type { MapLayout } from "../campaign/maps";
import type { Point } from "./city";
import { regionForWorld, type RegionId } from "./regions";
import { emptyFog, revealFog } from "./exploration";
import { expeditionLayout } from "./farming";
import { missionById } from "../story/content";
import { ITEMS } from "../rpg/content";

export type WildernessMarker = Point & {
  id: string;
  name: string;
  kind: "resource" | "portal" | "objective" | "boss";
  complete: boolean;
};
export type WildernessNavigation = {
  region: RegionId;
  stageId: string;
  seed: number;
  free: boolean;
  layout: MapLayout;
  position: Point;
  facing: "up" | "down" | "left" | "right";
  explored: string;
  target: string | null;
  markers: WildernessMarker[];
};
export function updateWildernessDiscovery(g: Game, force = false) {
  const c = g.campaign;
  if (!c) return;
  const cell = `${Math.floor(g.player.x / 64)},${Math.floor(g.player.y / 64)}`;
  if (!force && cell === c.explorationCell && c.explored) return;
  const region = regionForWorld(c.world.id).id;
  c.explored = revealFog(
    c.explored ?? emptyFog(region, "wilderness"),
    region,
    g.player,
    "wilderness",
  );
  c.explorationCell = cell;
}
export function wildernessNavigation(
  g: Game,
): WildernessNavigation | undefined {
  const c = g.campaign;
  if (!c) return;
  updateWildernessDiscovery(g);
  const markers: WildernessMarker[] = [];
  if (c.activity === "farming") {
    const farm = expeditionLayout(c.definition.id, c.map);
    markers.push({
      id: "extract",
      name: "Return portal",
      kind: "portal",
      ...farm.portal,
      complete: false,
    });
    for (const n of farm.nodes)
      markers.push({
        ...n,
        name: ITEMS[n.item].name,
        kind: "resource",
        complete: c.harvested?.includes(n.id) ?? false,
      });
  }
  if (c.mission) {
    const step = missionById(c.definition.id)?.objectives[c.mission.step];
    for (const o of c.mission.objects) {
      const spec = step?.objects.find((s) => s.id === o.id);
      if (spec)
        markers.push({
          id: o.id,
          name: spec.label.en,
          kind: "objective",
          x: o.x,
          y: o.y,
          complete: c.mission.used.includes(o.id),
        });
    }
    if (c.mission.ally)
      markers.push({
        id: "companion",
        name: "Mission companion",
        kind: "objective",
        x: c.mission.ally.x,
        y: c.mission.ally.y,
        complete: false,
      });
  }
  const boss = g.enemies.find((e) => e.kind === "boss");
  if (boss)
    markers.push({
      id: "guardian",
      name: missionById(c.definition.id)?.finale?.name.en ?? c.world.boss.name,
      kind: "boss",
      x: boss.x,
      y: boss.y,
      complete: false,
    });
  return {
    region: regionForWorld(c.world.id).id,
    stageId: c.definition.id,
    seed: c.seed,
    free: c.activity === "farming",
    layout: c.map,
    position: { x: g.player.x, y: g.player.y },
    facing: g.player.facing ?? "down",
    explored: c.explored!,
    target: c.mapTarget ?? null,
    markers,
  };
}
