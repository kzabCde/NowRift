import { ITEMS, RARITIES } from "./content";
import type { Progress } from "../campaign/progression";
import type { CampaignResult, Rewards } from "../campaign/rewards";
import { initializeRpg } from "./profile";
import { gold } from "./economy";
import { addEquipment, grantStack } from "./inventory";
import { equipmentLoot } from "./loot";
import { characterLevel } from "./stats";
export function settleRpg(
  profile: Progress,
  run: CampaignResult,
  reward: Rewards,
) {
  const p = initializeRpg(structuredClone(profile)),
    r = p.rpg!,
    equipment = equipmentLoot(run, reward),
    before = r.overflow.length;
  gold(p, reward.gold);
  // Bank XP once with the atomic run receipt; level is derived from total XP.
  reward.xp = Math.floor(
    reward.xp * (1 + Math.min(1.5, (characterLevel(p.xp).level - 1) * 0.025)),
  );
  p.xp += reward.xp;
  for (const [id, n] of Object.entries(reward.materials))
    if (n > 0) grantStack(p, id, n, run.id + ":material:" + id);
  for (const item of equipment)
    addEquipment(p, item, run.id + ":parcel:" + item.id);
  r.revision++;
  r.history.push({
    id: run.id,
    at: Date.now(),
    kind: "rewards",
    gold: reward.gold,
    message: `${run.victory ? "Stage cleared" : "Run ended"}: ${equipment.length} equipment obtained${r.overflow.length > before ? " (overflow protected)" : ""}.`,
    items: [
      ...Object.entries(reward.materials).map(
        ([id, n]) => `${ITEMS[id].name} ×${n}`,
      ),
      ...equipment.map(
        (e) => `${ITEMS[e.definitionId].name} [${RARITIES[e.rarity].name}]`,
      ),
    ],
  });
  return {
    progress: p,
    equipmentCount: equipment.length,
    overflow: r.overflow.length - before,
  };
}
