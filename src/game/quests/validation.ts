import type { QuestDefinition, QuestJournal, QuestStatus } from "./types";

const statuses: QuestStatus[] = [
  "LOCKED",
  "AVAILABLE",
  "ACTIVE",
  "OBJECTIVE_COMPLETED",
  "READY_TO_CLAIM",
  "COMPLETED",
  "FAILED",
];
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const count = (v: unknown, max = Number.MAX_SAFE_INTEGER): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= max;
const time = (v: unknown) => v === null || count(v, 8_640_000_000_000_000);
const strings = (v: unknown, limit: number): v is string[] =>
  Array.isArray(v) &&
  v.length <= limit &&
  new Set(v).size === v.length &&
  v.every((s) => typeof s === "string" && s.length > 0 && s.length <= 300);
export function validateQuestDefinitions(
  definitions: readonly QuestDefinition[],
  itemIds?: readonly string[],
) {
  const errors: string[] = [],
    ids = new Set(definitions.map((d) => d.id));
  if (ids.size !== definitions.length) errors.push("Duplicate quest IDs");
  const localized = (v: unknown) =>
    record(v) &&
    typeof v.en === "string" &&
    v.en.trim().length > 0 &&
    typeof v.th === "string" &&
    v.th.trim().length > 0;
  for (const d of definitions) {
    if (!/^[a-z][a-z0-9-]{1,79}$/.test(d.id))
      errors.push("Invalid quest ID: " + d.id);
    if (
      !localized(d.title) ||
      !localized(d.description) ||
      !Object.values(d.dialogue).every(localized)
    )
      errors.push("Missing localization: " + d.id);
    if (
      !d.objectives.length ||
      new Set(d.objectives.map((o) => o.id)).size !== d.objectives.length
    )
      errors.push("Invalid objectives: " + d.id);
    for (const o of d.objectives) {
      if (
        !/^[a-z][a-z0-9-]{1,79}$/.test(o.id) ||
        !o.target.length ||
        !count(o.count, 100_000) ||
        !o.count ||
        !localized(o.text)
      )
        errors.push("Invalid objective: " + d.id + ":" + o.id);
      if (
        itemIds &&
        ["CollectItem", "DeliverItem"].includes(o.type) &&
        !itemIds.includes(o.target)
      )
        errors.push("Missing item: " + o.target);
    }
    if (
      !d.allowedModes.length ||
      new Set(d.allowedModes).size !== d.allowedModes.length ||
      d.allowedModes.some((m) => !["haven", "story", "free"].includes(m))
    )
      errors.push("Invalid quest modes: " + d.id);
    if (d.category === "main" && d.allowedModes.some((m) => m !== "story"))
      errors.push("Main quest accepts non-Story events: " + d.id);
    if (d.prerequisites.some((id) => id === d.id || !ids.has(id)))
      errors.push("Invalid prerequisite: " + d.id);
    if (
      !count(d.reward.gold) ||
      !count(d.reward.xp) ||
      Object.entries(d.reward.materials).some(
        ([id, n]) => !count(n) || (itemIds && !itemIds.includes(id)),
      )
    )
      errors.push("Invalid reward: " + d.id);
    if (
      d.reward.equipment &&
      itemIds &&
      !itemIds.includes(d.reward.equipment.definitionId)
    )
      errors.push("Missing reward equipment: " + d.id);
  }
  const visiting = new Set<string>(),
    done = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) {
      errors.push("Quest prerequisite cycle: " + id);
      return;
    }
    if (done.has(id)) return;
    visiting.add(id);
    for (const p of definitions.find((d) => d.id === id)?.prerequisites ?? [])
      visit(p);
    visiting.delete(id);
    done.add(id);
  }
  for (const id of ids) visit(id);
  return errors;
}
export function validJournal(
  value: unknown,
  definitions: readonly QuestDefinition[],
): value is QuestJournal {
  if (!record(value)) return false;
  const j = value as QuestJournal;
  if (!strings(j.returns, 200) || !strings(j.seenDialogues, 200)) return false;
  if (
    j.runLedger !== null &&
    (!record(j.runLedger) ||
      typeof j.runLedger.id !== "string" ||
      !j.runLedger.id.length ||
      !count(j.runLedger.missionSequence, 512) ||
      !record(j.runLedger.kills) ||
      Object.keys(j.runLedger.kills).some(
        (k) =>
          !["slime", "goblin", "wolf", "caster", "elite", "boss"].includes(k),
      ) ||
      Object.values(j.runLedger.kills).some((n) => !count(n, 50000)) ||
      typeof j.runLedger.seconds !== "number" ||
      !Number.isFinite(j.runLedger.seconds) ||
      j.runLedger.seconds < 0)
  )
    return false;
  if (
    j.schema !== 1 ||
    !record(j.quests) ||
    Object.keys(j.quests).length !== definitions.length ||
    !count(j.sequence) ||
    !strings(j.flags, 1000) ||
    !strings(j.legacyAccess, 24) ||
    j.legacyAccess.some(
      (id) =>
        !/^(forest|desert|frozen|infernal):(entry|hard|nightmare)$/.test(id),
    ) ||
    !strings(j.seenEvents, 2048) ||
    !Array.isArray(j.notices) ||
    j.notices.length > 24
  )
    return false;
  for (const d of definitions) {
    const q = j.quests[d.id];
    if (
      !record(q) ||
      !statuses.includes(q.status) ||
      !record(q.progress) ||
      !strings(q.completedObjectives, d.objectives.length) ||
      !time(q.acceptedAt) ||
      !time(q.completedAt) ||
      typeof q.rewardClaimed !== "boolean" ||
      (q.legacy !== undefined && typeof q.legacy !== "boolean")
    )
      return false;
    if (
      Object.entries(q.progress).some(([id, n]) => {
        const o = d.objectives.find((o) => o.id === id);
        return !o || !count(n, o.count);
      })
    )
      return false;
    if (
      q.completedObjectives.some((id) => {
        const o = d.objectives.find((o) => o.id === id);
        return !o || q.progress[id] !== o.count;
      })
    )
      return false;
    const all = d.objectives.every((o) => q.progress[o.id] === o.count);
    if (
      d.objectives.some(
        (o) =>
          ((q.progress[o.id] ?? 0) === o.count) !==
          q.completedObjectives.includes(o.id),
      )
    )
      return false;
    if (
      ["ACTIVE", "OBJECTIVE_COMPLETED", "READY_TO_CLAIM", "FAILED"].includes(
        q.status,
      ) &&
      q.acceptedAt === null
    )
      return false;
    if (q.status === "FAILED" && !d.failOnMissionLoss) return false;
    if ((q.status === "READY_TO_CLAIM" || q.status === "COMPLETED") && !all)
      return false;
    if (
      q.rewardClaimed !== (q.status === "COMPLETED") ||
      (q.legacy && q.status !== "COMPLETED")
    )
      return false;
    if (
      (q.status === "LOCKED" || q.status === "AVAILABLE") &&
      (Object.values(q.progress).some((n) => n > 0) || q.acceptedAt !== null)
    )
      return false;
    if (q.status === "COMPLETED" && q.completedAt === null) return false;
  }
  if (
    j.tracked !== null &&
    (!j.quests[j.tracked] ||
      !["ACTIVE", "OBJECTIVE_COMPLETED", "READY_TO_CLAIM"].includes(
        j.quests[j.tracked].status,
      ))
  )
    return false;
  return j.notices.every(
    (n) =>
      record(n) &&
      count(n.sequence, j.sequence) &&
      definitions.some(
        (d) =>
          d.id === n.questId &&
          (n.objectiveId === undefined ||
            d.objectives.some((o) => o.id === n.objectiveId)),
      ) &&
      ["accepted", "objective", "ready", "claimed", "failed"].includes(n.kind),
  );
}
