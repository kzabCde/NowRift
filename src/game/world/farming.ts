import type { CampaignResult } from "../campaign/rewards";
import { resolveRewards } from "../campaign/rewards";
import { FARM, farmingNodes, near, type Point } from "./content";
import { STAGES } from "../campaign/content";
export type ExpeditionPrompt = {
  target: string | null;
  ready: boolean;
  gathered: string[];
  seconds: number;
  kills: number;
};
export function farmPrompt(
  p: Point,
  seconds: number,
  kills: number,
  gathered: readonly string[],
  stageId: string = FARM.stageId,
): ExpeditionPrompt {
  const target = near(p, FARM.portal, FARM.range)
    ? "extract"
    : (farmingNodes(stageId).find(
        (n) => !gathered.includes(n.id) && near(p, n, FARM.range),
      )?.id ?? null);
  return {
    target,
    ready: seconds >= FARM.minimumSeconds && kills >= FARM.minimumKills,
    gathered: [...gathered],
    seconds: Math.floor(seconds),
    kills,
  };
}
export function validHarvest(
  v: unknown,
  stageId: string = FARM.stageId,
): v is string[] {
  const nodes = farmingNodes(stageId);
  return (
    Array.isArray(v) &&
    v.length <= nodes.length &&
    new Set(v).size === v.length &&
    v.every((id) => nodes.some((n) => n.id === id))
  );
}
export function farmingRewards(run: CampaignResult) {
  if (
    !STAGES.some((s) => s.id === run.stageId) ||
    !validHarvest(run.harvested, run.stageId)
  )
    throw new Error("Invalid expedition.");
  if (
    run.victory &&
    (run.seconds < FARM.minimumSeconds ||
      run.enemies + run.elites + run.bosses < FARM.minimumKills)
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
      const node = farmingNodes(run.stageId).find((n) => n.id === id)!;
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
