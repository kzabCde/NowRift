import { CITY, districtAt, type Point } from "./city";
import { HAVEN, validPosition } from "./content";
import type { WorldSave } from "./save";
import { regionalCity, cityBounds } from "./regional-city";
import { REGION_IDS, regionAccessReason, type RegionId } from "./regions";
import { currentRegion } from "./exploration";
import { near } from "./content";

export const WAYPOINTS = CITY.waypoints;
export type Waypoint = (typeof WAYPOINTS)[number];
export const INITIAL_WAYPOINTS = WAYPOINTS.filter((w) => w.initial).map(
  (w) => w.id,
);
export function waypoint(id: string) {
  return allWaypoints().find((w) => w.id === id);
}
export function waypointRegion(id: string): RegionId {
  return (
    REGION_IDS.find((r) => r !== "central" && id.startsWith(r + "-")) ??
    "central"
  );
}
export function waypointsIn(region: RegionId) {
  return regionalCity(region).waypoints;
}
export function allWaypoints() {
  return REGION_IDS.flatMap(waypointsIn);
}
export function safePositionNear(
  point: Point,
  district?: string,
  region: RegionId = "central",
): Point | null {
  const bounds = cityBounds(region);
  if (
    !point ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    point.x < HAVEN.radius ||
    point.y < HAVEN.radius ||
    point.x > bounds.width - HAVEN.radius ||
    point.y > bounds.height - HAVEN.radius
  )
    return null;
  for (let radius = 0; radius <= 128; radius += 16)
    for (const [dx, dy] of radius === 0
      ? [[0, 0]]
      : [
          [0, radius],
          [radius, 0],
          [0, -radius],
          [-radius, 0],
          [radius, radius],
          [-radius, radius],
          [radius, -radius],
          [-radius, -radius],
        ]) {
      const candidate = {
        x: Math.round(point.x + dx),
        y: Math.round(point.y + dy),
      };
      if (
        validPosition(candidate, region) &&
        (!district ||
          districtAt(candidate, regionalCity(region).districts).id === district)
      )
        return candidate;
    }
  return null;
}
export function waypointLanding(destination: Waypoint) {
  return safePositionNear(
    destination.spawn,
    destination.district,
    waypointRegion(destination.id),
  );
}
export function fastTravelReason(
  world: WorldSave,
  id: string,
  access?: { clears: readonly string[]; legacy?: readonly string[] },
  viaGate = false,
) {
  const destination = waypoint(id);
  if (!destination) return "Unknown town waypoint.";
  if (world.location !== "haven")
    return "Return to the city before using fast travel.";
  const region = waypointRegion(id);
  if (region !== currentRegion(world)) {
    const locked = regionAccessReason(
      region,
      access?.clears ?? [],
      access?.legacy ?? [],
    );
    if (locked) return locked;
  }
  if (viaGate) {
    const gate = regionalCity(currentRegion(world)).landmarks.find(
      (l) => l.kind === "portal",
    )!;
    const capital = region === "central" ? "plaza" : region + "-plaza";
    if (
      id !== capital ||
      region === currentRegion(world) ||
      !near(world.position, gate.entrance)
    )
      return "Walk to a regional Rift Gate to open a new route.";
  }
  if (!viaGate && !world.waypoints.includes(id))
    return "Explore this district and attune its waypoint first.";
  if (!waypointLanding(destination))
    return "This waypoint has no safe landing. Follow its route instead.";
  return null;
}

/** Coordinate-only upgrade from the published 1800×1500 hub; all progression is retained. */
export function legacyTownPosition(value: unknown): Point {
  const point = value as Point;
  if (
    !point ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    point.x < 0 ||
    point.y < 0 ||
    point.x > 1856 ||
    point.y > 1536
  )
    return { ...HAVEN.spawn };
  return (
    safePositionNear({
      x: (point.x / 1800) * HAVEN.width,
      y: (point.y / 1500) * HAVEN.height,
    }) ?? { ...HAVEN.spawn }
  );
}
