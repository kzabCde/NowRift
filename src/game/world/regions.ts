import type { WorldId } from "../campaign/content";
import { lockedReason } from "../campaign/progression";
import { CITY } from "./city";

export const REGION_IDS = ["north", "northeast", "central", "south"] as const;
export type RegionId = (typeof REGION_IDS)[number];
export type RegionDefinition = {
  id: RegionId;
  name: string;
  thaiName: string;
  capital: string;
  worldId: WorldId;
  bossStage: string;
  story: string;
  architecture: string;
  width: number;
  height: number;
  color: string;
  overview: { x: number; y: number };
  districts: readonly string[];
};

/** Presentation geography is independent of the published campaign order and IDs. */
export const REGIONS: readonly RegionDefinition[] = [
  {
    id: "north",
    name: "Mistbound Highlands",
    thaiName: "เวียงเมฆา",
    capital: "Wiang Mekha",
    worldId: "frozen",
    bossStage: "frozen-5",
    story: "The Frozen Mountain Curse",
    architecture:
      "Layered Lanna roofs, timber galleries, mountain streams and lantern courts",
    width: 1280,
    height: 1472,
    color: "#a8c7bd",
    overview: { x: 337, y: 159 },
    districts: [
      "Highland Market",
      "Mountain Forge",
      "Herbalist Quarter",
      "Temple District",
      "Adventurer's Lodge",
      "Wilderness Expedition Gate",
    ],
  },
  {
    id: "northeast",
    name: "Sandstone Kingdom",
    thaiName: "นครหินทราย",
    capital: "Nakhon Hinsai",
    worldId: "desert",
    bossStage: "desert-5",
    story: "The Awakening of Sandstone",
    architecture:
      "Sandstone gateways, elevated houses, red-earth lanes and artisan pavilions",
    width: 1472,
    height: 1280,
    color: "#dbb779",
    overview: { x: 574, y: 285 },
    districts: [
      "Sandstone Bazaar",
      "Ancient Forge",
      "Artisan Village",
      "Ruins Research Camp",
      "Adventurer's Guild Outpost",
      "Expedition Gate",
    ],
  },
  {
    id: "central",
    name: "River Kingdom",
    thaiName: "กรุงสายน้ำ",
    capital: "Rift Haven",
    worldId: "infernal",
    bossStage: "infernal-5",
    story: "The Rift Beneath the Capital",
    architecture:
      "Riverfront roof tiers, canal bridges, floating trade and lantern plazas",
    width: CITY.width,
    height: CITY.height,
    color: "#d8c58b",
    overview: { x: 363, y: 359 },
    districts: [
      "Royal Market",
      "Grand Blacksmith",
      "Riverside Trading Port",
      "Crafting Quarter",
      "Adventurer's Guild",
      "Sanctuary District",
      "Central Portal Plaza",
    ],
  },
  {
    id: "south",
    name: "Azure Coast",
    thaiName: "เมืองสมุทรคราม",
    capital: "Samut Khram",
    worldId: "forest",
    bossStage: "forest-5",
    story: "The Corrupted Mangrove",
    architecture:
      "Arcaded coastal shophouses, fishing piers, limestone and mangrove shade",
    width: 1408,
    height: 1344,
    color: "#81c6c0",
    overview: { x: 307, y: 628 },
    districts: [
      "Coastal Market",
      "Harbor Forge",
      "Sailor's Trading Post",
      "Tropical Alchemy Shop",
      "Expedition Guild",
      "Mangrove Wilderness Gate",
    ],
  },
];
export function isRegionId(value: unknown): value is RegionId {
  return REGION_IDS.includes(value as RegionId);
}
export function regionById(id: RegionId): RegionDefinition {
  return REGIONS.find((r) => r.id === id)!;
}
export function regionForWorld(world: WorldId): RegionDefinition {
  return REGIONS.find((r) => r.worldId === world)!;
}
export function regionAccessReason(
  id: RegionId,
  clears: readonly string[],
  legacy: readonly string[] = [],
) {
  // The capital remains the starting sanctuary, even before Infernal Story is unlocked.
  return id === "central"
    ? null
    : lockedReason(regionById(id).worldId + "-1", "normal", clears, legacy);
}
