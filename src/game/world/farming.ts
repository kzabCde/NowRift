import type { CampaignResult } from "../campaign/rewards";
import { resolveRewards } from "../campaign/rewards";
import { FARM, near, type Point } from "./content";
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
): ExpeditionPrompt {
  const target = near(p, FARM.portal, FARM.range)
    ? "extract"
    : (FARM.nodes.find(
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
export function validHarvest(v: unknown): v is string[] {
  return (
    Array.isArray(v) &&
    v.length <= FARM.nodes.length &&
    new Set(v).size === v.length &&
    v.every((id) => FARM.nodes.some((n) => n.id === id))
  );
}
export function farmingRewards(run: CampaignResult) {
  if (run.stageId !== FARM.stageId || !validHarvest(run.harvested))
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
      const node = FARM.nodes.find((n) => n.id === id)!;
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
