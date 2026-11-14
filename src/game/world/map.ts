import type { Point } from "./city";
import type { WorldSave } from "./save";
import { REGION_IDS, regionForWorld, type RegionId } from "./regions";
import type { QuestJournal } from "../quests/types";
import { regionalCity } from "./regional-city";
import { questGiverStates } from "../quests/presentation";
import { questById } from "../quests/catalog";
import { currentObjectives } from "../quests/engine";

export type MapMarker = Point & {
  id: string;
  name: string;
  kind: "shop" | "npc" | "quest" | "waypoint" | "exit" | "landmark";
  landmarkId?: string;
  waypointId?: string;
  discovered: boolean;
  symbol: string;
};
export type MapResident = Point & { id: string; name: string };
/** Point to the next physical objective, including return-to-giver quests. */
export function trackedQuestRegion(journal?: QuestJournal): RegionId | null {
  const quest = journal?.tracked ? questById(journal.tracked) : undefined;
  const instance = quest && journal?.quests[quest.id];
  if (
    !quest ||
    !instance ||
    instance.rewardClaimed ||
    !["ACTIVE", "OBJECTIVE_COMPLETED", "READY_TO_CLAIM"].includes(
      instance.status,
    )
  )
    return null;
  const objective = currentObjectives(instance, quest)[0];
  const target =
    instance.status === "READY_TO_CLAIM" || objective?.type === "DeliverItem"
      ? quest.giver
      : objective?.target;
  for (const region of REGION_IDS)
    if (regionalCity(region).landmarks.some((l) => l.id === target))
      return region;
  return regionForWorld(objective?.worldId ?? quest.chapterId).id;
}
export function localMapMarkers(
  region: RegionId,
  world: WorldSave,
  journal?: QuestJournal,
  residents?: readonly MapResident[],
): MapMarker[] {
  const city = regionalCity(region),
    states = journal ? questGiverStates(journal, world.quest) : {};
  const tracked = journal?.tracked ? questById(journal.tracked) : undefined,
    instance = tracked && journal?.quests[tracked.id];
  const targets = new Set(
    instance && tracked
      ? currentObjectives(instance, tracked).map((o) => o.target)
      : [],
  );
  const markers: MapMarker[] = city.landmarks
    .filter(
      (l) =>
        !["treasure", "lore"].includes(l.kind) ||
        world.discoveries.includes(l.id) ||
        targets.has(l.id),
    )
    .map((l) => {
      const quest = states[l.id] && states[l.id] !== "none";
      const objective =
        targets.has(l.id) ||
        (!!l.district && targets.has(l.district) && l.kind === "waypoint");
      const kind: MapMarker["kind"] =
        quest || objective
          ? "quest"
          : l.kind === "waypoint"
            ? "waypoint"
            : l.kind === "portal"
              ? "exit"
              : [
                    "merchant",
                    "blacksmith",
                    "crafting",
                    "wardrobe",
                    "storage",
                    "rest",
                  ].includes(l.kind)
                ? "shop"
                : l.kind === "npc"
                  ? "npc"
                  : "landmark";
      return {
        id: l.waypointId ?? l.id,
        landmarkId: l.id,
        waypointId: l.waypointId,
        ...l.entrance,
        name: l.waypointId
          ? city.waypoints.find((w) => w.id === l.waypointId)!.name
          : l.name,
        kind,
        discovered: l.waypointId
          ? world.waypoints.includes(l.waypointId)
          : world.discoveries.includes(l.id),
        symbol: quest
          ? states[l.id] === "ready"
            ? "?"
            : "!"
          : objective
            ? "!"
            : kind === "waypoint"
              ? "◆"
              : kind === "shop"
                ? "S"
                : kind === "exit"
                  ? "↗"
                  : kind === "npc"
                    ? "N"
                    : "·",
      };
    });
  for (const npc of residents ??
    city.npcs.map((n) => ({ id: n.id, name: n.name, ...n.home })))
    markers.push({
      ...npc,
      id: `npc:${npc.id}`,
      kind: "npc",
      discovered: true,
      symbol: "·",
    });
  return markers;
}
