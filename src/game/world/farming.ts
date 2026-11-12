import type { CampaignResult } from "../campaign/rewards";
import { resolveRewards } from "../campaign/rewards";
import { STAGES, stageById, worldById } from "../campaign/content";
import type { MapLayout } from "../campaign/maps";
import { FARM, near, type Point } from "./content";

export type SupplyNode = {
  id: string;
  item: string;
  amount: number;
  x: number;
  y: number;
};
export type ExpeditionLayout = {
  portal: Point;
  range: number;
  minimumSeconds: number;
  minimumKills: number;
  nodes: readonly SupplyNode[];
};
export type ExpeditionPrompt = {
  target: string | null;
  ready: boolean;
  gathered: string[];
  seconds: number;
  kills: number;
};

/** Supply expeditions share the authored stage map, not its story-clear objective. */
export function expeditionLayout(
  stageId: string,
  map?: MapLayout,
): ExpeditionLayout {
  const stage = stageById(stageId);
  // Preserve the prologue quest, its checkpoints, and existing forest caches.
  if (stageId === FARM.stageId) return FARM;
  const world = worldById(stage.worldId);
  const positions = [
    { x: 710, y: 700 },
    { x: 1080, y: 710 },
    { x: 900, y: 540 },
    { x: 700, y: 900 },
    { x: 1110, y: 900 },
    { x: 650, y: 520 },
    { x: 1150, y: 510 },
    { x: 860, y: 990 },
    { x: 1150, y: 1040 },
  ];
  const occupied: Point[] = [];
  const nodes = world.materials.map((item, i) => {
    const point =
      positions.find(
        (p) =>
          Math.hypot(p.x - FARM.portal.x, p.y - FARM.portal.y) > 130 &&
          occupied.every((q) => Math.hypot(p.x - q.x, p.y - q.y) > 120) &&
          !map?.props.some(
            (o) => Math.hypot(p.x - o.x, p.y - o.y) < o.r + 38,
          ) &&
          map?.tiles[Math.floor(p.y / 32)]?.[Math.floor(p.x / 32)] !== 2,
      ) ?? positions[i];
    occupied.push(point);
    return {
      id: `${stageId}-supply-${i}`,
      item,
      amount: [3, 2, 2][i] ?? 2,
      ...point,
    };
  });
  return {
    portal: FARM.portal,
    range: FARM.range,
    minimumSeconds: FARM.minimumSeconds,
    minimumKills: FARM.minimumKills,
    nodes,
  };
}
export function farmPrompt(
  p: Point,
  seconds: number,
  kills: number,
  gathered: readonly string[],
  layout: ExpeditionLayout = FARM,
): ExpeditionPrompt {
  const target = near(p, layout.portal, layout.range)
    ? "extract"
    : (layout.nodes.find(
        (n) => !gathered.includes(n.id) && near(p, n, layout.range),
      )?.id ?? null);
  return {
    target,
    ready: seconds >= layout.minimumSeconds && kills >= layout.minimumKills,
    gathered: [...gathered],
    seconds: Math.floor(seconds),
    kills,
  };
}
export function validHarvest(
  v: unknown,
  stageId: string = FARM.stageId,
): v is string[] {
  if (!STAGES.some((stage) => stage.id === stageId)) return false;
  const nodes = expeditionLayout(stageId).nodes;
  return (
    Array.isArray(v) &&
    v.length <= nodes.length &&
    new Set(v).size === v.length &&
    v.every((id) => nodes.some((n) => n.id === id))
  );
}
export function farmingRewards(run: CampaignResult) {
  const layout = expeditionLayout(run.stageId);
  if (!validHarvest(run.harvested, run.stageId))
    throw new Error("Invalid expedition.");
  if (
    run.victory &&
    (run.seconds < layout.minimumSeconds ||
      run.enemies + run.elites + run.bosses < layout.minimumKills)
  )
    throw new Error("Extraction is not ready.");
  const eligible = { ...run, victory: false };
  const reward = resolveRewards(
    {
      ...eligible,
      ...(!run.victory ? { enemies: 0, elites: 0, bosses: 0 } : {}),
    },
    false,
  );
  if (run.victory)
    for (const id of run.harvested ?? []) {
      const node = layout.nodes.find((n) => n.id === id)!;
      reward.materials[node.item] =
        (reward.materials[node.item] ?? 0) + node.amount;
    }
  return {
    eligible: {
      ...eligible,
      ...(!run.victory ? { enemies: 0, elites: 0, bosses: 0 } : {}),
    },
    reward,
  };
}
