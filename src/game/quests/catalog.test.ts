import { expect, test } from "vitest";
import { QUEST_CATALOG } from "./catalog";
import { validateQuestDefinitions, validJournal } from "./validation";
import { ITEMS } from "../rpg/content";
import { REGION_IDS } from "../world/regions";
import { regionalCity } from "../world/regional-city";
const LANDMARKS = REGION_IDS.flatMap((r) => regionalCity(r).landmarks);
import { STAGES, WORLDS } from "../campaign/content";
import { MISSIONS } from "../story/content";
import { createJournal } from "./engine";
import { migrateJournal } from "./save";
import { lockedReason, newlyUnlockedStages } from "../campaign/progression";
import { translateText } from "../../i18n/translator";

test("124 authored quests have valid items, unique identities, real givers and bilingual text", () => {
  expect(QUEST_CATALOG).toHaveLength(124);
  expect(validateQuestDefinitions(QUEST_CATALOG, Object.keys(ITEMS))).toEqual(
    [],
  );
  expect(
    Object.fromEntries(
      ["main", "side", "guild", "npc"].map((c) => [
        c,
        QUEST_CATALOG.filter((q) => q.category === c).length,
      ]),
    ),
  ).toEqual({ main: 40, side: 40, guild: 24, npc: 20 });
  expect(new Set(QUEST_CATALOG.map((q) => q.title.en)).size).toBe(124);
  for (const d of QUEST_CATALOG) {
    expect(
      LANDMARKS.some((l) => l.id === d.giver),
      d.id,
    ).toBe(true);
    for (const text of [
      d.title,
      d.description,
      ...Object.values(d.dialogue),
      ...d.objectives.map((o) => o.text),
    ]) {
      expect(translateText("th", text.en), `${d.id}: ${text.en}`).not.toBe(
        text.en,
      );
      expect(text.th).toMatch(/[ก-๙]/);
    }
  }
  expect(validJournal(createJournal(QUEST_CATALOG), QUEST_CATALOG)).toBe(true);
});
test("every scripted quest objective points at an implemented mission primitive or actual hub landmark", () => {
  const scripted = [
    "DefendLocation",
    "EscortNPC",
    "RescueNPC",
    "ActivateMechanism",
    "DestroyObject",
  ];
  const types = new Set<string>();
  for (const d of QUEST_CATALOG)
    for (const o of d.objectives) {
      types.add(o.type);
      if (scripted.includes(o.type))
        expect(
          MISSIONS.some(
            (m) =>
              (!o.stageId || m.id === o.stageId) &&
              m.objectives.some(
                (step) =>
                  step.type === o.type &&
                  step.target === o.target &&
                  step.count >= o.count,
              ),
          ),
          d.id + ":" + o.id,
        ).toBe(true);
      if (
        [
          "VisitLocation",
          "DiscoverArea",
          "TalkToNPC",
          "InteractWithObject",
        ].includes(o.type)
      )
        expect(
          LANDMARKS.some((l) => l.id === o.target) ||
            MISSIONS.some(
              (m) =>
                (!o.stageId || m.id === o.stageId) &&
                m.objectives.some(
                  (step) => step.type === o.type && step.target === o.target,
                ),
            ),
          d.id + ":" + o.id,
        ).toBe(true);
      if (o.type === "CompleteStage")
        expect(STAGES.some((s) => s.id === o.target)).toBe(true);
    }
  // InteractWithObject is also supported by real station interactions, tested in the event adapter.
  expect(types.size).toBe(15);
  expect(MISSIONS).toHaveLength(40);
  for (const s of STAGES)
    expect(MISSIONS.some((m) => m.id === s.id)).toBe(true);
});
test("legacy journal migration preserves old clear records and access without awarding quest rewards", () => {
  const clears = WORLDS.flatMap((w) =>
      [1, 2, 3, 4, 5].map((n) => `${w.id}-${n}:normal`),
    ),
    before = structuredClone(clears);
  const j = migrateJournal(undefined, clears, 123);
  expect(clears).toEqual(before);
  for (const w of WORLDS) {
    expect(
      lockedReason(w.id + "-1", "hard", clears, j.legacyAccess),
    ).toBeNull();
    expect(
      lockedReason(w.id + "-1", "normal", clears, j.legacyAccess),
    ).toBeNull();
    for (let n = 1; n <= 5; n++)
      expect(j.quests[`main-${w.id}-${n}`]).toMatchObject({
        status: "COMPLETED",
        rewardClaimed: true,
        legacy: true,
      });
    expect(j.quests[`main-${w.id}-6`].status).toBe("AVAILABLE");
  }
  expect(j.notices).toEqual([]);
  expect(migrateJournal(j, clears, 999)).toEqual(j);
});
test("new saves require all ten stages for chapter and difficulty gates; clearing five does not grandfather itself", () => {
  const j = migrateJournal(undefined, [], 123),
    clears = [1, 2, 3, 4, 5].map((n) => `forest-${n}:normal`);
  expect(
    lockedReason("desert-1", "normal", clears, j.legacyAccess),
  ).not.toBeNull();
  expect(lockedReason("forest-1", "hard", clears, j.legacyAccess)).toContain(
    "10 NORMAL",
  );
  expect(lockedReason("forest-6", "normal", clears, j.legacyAccess)).toBeNull();
  for (let n = 6; n <= 10; n++) clears.push(`forest-${n}:normal`);
  expect(lockedReason("desert-1", "normal", clears, j.legacyAccess)).toBeNull();
  expect(lockedReason("forest-1", "hard", clears, j.legacyAccess)).toBeNull();
});
test("unlock notices describe actual new access and do not announce grandfathered or exhausted difficulties", () => {
  const normal = STAGES.filter((s) => s.worldId === "forest").map(
    (s) => s.id + ":normal",
  );
  expect(newlyUnlockedStages(normal.slice(0, 9), normal)).toEqual([
    "forest-1:hard",
    "desert-1:normal",
  ]);
  const hard = normal.map((k) => k.replace(":normal", ":hard"));
  expect(
    newlyUnlockedStages([...normal, ...hard.slice(0, 9)], [...normal, ...hard]),
  ).toEqual(["forest-1:nightmare"]);
  expect(
    newlyUnlockedStages(
      [...normal, ...hard.slice(0, 9)],
      [...normal, ...hard],
      ["forest:nightmare"],
    ),
  ).toEqual([]);
  const nightmare = normal.map((k) => k.replace(":normal", ":nightmare"));
  expect(
    newlyUnlockedStages(
      [...normal, ...hard, ...nightmare.slice(0, 9)],
      [...normal, ...hard, ...nightmare],
    ),
  ).toEqual([]);
});
