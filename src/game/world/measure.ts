import { CITY, type Point, type Solid } from "./city";
import { cityBounds, citySolids } from "./regional-city";
import { REGIONS, type RegionId } from "./regions";
import { loadStage } from "../campaign/loader";
import { STAGES, stageById } from "../campaign/content";

/** Conservative reachable area: count only whole collision-free cells in the spawn component. */
export function connectedArea(
  bounds: { width: number; height: number },
  spawn: Point,
  walkable: (cell: Solid) => boolean,
  cell = 16,
) {
  const columns = Math.floor(bounds.width / cell),
    rows = Math.floor(bounds.height / cell),
    seen = new Uint8Array(columns * rows),
    free = new Int8Array(columns * rows).fill(-1),
    queue: number[] = [];
  const available = (index: number) => {
    if (free[index] < 0)
      free[index] = Number(
        walkable({
          x: (index % columns) * cell,
          y: Math.floor(index / columns) * cell,
          w: cell,
          h: cell,
        }),
      );
    return free[index] === 1;
  };
  const first =
    Math.floor(spawn.y / cell) * columns + Math.floor(spawn.x / cell);
  if (first < 0 || first >= seen.length || !available(first))
    throw new Error(
      "The spawn does not have a collision-free measurement cell.",
    );
  queue.push(first);
  seen[first] = 1;
  for (let i = 0; i < queue.length; i++) {
    const n = queue[i],
      x = n % columns,
      y = Math.floor(n / columns);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        index = ny * columns + nx;
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= columns ||
        ny >= rows ||
        seen[index] ||
        !available(index)
      )
        continue;
      seen[index] = 1;
      queue.push(index);
    }
  }
  return {
    cellSize: cell,
    reachableCells: queue.length,
    reachableArea: queue.length * cell * cell,
    grossArea: bounds.width * bounds.height,
    width: bounds.width,
    height: bounds.height,
  };
}
export function measureCity(region: RegionId) {
  const bounds = cityBounds(region),
    solids = citySolids(region),
    r = bounds.radius;
  return connectedArea(
    bounds,
    bounds.spawn,
    (c) =>
      c.x >= r &&
      c.y >= r &&
      c.x + c.w <= bounds.width - r &&
      c.y + c.h <= bounds.height - r &&
      !solids.some(
        (s) =>
          c.x + c.w > s.x - r &&
          c.x < s.x + s.w + r &&
          c.y + c.h > s.y - r &&
          c.y < s.y + s.h + r,
      ),
  );
}
export function measureWilderness(region: RegionId) {
  const r = REGIONS.find((r) => r.id === region)!,
    stage = stageById(r.worldId + "-1"),
    g = loadStage({
      stageId: stage.id,
      difficulty: "normal",
      seed: stage.environment.seed,
      clears: STAGES.map((s) => s.id + ":normal"),
      activity: "farming",
      mode: "free",
    }),
    margin = g.player.r + 9;
  const result = connectedArea(
    g,
    g.player,
    (c) =>
      c.x >= margin &&
      c.y >= margin &&
      c.x + c.w <= g.width - margin &&
      c.y + c.h <= g.height - margin &&
      !g.obstacles.some((o) => {
        const x = Math.max(c.x, Math.min(c.x + c.w, o.x)),
          y = Math.max(c.y, Math.min(c.y + c.h, o.y));
        return Math.hypot(x - o.x, y - o.y) < o.r + g.player.r;
      }),
  );
  return { ...result, stageId: stage.id, seed: stage.environment.seed };
}
export function worldAreaReport() {
  const regions = REGIONS.map((r) => ({
    id: r.id,
    name: r.name,
    city: measureCity(r.id),
    wilderness: measureWilderness(r.id),
    boss: {
      stageId: r.bossStage,
      additionalCountedArea: 0,
      note: "Guardian instances reuse the regional biome footprint; no repeated stage, seed or difficulty area is added.",
    },
  }));
  const total = regions.reduce(
    (n, r) => n + r.city.reachableArea + r.wilderness.reachableArea,
    0,
  );
  return {
    schema: 1,
    targetArea: 20_800_000,
    cityLayoutRevision: CITY.schema,
    method:
      "16-unit whole-cell collision-free flood fill from each real spawn; one canonical Free expedition per legacy biome, no decorative cells, disconnected islands or repeated instances.",
    regions,
    totalReachableArea: total,
    targetRatio: total / 20_800_000,
  };
}
