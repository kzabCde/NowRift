import "fake-indexeddb/auto";
import { beforeEach, expect, test } from "vitest";
import {
  profileRepository as repo,
  resetClientSelectionForTests,
} from "../persistence/repository";
import {
  captureCheckpoint,
  restoreCheckpoint,
} from "../persistence/checkpoint";
import { loadStage, type StageSelection } from "../campaign/loader";
import { advanceGame, spawnEnemy, type Game } from "../engine";
import {
  beginMission,
  interactMission,
  missionReceipt,
} from "../story/runtime";
import { validMissionReceipt } from "../story/validation";
import { LANDMARKS } from "../world/content";

beforeEach(async () => {
  resetClientSelectionForTests();
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase("nowrift-campaign");
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
});
const selection: StageSelection = {
  stageId: "forest-1",
  difficulty: "normal",
  seed: 32,
  clears: [],
  mode: "story",
  missionVersion: 1,
};
function tick(g: Game, seconds = 0.8) {
  for (let t = 0; t < seconds; t += 0.02) advanceGame(g, 0.02, 0, 0);
}
function point(g: Game, id: string) {
  const o = g.campaign!.mission!.objects.find((o) => o.id === id)!;
  Object.assign(g.player, { x: o.x, y: o.y });
}
function finish(g: Game) {
  point(g, "forest-1-sera");
  expect(interactMission(g)?.advanced).toBe(true);
  tick(g);
  point(g, "forest-1-oak");
  tick(g);
  tick(g);
  // Inject real hostile actors and bullets; production collision/death emits the evidence.
  g.spawnCooldown = 999;
  for (let i = 0; i < 4; i++) {
    const e = spawnEnemy(g, "slime", g.player.x + 60, g.player.y)!;
    g.bullets.push({
      x: e.x,
      y: e.y,
      vx: 0,
      vy: 0,
      r: 8,
      life: 1,
      damage: e.hp + 1,
      color: "#fff",
    });
    tick(g, 0.04);
  }
  tick(g);
  for (const id of [
    "forest-1-wood-west",
    "forest-1-wood-south",
    "forest-1-wood-east",
  ]) {
    point(g, id);
    expect(interactMission(g, id)?.advanced).toBe(true);
  }
  tick(g);
  expect(g.phase).toBe("victory");
}
test("Forest vertical slice checkpoints, restores, settles, returns and claims atomically without changing equipment", async () => {
  let p = await repo.load();
  const prepared = await repo.beginRun(
    p.local.id,
    false,
    undefined,
    false,
    selection,
  );
  let g = loadStage(selection);
  g.id = prepared.run.id;
  g.player.invincible = 999;
  tick(g, 5);
  expect(g.time).toBe(0);
  expect(g.enemies).toHaveLength(0);
  beginMission(g);
  const c = captureCheckpoint(
    g,
    { ...prepared.run, sequence: 1 },
    32,
    selection,
  );
  await repo.checkpoint(c);
  resetClientSelectionForTests();
  const resumed = await repo.beginRun(p.local.id, true);
  g = restoreCheckpoint(resumed.checkpoint!);
  g.phase = "playing";
  finish(g);
  const mission = missionReceipt(g)!;
  expect(validMissionReceipt(mission, "forest-1")).toBe(true);
  const result = {
    id: resumed.run.id,
    run: resumed.run,
    stageId: "forest-1",
    difficulty: "normal" as const,
    seed: 32,
    mode: "story" as const,
    victory: true,
    enemies: g.campaign!.enemies,
    elites: g.campaign!.elites,
    bosses: 0,
    seconds: g.time,
    mission,
    enemyKills: g.campaign!.enemyKills,
  };
  const settled = await repo.settle(result);
  expect(settled.progress.clears).toContain("forest-1:normal");
  expect(settled.progress.local.journal!.quests["main-forest-1"].status).toBe(
    "READY_TO_CLAIM",
  );
  expect(settled.progress.materials.wood).toBeGreaterThanOrEqual(3);
  const once = structuredClone(settled.progress);
  expect((await repo.settle(result)).progress).toEqual(once);
  p = await repo.world(p.local.id, { type: "enter", writer: "quest-test" });
  const mara = LANDMARKS.find((l) => l.id === "mara")!;
  const command = {
    type: "claim" as const,
    questId: "main-forest-1",
    writer: "quest-test",
    epoch: p.local.world!.positionEpoch,
    position: mara.entrance,
  };
  await expect(
    repo.quest(p.local.id, { ...command, position: { x: 300, y: 300 } }),
  ).rejects.toThrow("closer");
  const claimed = await repo.quest(p.local.id, command);
  expect(claimed.xp).toBe(p.xp + 125);
  expect(claimed.gold).toBe(p.gold + 95);
  expect(claimed.rpg!.equipped).toEqual(p.rpg!.equipped);
  expect(claimed.local.journal!.quests["main-forest-1"].status).toBe(
    "COMPLETED",
  );
  const duplicate = await repo.quest(p.local.id, command);
  expect(duplicate.gold).toBe(claimed.gold);
  expect(duplicate.xp).toBe(claimed.xp);
  resetClientSelectionForTests();
  expect((await repo.load(p.local.id)).local.journal!.quests).toEqual(
    claimed.local.journal!.quests,
  );
});
test("an immutable Free run rejects Story-labelled results and checkpoints", async () => {
  const p = await repo.load(),
    free = {
      ...selection,
      mode: "free" as const,
      activity: "farming" as const,
      missionVersion: 0 as const,
    };
  const run = await repo.beginRun(p.local.id, false, undefined, false, free);
  const g = loadStage(selection);
  g.id = run.run.id;
  await expect(
    repo.checkpoint(
      captureCheckpoint(g, { ...run.run, sequence: 1 }, 32, selection),
    ),
  ).rejects.toThrow("different activity");
  await expect(
    repo.settle({
      id: run.run.id,
      run: run.run,
      stageId: "forest-1",
      difficulty: "normal",
      seed: 32,
      mode: "story",
      victory: true,
      enemies: 4,
      elites: 0,
      bosses: 0,
      seconds: 480,
    }),
  ).rejects.toThrow("does not match");
  expect((await repo.load()).clears).toEqual([]);
  expect(
    (await repo.load()).local.journal!.quests["main-forest-1"].status,
  ).toBe("AVAILABLE");
});
