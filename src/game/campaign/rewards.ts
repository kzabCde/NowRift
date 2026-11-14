import {
  DIFFICULTIES,
  seeded,
  stageById,
  type DifficultyId,
  type LootTableDefinition,
} from "./content";
export type Rewards = {
  equipmentCount?: number;
  overflow?: number;
  gold: number;
  xp: number;
  materials: Record<string, number>;
  candidates: string[];
  firstClear: boolean;
};
export type CampaignResult = {
  explored?: string;
  enemyKills?: Partial<Record<import("../content/forest").EnemyKind, number>>;
  mission?: import("../story/types").MissionReceipt;
  /** XP collected in combat since the stage began, credited once on settlement. */
  earnedXp?: number;
  mode?: "story" | "free";
  activity?: "farming";
  harvested?: string[];
  hp?: number;
  run?: import("../persistence/model").RunOwner;
  id: string;
  stageId: string;
  difficulty: DifficultyId;
  seed: number;
  victory: boolean;
  enemies: number;
  elites: number;
  bosses: number;
  seconds: number;
};
export function resolveRewards(
  run: CampaignResult,
  firstClear: boolean,
): Rewards {
  const stage = stageById(run.stageId),
    rng = seeded(run.seed ^ 0xadd),
    factor = DIFFICULTIES[run.difficulty].reward;
  const out: Rewards = {
    gold: 0,
    xp: 0,
    materials: {},
    candidates: [],
    firstClear: run.victory && firstClear,
  };
  function roll(table: LootTableDefinition, count = 1) {
    for (let i = 0; i < count; i++) {
      out.gold += Math.floor(table.gold * factor);
      out.xp += Math.floor(table.xp * factor);
      for (const m of table.materials)
        if (rng() < m.chance) {
          out.materials[m.id] =
            (out.materials[m.id] ?? 0) +
            Math.max(
              1,
              Math.floor(
                (m.min + Math.floor(rng() * (m.max - m.min + 1))) * factor,
              ),
            );
        }
      out.candidates.push(...table.candidates);
    }
  }
  roll(stage.rewards.enemy, run.enemies);
  roll(stage.rewards.elite, run.elites);
  roll(stage.rewards.boss, run.bosses);
  if (run.victory) {
    roll(stage.rewards.completion);
    if (firstClear) roll(stage.rewards.firstClear);
  }
  return out;
}
