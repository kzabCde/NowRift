/** Authored hub geometry. Coordinates are world units; original art uses a 2× pixel scale. */
import { STAGES, DIFFICULTIES } from "../campaign/content";
import { lockedReason } from "../campaign/progression";
import type { StageSelection } from "../campaign/loader";
import { CollisionIndex } from "./spatial";
import { HAVEN, LANDMARKS, SOLIDS } from "./city";
export { HAVEN, LANDMARKS, SOLIDS } from "./city";
export type { Point, Solid, Landmark, InteractionKind } from "./city";
import type { Point, Landmark } from "./city";
export const cityCollision = new CollisionIndex(SOLIDS);
export const FARM = {
  id: "forest-gathering",
  stageId: "forest-1",
  minimumSeconds: 20,
  minimumKills: 5,
  portal: { x: 900, y: 760 },
  range: 85,
  nodes: [
    { id: "fallen-wood", item: "wood", amount: 3, x: 710, y: 700 },
    { id: "slime-nest", item: "slime-core", amount: 2, x: 1080, y: 710 },
    { id: "copper-vein", item: "copper-ore", amount: 2, x: 900, y: 540 },
  ],
} as const;
export function near(a: Point, b: Point, r: number = HAVEN.range) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= r * r;
}
export function travelReason(
  destination: StageSelection,
  clears: readonly string[],
  legacyAccess: readonly string[] = [],
): string | null {
  if (
    !STAGES.some((s) => s.id === destination.stageId) ||
    !Object.hasOwn(DIFFICULTIES, destination.difficulty) ||
    !Number.isSafeInteger(destination.seed) ||
    destination.seed < 0 ||
    destination.seed > 4294967295 ||
    (destination.activity !== undefined &&
      destination.activity !== "farming") ||
    (destination.mode !== undefined &&
      !["story", "free"].includes(destination.mode)) ||
    (destination.activity === "farming" && destination.mode === "story")
  )
    return "Invalid expedition.";
  return lockedReason(
    destination.stageId,
    destination.difficulty,
    clears,
    legacyAccess,
  );
}
export function nearest(p: Point): Landmark | null {
  let found: Landmark | null = null,
    distance = HAVEN.range ** 2;
  for (const landmark of LANDMARKS) {
    const n =
      (p.x - landmark.entrance.x) ** 2 + (p.y - landmark.entrance.y) ** 2;
    if (n <= distance) {
      distance = n;
      found = landmark;
    }
  }
  return found;
}
export function validPosition(value: unknown): value is Point {
  if (!value || typeof value !== "object") return false;
  const p = value as Point;
  const r = HAVEN.radius;
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    p.x >= r &&
    p.y >= r &&
    p.x <= HAVEN.width - r &&
    p.y <= HAVEN.height - r &&
    ![...cityCollision.near(p, r)].some(
      (s) =>
        p.x + r > s.x &&
        p.x - r < s.x + s.w &&
        p.y + r > s.y &&
        p.y - r < s.y + s.h,
    )
  );
}
export function move(
  p: Point,
  x: number,
  y: number,
  seconds: number,
  speed = HAVEN.speed,
): Point {
  const length = Math.hypot(x, y),
    dt = Math.max(0, Math.min(seconds, 0.05));
  if (length > 1) {
    x /= length;
    y /= length;
  }
  const next = { ...p };
  const a = { x: p.x + x * speed * dt, y: p.y };
  if (validPosition(a)) next.x = a.x;
  const b = { x: next.x, y: p.y + y * speed * dt };
  if (validPosition(b)) next.y = b.y;
  return next;
}
