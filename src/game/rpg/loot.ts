import type { CampaignResult, Rewards } from "../campaign/rewards";
import { seeded, stageById, DIFFICULTIES, WORLDS } from "../campaign/content";
import { EQUIPMENT_DROPS } from "./content";
import { SLOTS, type EquipmentInstance, type Rarity } from "./model";
import { createEquipment, weightedRarity } from "./items";
export function equipmentLoot(
  run: CampaignResult,
  reward: Rewards,
): EquipmentInstance[] {
  const stage = stageById(run.stageId),
    rng = seeded(run.seed ^ 0x917aa),
    level = stage.number + WORLDS.findIndex((w) => w.id === stage.worldId) * 4,
    factor = DIFFICULTIES[run.difficulty].reward,
    items: EquipmentInstance[] = [];
  function roll(count: number, chance: number, min: Rarity = "common") {
    for (let i = 0; i < count; i++)
      if (rng() < Math.min(1, chance * factor)) {
        const slot = SLOTS[Math.floor(rng() * SLOTS.length)];
        items.push(
          createEquipment(
            `${run.id}:equipment:${items.length}`,
            `${stage.worldId}-${slot}`,
            weightedRarity(rng, factor, min),
            level,
            rng,
          ),
        );
      }
  }
  roll(run.enemies, EQUIPMENT_DROPS.enemy);
  roll(run.elites, EQUIPMENT_DROPS.elite, "uncommon");
  for (let i = 0; i < run.bosses; i++)
    if (rng() < EQUIPMENT_DROPS.boss)
      items.push(
        createEquipment(
          `${run.id}:equipment:${items.length}`,
          "boss-" + stage.worldId,
          weightedRarity(rng, factor, "rare"),
          level,
          rng,
        ),
      );
  if (run.victory) roll(1, EQUIPMENT_DROPS.completion, "uncommon");
  if (reward.firstClear) roll(1, EQUIPMENT_DROPS.firstClear, "uncommon");
  return items;
}
