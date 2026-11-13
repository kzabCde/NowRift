import layout from "./city-layout.json";

export type Point = { x: number; y: number };
export type Solid = Point & { w: number; h: number };
export type InteractionKind =
  | "npc"
  | "blacksmith"
  | "crafting"
  | "wardrobe"
  | "merchant"
  | "quest-board"
  | "portal"
  | "training"
  | "rest"
  | "storage"
  | "treasure"
  | "guild"
  | "lore"
  | "waypoint";
export type Landmark = Point & {
  id: string;
  name: string;
  kind: InteractionKind;
  art: string;
  entrance: Point;
  solid?: Solid;
  stock?: "armor" | "helmet" | "pants" | "boots" | "supplies" | "resources";
  district?: string;
  waypointId?: string;
};
export type District = (typeof layout.districts)[number];
export type CityProp = (typeof layout.props)[number];
export type CityNpc = (typeof layout.npcs)[number];
export const CITY = layout;
export const DISTRICTS = layout.districts;
export const LANDMARKS = layout.landmarks as Landmark[];
export const HAVEN = {
  width: layout.width,
  height: layout.height,
  spawn: layout.spawn,
  return: layout.return,
  speed: 180,
  radius: 12,
  range: 85,
} as const;
export const SOLIDS: Solid[] = [
  ...LANDMARKS.flatMap((l) => (l.solid ? [l.solid] : [])),
  ...layout.structures.map((s) => s.solid),
  ...layout.props.flatMap((p) => (p.solid ? [p.solid] : [])),
  ...layout.water,
  ...layout.rails,
  ...layout.boundaries,
  ...layout.portalFeet,
  ...layout.arcades.flatMap((a) => a.feet),
];

export function insidePolygon(p: Point, polygon: readonly Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
export function districtAt(p: Point): District {
  return (
    DISTRICTS.find((d) => insidePolygon(p, d.polygon)) ??
    DISTRICTS.reduce((a, b) =>
      Math.hypot(p.x - a.center.x, p.y - a.center.y) <
      Math.hypot(p.x - b.center.x, p.y - b.center.y)
        ? a
        : b,
    )
  );
}

/** A twenty-minute visual day. It never drives rewards, travel gates or save timestamps. */
export function cityLighting(timeMs: number) {
  const phase = (((timeMs % 1_200_000) + 1_200_000) % 1_200_000) / 1_200_000;
  const daylight = Math.max(0, Math.sin(phase * Math.PI * 2));
  return {
    phase,
    daylight,
    darkness: 0.42 * (1 - daylight),
    night: daylight < 0.3,
  };
}

/** Deterministic cosmetic schedules: occupation during daylight; home at night. */
export function npcPosition(
  npc: CityNpc,
  timeMs: number,
): Point & { moving: boolean; facing: "left" | "right" | "up" | "down" } {
  const lighting = cityLighting(timeMs);
  if (lighting.night) return { ...npc.home, moving: false, facing: "down" };
  const period = 24000 + npc.variant * 2100,
    t = ((timeMs + npc.variant * 3100) % period) / period;
  // Pause at each work stop before walking the short, authored lane to the next.
  const step = t * npc.route.length,
    index = Math.floor(step),
    u = step - index;
  const a = npc.route[index],
    b = npc.route[(index + 1) % npc.route.length];
  const f = Math.max(0, (u - 0.35) / 0.65),
    dx = b.x - a.x,
    dy = b.y - a.y;
  return {
    x: a.x + dx * f,
    y: a.y + dy * f,
    moving: u > 0.35,
    facing:
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? "right"
          : "left"
        : dy > 0
          ? "down"
          : "up",
  };
}

export type CityMilestones = {
  guardians: number;
  extractions: number;
  questClaimed: boolean;
  cacheClaimed: boolean;
};
export function cityMilestones(save: {
  clears: readonly string[];
  local?: {
    world?: { extractions: number; quest: string; cacheClaimed: boolean };
  };
}): CityMilestones {
  return {
    guardians: ["forest", "desert", "frozen", "infernal"].filter((w) =>
      save.clears.includes(`${w}-5:normal`),
    ).length,
    extractions: save.local?.world?.extractions ?? 0,
    questClaimed: save.local?.world?.quest === "claimed",
    cacheClaimed: save.local?.world?.cacheClaimed ?? false,
  };
}
