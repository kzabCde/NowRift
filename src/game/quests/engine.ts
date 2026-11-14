import type {
  QuestAuthority,
  QuestDefinition,
  QuestEvent,
  QuestInstance,
  QuestJournal,
  QuestNotice,
  QuestObjective,
  QuestStatus,
} from "./types";

const active = (status: QuestStatus) =>
  status === "ACTIVE" || status === "OBJECTIVE_COMPLETED";
export function createJournal(
  definitions: readonly QuestDefinition[],
): QuestJournal {
  const journal: QuestJournal = {
    runLedger: null,
    returns: [],
    seenDialogues: [],
    schema: 1,
    quests: {},
    tracked: null,
    flags: [],
    legacyAccess: [],
    seenEvents: [],
    notices: [],
    sequence: 0,
  };
  for (const d of definitions)
    journal.quests[d.id] = {
      status: "LOCKED",
      progress: {},
      completedObjectives: [],
      acceptedAt: null,
      completedAt: null,
      rewardClaimed: false,
    };
  reconcileQuests(journal, definitions, []);
  return journal;
}
function notice(j: QuestJournal, value: Omit<QuestNotice, "sequence">) {
  j.notices.push({ ...value, sequence: ++j.sequence });
  if (j.notices.length > 24) j.notices.splice(0, j.notices.length - 24);
}
export function reconcileQuests(
  j: QuestJournal,
  definitions: readonly QuestDefinition[],
  clears: readonly string[],
  canOffer: (definition: QuestDefinition) => boolean = () => true,
) {
  for (const d of definitions) {
    const q = j.quests[d.id];
    if (!q || !["LOCKED", "AVAILABLE"].includes(q.status)) continue;
    const ready =
      d.prerequisites.every((id) => j.quests[id]?.status === "COMPLETED") &&
      (!d.requiredClear ||
        clears.some(
          (c) => c === d.requiredClear || c.startsWith(d.requiredClear + ":"),
        )) &&
      canOffer(d);
    q.status = ready ? "AVAILABLE" : "LOCKED";
  }
}
export function acceptQuest(j: QuestJournal, d: QuestDefinition, at: number) {
  const q = j.quests[d.id];
  if (!q || q.status !== "AVAILABLE")
    throw new Error("This quest is not available.");
  q.status = "ACTIVE";
  q.acceptedAt = at;
  if (!j.tracked) j.tracked = d.id;
  notice(j, { kind: "accepted", questId: d.id });
}
export function currentObjectives(
  q: QuestInstance,
  d: QuestDefinition,
): QuestObjective[] {
  const remaining = d.objectives.filter(
    (o) => (q.progress[o.id] ?? 0) < o.count,
  );
  return d.sequential ? remaining.slice(0, 1) : remaining;
}
function matches(o: QuestObjective, e: QuestEvent) {
  return (
    o.type === e.type &&
    (o.target === e.target || o.target === "*") &&
    (!o.stageId || o.stageId === e.source.stageId) &&
    (!o.worldId || o.worldId === e.source.worldId)
  );
}
/** Mutates only a transaction-owned journal. One event cannot skip sequential objectives. */
export function advanceQuests(
  j: QuestJournal,
  definitions: readonly QuestDefinition[],
  event: QuestEvent,
  authority: QuestAuthority,
) {
  if (
    !event ||
    typeof event.id !== "string" ||
    !event.id.length ||
    event.id.length > 300 ||
    !Number.isSafeInteger(event.amount) ||
    event.amount <= 0 ||
    event.amount > 1_000_000 ||
    !event.source ||
    event.source.mode !== authority.mode ||
    event.source.runId !== authority.runId ||
    event.source.stageId !== authority.stageId ||
    event.source.worldId !== authority.worldId ||
    (event.type === "CompleteStage" &&
      (authority.mode !== "story" || !authority.verifiedStageCompletion))
  )
    return [];
  if (j.seenEvents.includes(event.id)) return [];
  j.seenEvents.push(event.id);
  if (j.seenEvents.length > 2048)
    j.seenEvents.splice(0, j.seenEvents.length - 2048);
  const changed: string[] = [];
  for (const d of definitions) {
    const q = j.quests[d.id];
    if (
      !q ||
      !active(q.status) ||
      !d.allowedModes.includes(authority.mode) ||
      (d.category === "main" && authority.mode !== "story")
    )
      continue;
    // Capture the eligible set before applying this event: repeated targets do
    // not let a single conversation or pickup complete an entire sequence.
    const eligible = currentObjectives(q, d).filter((o) => matches(o, event));
    if (!eligible.length) continue;
    q.status = "ACTIVE";
    for (const o of eligible) {
      q.progress[o.id] = Math.min(
        o.count,
        (q.progress[o.id] ?? 0) + event.amount,
      );
      if (
        q.progress[o.id] === o.count &&
        !q.completedObjectives.includes(o.id)
      ) {
        q.completedObjectives.push(o.id);
        q.status = "OBJECTIVE_COMPLETED";
        notice(j, { kind: "objective", questId: d.id, objectiveId: o.id });
      }
    }
    if (d.objectives.every((o) => (q.progress[o.id] ?? 0) >= o.count)) {
      q.status = "READY_TO_CLAIM";
      notice(j, { kind: "ready", questId: d.id });
    }
    changed.push(d.id);
  }
  return changed;
}
/** Call only after the repository has granted the real reward in the same transaction. */
export function completeQuest(j: QuestJournal, d: QuestDefinition, at: number) {
  const q = j.quests[d.id];
  if (q?.status === "COMPLETED" && q.rewardClaimed) return false;
  if (
    !q ||
    q.status !== "READY_TO_CLAIM" ||
    !d.objectives.every((o) => (q.progress[o.id] ?? 0) >= o.count)
  )
    throw new Error("Complete every quest objective before claiming.");
  q.status = "COMPLETED";
  q.completedAt = at;
  q.rewardClaimed = true;
  for (const flag of d.reward.flags ?? [])
    if (!j.flags.includes(flag)) j.flags.push(flag);
  notice(j, { kind: "claimed", questId: d.id });
  if (j.tracked === d.id) j.tracked = null;
  return true;
}
export function failQuest(
  j: QuestJournal,
  d: QuestDefinition,
  authority: QuestAuthority,
) {
  const q = j.quests[d.id];
  if (
    !d.failOnMissionLoss ||
    !authority.verifiedMissionFailure ||
    !q ||
    !active(q.status) ||
    authority.mode !== "story" ||
    authority.worldId !== d.chapterId
  )
    return;
  q.status = "FAILED";
  notice(j, { kind: "failed", questId: d.id });
}
export function trackQuest(j: QuestJournal, id: string | null) {
  if (
    id !== null &&
    (!j.quests[id] ||
      (!active(j.quests[id].status) &&
        j.quests[id].status !== "READY_TO_CLAIM"))
  )
    throw new Error("Track an active quest.");
  j.tracked = id;
}
export function giverState(
  j: QuestJournal,
  definitions: readonly QuestDefinition[],
  giver: string,
) {
  const quests = definitions
    .filter((d) => d.giver === giver)
    .map((d) => j.quests[d.id]);
  if (quests.some((q) => q?.status === "READY_TO_CLAIM")) return "ready";
  if (quests.some((q) => q?.status === "AVAILABLE")) return "available";
  if (quests.some((q) => q && active(q.status))) return "active";
  return "none";
}
