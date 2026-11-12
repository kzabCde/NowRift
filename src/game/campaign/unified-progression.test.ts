import { describe, expect, test } from "vitest";
import { emptyProgress } from "./progression";
import { applyResult } from "./commands";
import { loadStage } from "./loader";
import { enemyScale } from "./scaling";
import { characterLevel, calculateStats, totalXpForLevel } from "../rpg/stats";
import { STAGES, DIFFICULTIES } from "./content";

describe("shared Story / Free Mode RPG progression", () => {
  test("all authored maps are enterable in Free Mode without Story unlocks", () => {
    for (const stage of STAGES) {
      const g = loadStage({
        mode: "free",
        stageId: stage.id,
        difficulty: "normal",
        seed: 42,
        clears: [],
      });
      expect(g.phase).toBe("playing");
      expect(g.campaign?.mode).toBe("free");
    }
  });

  test("Story progression remains locked independently of Free Mode", () => {
    expect(() =>
      loadStage({
        mode: "story",
        stageId: "infernal-5",
        difficulty: "normal",
        seed: 42,
        clears: [],
      }),
    ).toThrow();
  });

  test("level and XP persist across Story -> Free -> Story", () => {
    const initial = emptyProgress();
    initial.xp = totalXpForLevel(8) + 12;
    const story = loadStage({
      mode: "story",
      stageId: "forest-1",
      difficulty: "normal",
      seed: 7,
      clears: [],
      startingXp: initial.xp,
      build: calculateStats(initial),
    });
    expect(story.level).toBe(8);
    expect(story.xp).toBe(12);

    const farm = loadStage({
      mode: "free",
      stageId: "infernal-5",
      difficulty: "normal",
      seed: 8,
      clears: [],
      startingXp: initial.xp,
      build: calculateStats(initial),
    });
    expect(farm.level).toBe(8);

    const settled = applyResult(initial, {
      id: "free-run",
      mode: "free",
      stageId: "infernal-5",
      difficulty: "normal",
      seed: 8,
      victory: false,
      enemies: 0,
      elites: 0,
      bosses: 0,
      seconds: 10,
      earnedXp: totalXpForLevel(15) - initial.xp,
    });
    expect(characterLevel(settled.progress.xp).level).toBe(15);
    expect(settled.progress.clears).toEqual([]);
    const resumedStory = loadStage({
      mode: "story",
      stageId: "forest-1",
      difficulty: "normal",
      seed: 9,
      clears: settled.progress.clears,
      startingXp: settled.progress.xp,
      build: calculateStats(settled.progress),
    });
    expect(resumedStory.level).toBe(15);
  });

  test("repeat Free Mode settlements grant earned XP but never Story clears", () => {
    const p = emptyProgress();
    const run = {
      id: "free-repeat-1",
      mode: "free" as const,
      stageId: "desert-5",
      difficulty: "normal" as const,
      seed: 1,
      victory: true,
      enemies: 0,
      elites: 0,
      bosses: 1,
      seconds:
        STAGES.find((s) => s.id === "desert-5")!.clear.seconds *
        DIFFICULTIES.normal.duration,
      earnedXp: 250,
    };
    const first = applyResult(p, run);
    expect(first.progress.xp).toBeGreaterThanOrEqual(250);
    expect(first.progress.clears).toEqual([]);
    const replayReceipt = applyResult(first.progress, run);
    expect(replayReceipt.reward).toBeNull();
    expect(replayReceipt.progress.xp).toBe(first.progress.xp);
  });

  test("higher level, world tier and boss each increase encounter pressure", () => {
    const beginner = enemyScale(1, "forest", 1, "slime");
    const veteran = enemyScale(20, "forest", 1, "slime");
    const dangerous = enemyScale(20, "infernal", 3, "slime");
    const boss = enemyScale(20, "infernal", 3, "boss");
    expect(veteran.hp).toBeGreaterThan(beginner.hp);
    expect(veteran.damage).toBeGreaterThan(beginner.damage);
    expect(dangerous.hp).toBeGreaterThan(veteran.hp);
    expect(boss.hp).toBeGreaterThan(dangerous.hp);
    expect(boss.speed).toBeLessThanOrEqual(1.12);
  });
});
