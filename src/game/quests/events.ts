import type { SaveData } from "../persistence/model";
import type { RunCheckpoint } from "../persistence/checkpoint";
import type { RunStageIdentity } from "../campaign/identity";
import type { CampaignResult } from "../campaign/rewards";
import { stageById } from "../campaign/content";
import { QUEST_CATALOG, mainQuestId } from "./catalog";
import { acceptQuest, advanceQuests, failQuest } from "./engine";
import { reconcileJournal } from "./save";
import type { QuestAuthority, QuestEvent } from "./types";
import type { MissionFact } from "../story/types";

const main = QUEST_CATALOG.filter((d) => d.category === "main"),
  optional = QUEST_CATALOG.filter((d) => d.category !== "main");
export function prepareRunQuests(
  p: SaveData,
  runId: string,
  identity: RunStageIdentity,
  resume: boolean,
  at: number,
) {
  const j = p.local.journal!;
  reconcileJournal(j, p.clears);
  if (!resume)
    j.runLedger = { id: runId, missionSequence: 0, kills: {}, seconds: 0 };
  const d = main.find((q) => q.id === mainQuestId(identity.stageId));
  if (
    identity.mode === "story" &&
    identity.missionVersion === 1 &&
    d &&
    j.quests[d.id].status === "AVAILABLE"
  )
    acceptQuest(j, d, at);
}
type Evidence = {
  id: string;
  identity: RunStageIdentity;
  events: MissionFact[];
  kills: Record<string, number>;
  seconds: number;
};
export function syncRunQuestEvidence(
  p: SaveData,
  e: Evidence,
  completed = false,
) {
  const j = p.local.journal!,
    worldId = stageById(e.identity.stageId).worldId;
  const authority: QuestAuthority = {
    mode: e.identity.mode,
    runId: e.id,
    stageId: e.identity.stageId,
    worldId,
    verifiedStageCompletion: completed && e.identity.mode === "story",
  };
  if (j.runLedger?.id !== e.id)
    j.runLedger = { id: e.id, missionSequence: 0, kills: {}, seconds: 0 };
  const ledger = j.runLedger!;
  if (
    e.events.length < ledger.missionSequence ||
    e.seconds + 0.001 < ledger.seconds
  )
    throw new Error("Quest evidence moved behind the saved checkpoint.");
  for (const fact of e.events.slice(ledger.missionSequence)) {
    const event: QuestEvent = {
      id: `${e.id}:mission:${fact.sequence}`,
      type: fact.type,
      target: fact.target,
      amount: fact.amount,
      source: authority,
    };
    advanceQuests(j, main, event, authority);
    // Combat counters and settled inventory already have their own deduplicated ledgers.
    if (
      ![
        "DefeatEnemy",
        "DefeatBoss",
        "CollectItem",
        "SurviveEncounter",
      ].includes(fact.type)
    )
      advanceQuests(
        j,
        optional,
        { ...event, id: event.id + ":optional" },
        authority,
      );
  }
  ledger.missionSequence = e.events.length;
  for (const [kind, total] of Object.entries(ledger.kills))
    if ((e.kills[kind] ?? 0) < total)
      throw new Error("Quest kill evidence moved behind the saved checkpoint.");
  for (const [kind, total] of Object.entries(e.kills)) {
    const previous = ledger.kills[kind] ?? 0;
    if (total < previous)
      throw new Error("Quest kill evidence moved behind the saved checkpoint.");
    if (total > previous)
      advanceQuests(
        j,
        optional,
        {
          id: `${e.id}:kills:${kind}:${total}`,
          type: kind === "boss" ? "DefeatBoss" : "DefeatEnemy",
          target: kind,
          amount: total - previous,
          source: authority,
        },
        authority,
      );
  }
  const seconds = Math.floor(e.seconds),
    previous = Math.floor(ledger.seconds);
  if (seconds > previous)
    advanceQuests(
      j,
      optional,
      {
        id: `${e.id}:seconds:${seconds}`,
        type: "SurviveEncounter",
        target: "encounter",
        amount: seconds - previous,
        source: authority,
      },
      authority,
    );
  ledger.kills = { ...e.kills };
  ledger.seconds = e.seconds;
  if (completed && e.identity.mode === "story") {
    const event: QuestEvent = {
      id: e.id + ":stage-complete",
      type: "CompleteStage",
      target: e.identity.stageId,
      amount: 1,
      source: authority,
    };
    advanceQuests(j, main, event, authority);
    advanceQuests(
      j,
      optional,
      { ...event, id: event.id + ":optional" },
      authority,
    );
    if (
      e.identity.missionVersion === 1 &&
      !j.seenDialogues.includes(e.identity.stageId) &&
      !j.returns.includes(e.identity.stageId)
    )
      j.returns.push(e.identity.stageId);
  }
  reconcileJournal(j, p.clears);
}
export function checkpointQuestEvidence(
  p: SaveData,
  c: RunCheckpoint,
  identity: RunStageIdentity,
) {
  syncRunQuestEvidence(p, {
    id: c.run.id,
    identity,
    events: c.environment?.mission?.events ?? [],
    kills: c.environment?.enemyKills ?? {},
    seconds: c.state.time,
  });
}
export function settleQuestEvidence(
  p: SaveData,
  result: CampaignResult,
  identity: RunStageIdentity,
  previousCheckpoint: RunCheckpoint | null,
) {
  const events =
    result.mission?.events ??
    previousCheckpoint?.environment?.mission?.events ??
    [];
  syncRunQuestEvidence(
    p,
    {
      id: result.id,
      identity,
      events,
      kills:
        result.enemyKills ?? previousCheckpoint?.environment?.enemyKills ?? {},
      seconds: result.seconds,
    },
    result.victory,
  );
  if (!result.victory)
    for (const d of QUEST_CATALOG)
      failQuest(p.local.journal!, d, {
        mode: identity.mode,
        runId: result.id,
        stageId: identity.stageId,
        worldId: stageById(identity.stageId).worldId,
        verifiedMissionFailure: true,
      });
  p.local.journal!.runLedger = null;
}
/** Only a successful real hub interaction may emit a Haven conversation/location event. */
export function havenQuestVisit(
  p: SaveData,
  landmarkId: string,
  districtId?: string,
) {
  if (p.local.world?.location !== "haven") return;
  const source = { mode: "haven" as const },
    j = p.local.journal!,
    prefix = `hub:${p.local.id}:${p.local.revision}:`;
  for (const [type, target] of [
    ["TalkToNPC", landmarkId],
    ["VisitLocation", landmarkId],
    ["InteractWithObject", landmarkId],
    ["DiscoverArea", districtId ?? landmarkId],
  ] as const)
    advanceQuests(
      j,
      optional,
      { id: prefix + type + ":" + target, type, target, amount: 1, source },
      source,
    );
}
export function inventoryQuestGains(
  before: SaveData,
  after: SaveData,
  authority: QuestAuthority,
) {
  const owned = (p: SaveData) => {
    const counts: Record<string, number> = { ...p.materials };
    for (const [id, n] of Object.entries(p.rpg?.consumables ?? {}))
      counts[id] = (counts[id] ?? 0) + n;
    for (const e of p.rpg?.equipment ?? [])
      counts[e.definitionId] = (counts[e.definitionId] ?? 0) + 1;
    for (const o of p.rpg?.overflow ?? []) {
      const id = o.equipment?.definitionId ?? o.definitionId;
      if (id)
        counts[id] = (counts[id] ?? 0) + (o.equipment ? 1 : (o.quantity ?? 0));
    }
    return counts;
  };
  const a = owned(before),
    b = owned(after);
  for (const [id, n] of Object.entries(b))
    if (n > (a[id] ?? 0))
      advanceQuests(
        after.local.journal!,
        optional,
        {
          id: `inventory:${after.local.id}:${after.local.revision}:${id}`,
          type: "CollectItem",
          target: id,
          amount: n - (a[id] ?? 0),
          source: authority,
        },
        authority,
      );
}
