/** Authored hub geometry. Coordinates are world units; original art uses a 2× pixel scale. */
import { STAGES, DIFFICULTIES } from "../campaign/content";
import { lockedReason } from "../campaign/progression";
import type { StageSelection } from "../campaign/loader";
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
  | "treasure";
export type Landmark = {
  id: string;
  name: string;
  kind: InteractionKind;
  x: number;
  y: number;
  art: string;
  entrance: Point;
  solid?: Solid;
};
export const HAVEN = {
  width: 1800,
  height: 1500,
  spawn: { x: 900, y: 790 },
  return: { x: 1170, y: 1260 },
  speed: 180,
  radius: 12,
  range: 85,
} as const;
const house = (
  id: string,
  name: string,
  kind: InteractionKind,
  x: number,
  y: number,
  art: string,
): Landmark => ({
  id,
  name,
  kind,
  x,
  y,
  art,
  entrance: { x, y: y + 34 },
  solid: { x: x - 112, y: y - 135, w: 224, h: 122 },
});
export const LANDMARKS: Landmark[] = [
  house("forge", "Ember & Anvil", "blacksmith", 370, 420, "forge"),
  house("workshop", "The Tinker’s Workshop", "crafting", 750, 360, "workshop"),
  house("wardrobe", "Moonthread Atelier", "wardrobe", 1260, 420, "wardrobe"),
  house("market", "Willow Market", "merchant", 1420, 850, "market"),
  house("inn", "The Wayfarer’s Rest", "rest", 380, 960, "inn"),
  house("store", "Wanderer’s Vault", "storage", 710, 1230, "store"),
  {
    id: "mara",
    name: "Mara · Rift Keeper",
    kind: "npc",
    x: 860,
    y: 870,
    art: "npc",
    entrance: { x: 860, y: 900 },
  },
  {
    id: "board",
    name: "The Wanderer’s Journal",
    kind: "quest-board",
    x: 1050,
    y: 890,
    art: "board",
    entrance: { x: 1050, y: 920 },
    solid: { x: 1028, y: 870, w: 44, h: 26 },
  },
  {
    id: "portal",
    name: "Portal Sanctuary",
    kind: "portal",
    x: 1310,
    y: 1180,
    art: "portal",
    entrance: { x: 1310, y: 1245 },
    solid: { x: 1276, y: 1120, w: 68, h: 60 },
  },
  {
    id: "training",
    name: "Training Grounds",
    kind: "training",
    x: 310,
    y: 1240,
    art: "dummy",
    entrance: { x: 310, y: 1290 },
    solid: { x: 296, y: 1220, w: 28, h: 25 },
  },
  {
    id: "cache",
    name: "The Forgotten Cache",
    kind: "treasure",
    x: 1600,
    y: 1350,
    art: "chest",
    entrance: { x: 1600, y: 1380 },
    solid: { x: 1583, y: 1335, w: 34, h: 25 },
  },
];
export const SOLIDS: Solid[] = [
  ...LANDMARKS.flatMap((l) => (l.solid ? [l.solid] : [])),
  { x: 840, y: 570, w: 120, h: 110 },
  { x: 1680, y: 0, w: 75, h: 1020 },
  { x: 1680, y: 1130, w: 75, h: 370 },
];
export const FOLIAGE: Point[] = [];
for (let y = 80; y < 1480; y += 120)
  for (let x = 80; x < 1670; x += 130) {
    if (
      x < 175 ||
      y < 110 ||
      y > 1420 ||
      (x > 1500 && y < 920) ||
      (x > 480 && x < 600 && y > 480 && y < 760)
    )
      FOLIAGE.push({ x: x + Math.sin(x + y) * 18, y });
  }
FOLIAGE.push(
  ...[
    { x: 610, y: 550 },
    { x: 1160, y: 640 },
    { x: 1150, y: 980 },
    { x: 570, y: 800 },
    { x: 1010, y: 1140 },
    { x: 1480, y: 1080 },
    { x: 240, y: 750 },
    { x: 1050, y: 320 },
    { x: 650, y: 1000 },
    { x: 940, y: 1350 },
  ],
);
for (const tree of FOLIAGE)
  SOLIDS.push({ x: tree.x - 13, y: tree.y - 9, w: 26, h: 18 });
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
export function near(a: Point, b: Point, r = HAVEN.range) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= r * r;
}
export function travelReason(
  destination: StageSelection,
  clears: readonly string[],
): string | null {
  if (
    !STAGES.some((s) => s.id === destination.stageId) ||
    !Object.hasOwn(DIFFICULTIES, destination.difficulty) ||
    !Number.isSafeInteger(destination.seed) ||
    destination.seed < 0 ||
    destination.seed > 4294967295 ||
    (destination.activity !== undefined &&
      destination.activity !== "farming") ||
    (destination.activity === "farming" && destination.stageId !== FARM.stageId)
  )
    return "Invalid expedition.";
  return lockedReason(destination.stageId, destination.difficulty, clears);
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
export function validPosition(p: Point) {
  const r = HAVEN.radius;
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    p.x >= r &&
    p.y >= r &&
    p.x <= HAVEN.width - r &&
    p.y <= HAVEN.height - r &&
    !SOLIDS.some(
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
