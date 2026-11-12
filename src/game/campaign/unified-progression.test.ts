import { describe, expect, test } from "vitest";
import { STAGES } from "./content";
import { applyResult } from "./commands";
import { loadStage } from "./loader";
import { emptyProgress, lockedReason } from "./progression";
import { enemyScaling, enemyLevelRange } from "./scaling";
import { calculateStats, characterLevel } from "../rpg/stats";
import { farmingNodes, travelReason } from "../world/content";
import { farmingRewards, validHarvest } from "../world/farming";
import { spawnEnemy } from "../engine";

describe("unified persistent RPG progression", () => {
  test("all 20 stages are selectable in Free Mode before any Story clear", () => {
    for (const stage of STAGES) {
      const selection = {
        stageId: stage.id,
        activity: "farming" as const,
        difficulty: "nightmare" as const,
        seed: 42,
        clears: [],
      };
      expect(travelReason(selection, [])).toBeNull();
      const game = loadStage(selection);
      expect(game.campaign?.activity).toBe("farming");
      expect(game.campaign?.definition.id).toBe(stage.id);
    }
    expect(lockedReason("infernal-5", "normal", [])).not.toBeNull();
  });

  test("Story -> Free -> Story uses latest global XP without changing Story unlocks", () => {
    let progress = emptyProgress();
    const story = STAGES.find((s) => s.id === "forest-1")!;
    const first = applyResult(progress, {
      id: "story-clear-1",
      stageId: story.id,
      difficulty: "normal",
      seed: 42,
      victory: true,
      enemies: 20,
      elites: 2,
      bosses: 0,
      seconds: story.clear.seconds,
    });
    progress = first.progress;
    const stageTwo = STAGES.find((s) => s.id === "forest-2")!;
    const beforeFreeLevel = characterLevel(progress.xp).level;
    const build = calculateStats(progress);
    const storyGame = loadStage({
      stageId: stageTwo.id,
      difficulty: "normal",
      seed: 43,
      clears: progress.clears,
      build,
    });
    expect(storyGame.level).toBe(beforeFreeLevel);
    expect(storyGame.runLevel).toBe(1);

    const freeStage = STAGES.find((s) => s.id === "infernal-5")!;
    const harvested = farmingNodes(freeStage.id).map((n) => n.id);
    expect(validHarvest(harvested, freeStage.id)).toBe(true);
    const free = loadStage({
      stageId: freeStage.id,
      activity: "farming",
      difficulty: "normal",
      seed: 44,
      clears: progress.clears,
      build,
    });
    expect(free.level).toBe(beforeFreeLevel);
    const enemy = spawnEnemy(free, "goblin");
    expect(enemy?.level).toBeGreaterThanOrEqual(beforeFreeLevel);

    const farming = {
      id: "free-extraction-1",
      stageId: freeStage.id,
      activity: "farming" as const,
      difficulty: "normal" as const,
      seed: 44,
      victory: true,
      enemies: 30,
      elites: 2,
      bosses: 0,
      seconds: 35,
      harvested,
    };
    expect(farmingRewards(farming).reward.materials).toBeDefined();
    const afterFree = applyResult(progress, farming);
    expect(afterFree.progress.xp).toBeGreaterThan(progress.xp);
    expect(afterFree.progress.clears).toEqual(progress.clears);
    expect(applyResult(afterFree.progress, farming).reward).toBeNull();
    expect(afterFree.progress.receipts).toContain(farming.id);

    progress = afterFree.progress;
    const back = loadStage({
      stageId: stageTwo.id,
      difficulty: "normal",
      seed: 45,
      clears: progress.clears,
      build: calculateStats(progress),
    });
    expect(back.level).toBe(characterLevel(progress.xp).level);
    expect(back.runLevel).toBe(1);
    expect(back.player.maxHp).toBe(calculateStats(progress).maxHp);
  });

  test("enemy HP and damage rise with level while world and boss tiers remain different", () => {
    const forest = STAGES.find((s) => s.id === "forest-1")!;
    const infernal = STAGES.find((s) => s.id === "infernal-5")!;
    const baseline = enemyScaling(1, forest, forest.worldId, "slime");
    const higher = enemyScaling(20, forest, forest.worldId, "slime");
    const advanced = enemyScaling(20, infernal, infernal.worldId, "slime");
    const boss = enemyScaling(20, infernal, infernal.worldId, "boss");
    expect(higher.hp).toBeGreaterThan(baseline.hp);
    expect(higher.damage).toBeGreaterThan(baseline.damage);
    expect(advanced.level).toBeGreaterThan(higher.level);
    expect(boss.hp).toBeGreaterThan(advanced.hp);
    expect(enemyLevelRange(20, infernal).max).toBe(boss.level);
    expect(boss.speed).toBeLessThanOrEqual(1.18);
  });
});
