import { initializeRpg } from "../rpg/profile";
import { settleRpg } from "../rpg/settlement";
import { applyCommand } from "../rpg/actions";
import { RELICS, type RelicId } from "../loadout";
import { lockedReason, clearKey, type Progress } from "./progression";
import { resolveRewards, type CampaignResult } from "./rewards";
import { DIFFICULTIES, stageById } from "./content";
import { farmingRewards } from "../world/farming";
export function applyResult(progress: Progress, run: CampaignResult) {
  if (
    typeof run.id !== "string" ||
    !run.id.length ||
    typeof run.victory !== "boolean" ||
    !Number.isInteger(run.seed) ||
    run.seed < 0 ||
    run.seed > 4294967295 ||
    ![run.enemies, run.elites, run.bosses].every(
      (n) => Number.isSafeInteger(n) && n >= 0 && n <= 50000,
    ) ||
    !DIFFICULTIES[run.difficulty] ||
    ![run.enemies, run.elites, run.bosses, run.seconds].every(
      (n) => Number.isFinite(n) && n >= 0,
    )
  )
    throw new Error("Invalid result");
  const stage = stageById(run.stageId),
    reason = run.mode === "free" ? null : lockedReason(stage.id, run.difficulty, progress.clears);
  if (reason) throw new Error(reason);
  if (
    run.victory &&
    !run.activity &&
    (run.seconds <
      stage.clear.seconds * DIFFICULTIES[run.difficulty].duration ||
      (stage.clear.kind === "boss" && run.bosses < 1))
  )
    throw new Error("Clear condition not met");
  if (progress.receipts.includes(run.id)) return { progress, reward: null };
  if (run.activity !== undefined && run.activity !== "farming")
    throw new Error("Invalid expedition.");
  if (run.activity === "farming") {
    const { eligible, reward } = farmingRewards(run);
    reward.xp += Math.max(0, Math.floor(run.earnedXp ?? 0));
    const settled = settleRpg(progress, eligible, reward);
    settled.progress.receipts.push(run.id);
    reward.equipmentCount = settled.equipmentCount;
    reward.overflow = settled.overflow;
    return { progress: settled.progress, reward };
  }
  const key = clearKey(run.stageId, run.difficulty),
    reward = resolveRewards(run, run.mode !== "free" && !progress.clears.includes(key));
  reward.xp += Math.max(0, Math.floor(run.earnedXp ?? 0));
  const settled = settleRpg(progress, run, reward),
    next = settled.progress;
  next.receipts.push(run.id);
  if (run.mode !== "free" && run.victory && !next.clears.includes(key)) next.clears.push(key);
  reward.equipmentCount = settled.equipmentCount;
  reward.overflow = settled.overflow;
  return { progress: next, reward };
}
/** Compatibility adapter for the former one-relic API; all mutations use the RPG transaction rules. */
export function changeEquipment(
  progress: Progress,
  action: "equip" | "enhance",
  id: RelicId | null,
): Progress {
  const p = initializeRpg(progress),
    r = p.rpg!;
  const def =
    id && Object.hasOwn(RELICS, id) ? "boss-" + RELICS[id].world : null;
  const item = def
    ? (r.equipment.find(
        (e) => e.definitionId === def && e.id === r.equipped.necklace,
      ) ?? r.equipment.find((e) => e.definitionId === def))
    : null;
  if (id !== null && !item)
    throw new Error("Earn this relic by defeating its world guardian first.");
  if (action === "enhance" && !item)
    throw new Error("Choose a relic to enhance.");
  if (action === "equip" && !item && !r.equipped.necklace) return p;
  return applyCommand(p, {
    id: `legacy-action-${r.revision}-${action}-${id}`,
    at: Date.now(),
    expectedRevision: r.revision,
    action:
      action === "enhance"
        ? {
            type: "enhance",
            itemId: item!.id,
            expectedEnhancement: item!.enhancement,
          }
        : item
          ? { type: "equip", itemId: item.id }
          : { type: "unequip", slot: "necklace" },
  }).progress;
}
