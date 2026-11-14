import { initializeRpg } from "../rpg/profile";
import { settleRpg } from "../rpg/settlement";
import { applyCommand } from "../rpg/actions";
import { RELICS, type RelicId } from "../loadout";
import { lockedReason, clearKey, type Progress } from "./progression";
import { resolveRewards, type CampaignResult } from "./rewards";
import { DIFFICULTIES, stageById } from "./content";
import { farmingRewards } from "../world/farming";
import { validMissionReceipt } from "../story/validation";
import { validFog } from "../world/exploration";
import { regionForWorld } from "../world/regions";
export function applyResult(progress: Progress, run: CampaignResult) {
  if (
    typeof run.id !== "string" ||
    !run.id.length ||
    typeof run.victory !== "boolean" ||
    (run.mode !== undefined && !["story", "free"].includes(run.mode)) ||
    (run.activity === "farming" && run.mode === "story") ||
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
  if (
    run.enemyKills !== undefined &&
    (!run.enemyKills ||
      typeof run.enemyKills !== "object" ||
      Array.isArray(run.enemyKills) ||
      Object.entries(run.enemyKills).some(
        ([kind, n]) =>
          !["slime", "goblin", "wolf", "caster", "elite", "boss"].includes(
            kind,
          ) ||
          !Number.isSafeInteger(n) ||
          n < 0 ||
          n > 50000,
      ) ||
      Object.values(run.enemyKills).reduce((a, b) => a + b, 0) >
        run.enemies + run.elites + run.bosses)
  )
    throw new Error("Invalid enemy evidence.");
  const stage = stageById(run.stageId),
    reason = lockedReason(
      stage.id,
      run.difficulty,
      progress.clears,
      progress.local?.journal?.legacyAccess,
    );
  if (
    run.explored !== undefined &&
    !validFog(run.explored, regionForWorld(stage.worldId).id, "wilderness")
  )
    throw new Error("Invalid exploration data.");
  if (reason) throw new Error(reason);
  if (
    stage.number > 5 &&
    run.mode !== "free" &&
    !run.activity &&
    run.victory &&
    !run.mission
  )
    throw new Error("Complete the Story mission objectives first.");
  if (
    run.mission &&
    (run.mode === "free" ||
      run.activity ||
      !run.victory ||
      !validMissionReceipt(run.mission, run.stageId))
  )
    throw new Error("Invalid Story mission completion.");
  if (
    run.victory &&
    !run.mission &&
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
    reward = resolveRewards(
      run,
      run.mode !== "free" && !progress.clears.includes(key),
    );
  for (const [id, n] of Object.entries(run.mission?.gathered ?? {}))
    reward.materials[id] = (reward.materials[id] ?? 0) + n;
  reward.xp += Math.max(0, Math.floor(run.earnedXp ?? 0));
  const settled = settleRpg(progress, run, reward),
    next = settled.progress;
  next.receipts.push(run.id);
  if (run.mode !== "free" && run.victory && !next.clears.includes(key))
    next.clears.push(key);
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
