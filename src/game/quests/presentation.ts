import type { QuestJournal } from "./types";
import { QUEST_CATALOG } from "./catalog";
import { giverState } from "./engine";
import type { SaveData } from "../persistence/model";
import type { Snapshot } from "../engine";
import { syncRunQuestEvidence } from "./events";
export type QuestGiverStates = Record<string, ReturnType<typeof giverState>>;
export function questGiverStates(
  journal: QuestJournal,
  legacy?: "available" | "active" | "completed" | "claimed",
): QuestGiverStates {
  const states: QuestGiverStates = Object.fromEntries(
    [...new Set(QUEST_CATALOG.map((q) => q.giver))].map((id) => [
      id,
      giverState(journal, QUEST_CATALOG, id),
    ]),
  );
  for (const id of ["mara", "board"]) {
    if (legacy === "completed") states[id] = "ready";
    else if (legacy === "available" && states[id] !== "ready")
      states[id] = "available";
    else if (legacy === "active" && states[id] === "none")
      states[id] = "active";
  }
  return states;
}
/** Live presentation uses a journal-only copy. Only repository checkpoints/settlement commit it. */
export function projectQuestJournal(
  save: SaveData,
  evidence: Snapshot["questEvidence"],
) {
  const run = save.local.activeRun,
    base = save.local.journal!;
  if (
    !run?.stage ||
    !evidence ||
    evidence.runId !== run.id ||
    (base.runLedger?.id === run.id && evidence.seconds < base.runLedger.seconds)
  )
    return base;
  const journal = structuredClone(base),
    projected = { ...save, local: { ...save.local, journal } };
  syncRunQuestEvidence(projected, {
    id: run.id,
    identity: run.stage,
    events: evidence.events,
    kills: evidence.kills,
    seconds: evidence.seconds,
  });
  return journal;
}
