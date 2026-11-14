import { isRegionId, regionById, REGION_IDS, type RegionId } from "./regions";
import type { Point } from "./city";

export const FOG_CELL = 128;
export const SIGHT_RADIUS = 230;
export type MapDestination = { region: RegionId; landmarkId: string };
export type ExplorationSave = {
  schema: 1;
  region: RegionId;
  explored: Partial<Record<RegionId, string>>;
  destination: MapDestination | null;
  caches: string[];
};
export function fogGrid(region: RegionId) {
  const r = regionById(region),
    columns = Math.ceil(r.width / FOG_CELL),
    rows = Math.ceil(r.height / FOG_CELL);
  return {
    columns,
    rows,
    cells: columns * rows,
    digits: Math.ceil((columns * rows) / 4),
  };
}
export function emptyFog(region: RegionId) {
  return "0".repeat(fogGrid(region).digits);
}
export function validFog(value: unknown, region: RegionId): value is string {
  const { digits, cells } = fogGrid(region);
  return (
    typeof value === "string" &&
    value.length === digits &&
    /^[0-9a-f]+$/.test(value) &&
    (cells % 4 === 0 || parseInt(value.at(-1)!, 16) < 2 ** (cells % 4))
  );
}
export function exploredCell(fog: string, cell: number) {
  return !!(parseInt(fog[Math.floor(cell / 4)] ?? "0", 16) & (1 << cell % 4));
}
export function mergeFog(a: string, b: string, region: RegionId): string {
  if (!validFog(a, region) || !validFog(b, region))
    throw new Error("Invalid exploration data.");
  return [...a]
    .map((v, i) => (parseInt(v, 16) | parseInt(b[i], 16)).toString(16))
    .join("");
}
export function revealFog(fog: string, region: RegionId, point: Point) {
  const grid = fogGrid(region),
    chars = [...fog];
  const x0 = Math.max(0, Math.floor((point.x - SIGHT_RADIUS) / FOG_CELL)),
    x1 = Math.min(
      grid.columns - 1,
      Math.floor((point.x + SIGHT_RADIUS) / FOG_CELL),
    );
  const y0 = Math.max(0, Math.floor((point.y - SIGHT_RADIUS) / FOG_CELL)),
    y1 = Math.min(
      grid.rows - 1,
      Math.floor((point.y + SIGHT_RADIUS) / FOG_CELL),
    );
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (
        Math.hypot(
          (x + 0.5) * FOG_CELL - point.x,
          (y + 0.5) * FOG_CELL - point.y,
        ) >
        SIGHT_RADIUS + FOG_CELL / 2
      )
        continue;
      const cell = y * grid.columns + x,
        digit = Math.floor(cell / 4);
      chars[digit] = (
        parseInt(chars[digit] ?? "0", 16) |
        (1 << cell % 4)
      ).toString(16);
    }
  return chars.join("");
}
export function fogState(
  fog: string,
  region: RegionId,
  point: Point,
  viewer: Point | null,
) {
  if (
    viewer &&
    Math.hypot(point.x - viewer.x, point.y - viewer.y) <= SIGHT_RADIUS
  )
    return "visible" as const;
  const grid = fogGrid(region),
    x = Math.floor(point.x / FOG_CELL),
    y = Math.floor(point.y / FOG_CELL);
  return x >= 0 &&
    y >= 0 &&
    x < grid.columns &&
    y < grid.rows &&
    exploredCell(fog, y * grid.columns + x)
    ? ("explored" as const)
    : ("undiscovered" as const);
}
export function defaultExploration(point: Point): ExplorationSave {
  return {
    schema: 1,
    region: "central",
    explored: { central: revealFog(emptyFog("central"), "central", point) },
    destination: null,
    caches: [],
  };
}
export function validExploration(value: unknown): value is ExplorationSave {
  if (!value || typeof value !== "object") return false;
  const s = value as ExplorationSave;
  return (
    s.schema === 1 &&
    isRegionId(s.region) &&
    !!s.explored &&
    typeof s.explored === "object" &&
    !Array.isArray(s.explored) &&
    Object.entries(s.explored).every(
      ([r, f]) => isRegionId(r) && validFog(f, r),
    ) &&
    REGION_IDS.includes(s.region) &&
    typeof s.explored[s.region] === "string" &&
    Array.isArray(s.caches) &&
    new Set(s.caches).size === s.caches.length &&
    s.caches.every((id) =>
      REGION_IDS.filter((r) => r !== "central").some(
        (r) => id === `${r}-cache`,
      ),
    ) &&
    (s.destination === null ||
      (!!s.destination &&
        isRegionId(s.destination.region) &&
        typeof s.destination.landmarkId === "string" &&
        s.destination.landmarkId.length < 100))
  );
}
export function currentRegion(world?: { atlas?: ExplorationSave }): RegionId {
  return world?.atlas?.region ?? "central";
}
/** One camera-independent projection shared by minimap, local map and marker hit targets. */
export function projectPoint(
  point: Point,
  bounds: { width: number; height: number },
  viewport: { width: number; height: number },
) {
  return {
    x: (point.x / bounds.width) * viewport.width,
    y: (point.y / bounds.height) * viewport.height,
  };
}
export function unprojectPoint(
  point: Point,
  bounds: { width: number; height: number },
  viewport: { width: number; height: number },
) {
  return {
    x: (point.x / viewport.width) * bounds.width,
    y: (point.y / viewport.height) * bounds.height,
  };
}
