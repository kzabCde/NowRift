import { expect, test } from "vitest";
import {
  acceptQuest,
  advanceQuests,
  completeQuest,
  createJournal,
  failQuest,
  giverState,
  reconcileQuests,
  trackQuest,
} from "./engine";
import { validJournal, validateQuestDefinitions } from "./validation";
import type {
  QuestAuthority,
  QuestDefinition,
  QuestEvent,
  QuestObjective,
} from "./types";

const title = { en: "A remembered road", th: "เส้นทางในความทรงจำ" };
const objective = (
  id: string,
  type: QuestObjective["type"],
  target: string,
  count = 1,
): QuestObjective => ({ id, type, target, count, text: title });
const definition = (
  overrides: Partial<QuestDefinition> = {},
): QuestDefinition => ({
  id: "road-home",
  category: "side",
  chapterId: "forest",
  title,
  description: title,
  giver: "mara",
  prerequisites: [],
  allowedModes: ["haven", "story", "free"],
  sequential: true,
  objectives: [
    objective("find-road", "DiscoverArea", "forest-road"),
    objective("tell-mara", "TalkToNPC", "mara"),
  ],
  reward: {
    gold: 20,
    xp: 15,
    materials: { wood: 2 },
    flags: ["road-remembered"],
  },
  dialogue: { offer: title, progress: title, ready: title, complete: title },
  ...overrides,
});
const source: QuestAuthority = {
  mode: "story",
  runId: "run-a",
  stageId: "forest-1",
  worldId: "forest",
};
const event = (
  id: string,
  type: QuestEvent["type"],
  target: string,
  amount = 1,
): QuestEvent => ({ id, type, target, amount, source });
test("real ordered events complete only the current objective and a claim unlocks dependants", () => {
  const d = definition(),
    child = definition({ id: "second-road", prerequisites: [d.id] }),
    defs = [d, child],
    j = createJournal(defs);
  expect(giverState(j, defs, "mara")).toBe("available");
  expect(() => acceptQuest(j, child, 10)).toThrow("not available");
  acceptQuest(j, d, 10);
  expect(
    advanceQuests(j, defs, event("early-talk", "TalkToNPC", "mara"), source),
  ).toEqual([]);
  advanceQuests(j, defs, event("road", "DiscoverArea", "forest-road"), source);
  expect(j.quests[d.id].status).toBe("OBJECTIVE_COMPLETED");
  const haven = { mode: "haven" as const };
  advanceQuests(
    j,
    defs,
    { ...event("return", "TalkToNPC", "mara"), source: haven },
    haven,
  );
  expect(j.quests[d.id].status).toBe("READY_TO_CLAIM");
  expect(giverState(j, defs, "mara")).toBe("ready");
  expect(completeQuest(j, d, 20)).toBe(true);
  expect(completeQuest(j, d, 30)).toBe(false);
  expect(j.flags).toEqual(["road-remembered"]);
  reconcileQuests(j, defs, []);
  expect(j.quests[child.id].status).toBe("AVAILABLE");
  expect(validJournal(j, defs)).toBe(true);
});
test("a single conversation cannot complete repeated targets in a sequence", () => {
  const d = definition({
      objectives: [
        objective("first-talk", "TalkToNPC", "mara"),
        objective("second-talk", "TalkToNPC", "mara"),
      ],
    }),
    j = createJournal([d]);
  acceptQuest(j, d, 1);
  advanceQuests(j, [d], event("one", "TalkToNPC", "mara"), source);
  expect(j.quests[d.id].completedObjectives).toEqual(["first-talk"]);
  expect(
    advanceQuests(j, [d], event("one", "TalkToNPC", "mara"), source),
  ).toEqual([]);
  advanceQuests(j, [d], event("two", "TalkToNPC", "mara"), source);
  expect(j.quests[d.id].status).toBe("READY_TO_CLAIM");
});
test("Free events cannot advance Main quests, including forged Story labels", () => {
  const d = definition({
      category: "main",
      allowedModes: ["story"],
      objectives: [objective("defeat", "DefeatEnemy", "slime", 3)],
    }),
    side = definition({ id: "supply-road", objectives: d.objectives }),
    j = createJournal([d, side]);
  acceptQuest(j, d, 1);
  acceptQuest(j, side, 1);
  const free = { ...source, mode: "free" as const };
  const forged = event("forged", "DefeatEnemy", "slime", 3);
  expect(advanceQuests(j, [d, side], forged, free)).toEqual([]);
  advanceQuests(
    j,
    [d, side],
    { ...forged, id: "legitimate", source: free },
    free,
  );
  expect(j.quests[d.id].progress).toEqual({});
  expect(j.quests[side.id].status).toBe("READY_TO_CLAIM");
});
test("completion requires verified Story settlement with matching stage and run authority", () => {
  const d = definition({
      category: "main",
      allowedModes: ["story"],
      objectives: [
        {
          ...objective("finish", "CompleteStage", "forest-1"),
          stageId: "forest-1",
        },
      ],
    }),
    j = createJournal([d]);
  acceptQuest(j, d, 1);
  const e = event("finish", "CompleteStage", "forest-1");
  for (const authority of [
    source,
    { ...source, runId: "other" },
    { ...source, stageId: "desert-1" },
    { ...source, mode: "free" as const },
  ])
    expect(advanceQuests(j, [d], e, authority)).toEqual([]);
  advanceQuests(j, [d], e, { ...source, verifiedStageCompletion: true });
  expect(j.quests[d.id].status).toBe("READY_TO_CLAIM");
});
test("reloaded receipts prevent duplicate event progress and objectives clamp to their authored goals", () => {
  const d = definition({
      objectives: [objective("defeat", "DefeatEnemy", "wolf", 5)],
    }),
    j = createJournal([d]);
  acceptQuest(j, d, 1);
  const e = event("kills-3", "DefeatEnemy", "wolf", 3);
  advanceQuests(j, [d], e, source);
  const restored = JSON.parse(JSON.stringify(j));
  advanceQuests(restored, [d], e, source);
  expect(restored.quests[d.id].progress.defeat).toBe(3);
  expect(() => completeQuest(restored, d, 10)).toThrow("every quest objective");
  advanceQuests(restored, [d], { ...e, id: "kills-8", amount: 8 }, source);
  expect(restored.quests[d.id].progress.defeat).toBe(5);
  expect(validJournal(restored, [d])).toBe(true);
});
test("world and stage-scoped events reject wrong locations and malformed quantities", () => {
  const d = definition({
      objectives: [
        {
          ...objective("collect", "CollectItem", "wood", 2),
          worldId: "forest",
          stageId: "forest-1",
        },
      ],
    }),
    j = createJournal([d]);
  acceptQuest(j, d, 1);
  for (const amount of [0, -1, NaN, Infinity, 1.5, 1_000_001])
    expect(
      advanceQuests(
        j,
        [d],
        event("bad-" + amount, "CollectItem", "wood", amount),
        source,
      ),
    ).toEqual([]);
  const wrong = { ...source, worldId: "desert" as const };
  advanceQuests(
    j,
    [d],
    { ...event("wrong", "CollectItem", "wood", 2), source: wrong },
    wrong,
  );
  expect(j.quests[d.id].progress).toEqual({});
});
test("only explicitly fallible quests can fail on a verified Story mission loss", () => {
  const stable = definition(),
    fallible = definition({ id: "dangerous-road", failOnMissionLoss: true }),
    j = createJournal([stable, fallible]);
  acceptQuest(j, stable, 1);
  acceptQuest(j, fallible, 1);
  failQuest(j, fallible, source);
  expect(j.quests[fallible.id].status).toBe("ACTIVE");
  const lost = { ...source, verifiedMissionFailure: true };
  failQuest(j, stable, lost);
  failQuest(j, fallible, lost);
  expect(j.quests[stable.id].status).toBe("ACTIVE");
  expect(j.quests[fallible.id].status).toBe("FAILED");
});
test("tracking and giver markers reflect persisted state rather than awarding progress", () => {
  const d = definition(),
    j = createJournal([d]);
  expect(() => trackQuest(j, d.id)).toThrow("active");
  acceptQuest(j, d, 1);
  const before = structuredClone(j.quests[d.id]);
  trackQuest(j, null);
  trackQuest(j, d.id);
  expect(j.quests[d.id]).toEqual(before);
  expect(giverState(j, [d], "mara")).toBe("active");
});
test("catalog validation detects missing translations, items, duplicate IDs and prerequisite cycles", () => {
  const d = definition();
  expect(validateQuestDefinitions([d], ["wood"])).toEqual([]);
  expect(validateQuestDefinitions([d, d])).toContain("Duplicate quest IDs");
  expect(
    validateQuestDefinitions(
      [definition({ reward: { gold: 1, xp: 1, materials: { unknown: 2 } } })],
      ["wood"],
    ),
  ).toContain("Invalid reward: road-home");
  expect(
    validateQuestDefinitions([definition({ title: { en: "Road", th: "" } })]),
  ).toContain("Missing localization: road-home");
  expect(
    validateQuestDefinitions([
      definition({ prerequisites: ["other-road"] }),
      definition({ id: "other-road", prerequisites: [d.id] }),
    ]).some((e) => e.includes("cycle")),
  ).toBe(true);
  expect(
    validateQuestDefinitions([definition({ category: "main" })]),
  ).toContain("Main quest accepts non-Story events: road-home");
});
test("journal validation rejects corrupt progress, premature claims, unknown quests and unsupported schemas", () => {
  const d = definition(),
    base = createJournal([d]);
  expect(validJournal(base, [d])).toBe(true);
  const cases = [
    { ...base, schema: 2 },
    { ...base, sequence: -1 },
    { ...base, tracked: "missing" },
    { ...base, quests: { ...base.quests, unknown: base.quests[d.id] } },
  ];
  for (const value of cases) expect(validJournal(value, [d])).toBe(false);
  const claim = structuredClone(base);
  claim.quests[d.id].status = "COMPLETED";
  claim.quests[d.id].rewardClaimed = true;
  expect(validJournal(claim, [d])).toBe(false);
  const corrupt = structuredClone(base);
  corrupt.quests[d.id].progress["find-road"] = Infinity;
  expect(validJournal(corrupt, [d])).toBe(false);
});
