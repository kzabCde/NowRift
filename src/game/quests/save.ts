import { type DifficultyId } from "../campaign/content";
import { legacyCampaignAccess } from "../campaign/access";
import { lockedReason } from "../campaign/progression";
import { QUEST_CATALOG } from "./catalog";
import { createJournal, reconcileQuests } from "./engine";
import { validJournal } from "./validation";
import type { QuestJournal } from "./types";

export function reconcileJournal(j: QuestJournal, clears: readonly string[]) {
  reconcileQuests(
    j,
    QUEST_CATALOG,
    clears,
    (d) =>
      !d.missionStage ||
      (["normal", "hard", "nightmare"] as DifficultyId[]).some(
        (difficulty) =>
          !lockedReason(d.missionStage!, difficulty, clears, j.legacyAccess),
      ),
  );
}
export function migrateJournal(
  value: unknown,
  clears: readonly string[],
  at: number,
): QuestJournal {
  const defaults = createJournal(QUEST_CATALOG),
    fresh = value === undefined;
  if (
    !fresh &&
    (!value ||
      typeof value !== "object" ||
      (value as QuestJournal).schema !== 1 ||
      !(value as QuestJournal).quests)
  )
    throw new Error("Quest journal is damaged or incompatible.");
  const j = fresh ? defaults : structuredClone(value as QuestJournal);
  if (fresh) j.legacyAccess = legacyCampaignAccess(clears);
  j.runLedger ??= null;
  j.returns ??= [];
  j.seenDialogues ??= [];
  for (const d of QUEST_CATALOG) {
    const missing = !Object.hasOwn(j.quests, d.id);
    if (missing) j.quests[d.id] = defaults.quests[d.id];
    if (
      (fresh || missing) &&
      d.missionStage &&
      clears.some((c) => c.startsWith(d.missionStage + ":"))
    ) {
      j.quests[d.id] = {
        status: "COMPLETED",
        progress: Object.fromEntries(d.objectives.map((o) => [o.id, o.count])),
        completedObjectives: d.objectives.map((o) => o.id),
        acceptedAt: at,
        completedAt: at,
        rewardClaimed: true,
        legacy: true,
      };
    }
  }
  reconcileJournal(j, clears);
  if (!validJournal(j, QUEST_CATALOG))
    throw new Error("Quest journal is damaged or incompatible.");
  return j;
}
