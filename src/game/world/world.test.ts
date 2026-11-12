import "fake-indexeddb/auto";
import { beforeEach, describe, expect, test, vi, afterEach } from "vitest";
import {
  HAVEN,
  LANDMARKS,
  FARM,
  travelReason,
  move,
  nearest,
  validPosition,
} from "./content";
import { defaultWorld, validWorld } from "./save";
import {
  expeditionLayout,
  farmPrompt,
  farmingRewards,
  validHarvest,
} from "./farming";
import { STAGES } from "../campaign/content";
import {
  profileRepository as repo,
  resetClientSelectionForTests,
} from "../persistence/repository";
import { exportSave, importSave, checksum } from "../persistence/backup";
import {
  captureCheckpoint,
  restoreCheckpoint,
  validCheckpoint,
} from "../persistence/checkpoint";
import { loadStage } from "../campaign/loader";
import { advanceGame, spawnEnemy } from "../engine";
import { calculateStats } from "../rpg/stats";
import { havenTh } from "../../i18n/dictionaries/haven-th";
import { translateText, translate } from "../../i18n/translator";
import type { SaveData } from "../persistence/model";
beforeEach(async () => {
  resetClientSelectionForTests();
  for (const name of ["nowrift-campaign", "nowrift-saves"])
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.deleteDatabase(name);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
      r.onblocked = () => reject(new Error("Connection left open"));
    });
});
afterEach(() => vi.restoreAllMocks());
async function enter() {
  let p = await repo.load();
  p = await repo.world(p.local.id, { type: "enter", writer: "hub-test" });
  return p;
}
async function visit(p: SaveData, id: string) {
  const l = LANDMARKS.find((l) => l.id === id)!;
  return repo.world(p.local.id, {
    type: "visit",
    writer: "hub-test",
    id,
    position: l.entrance,
  });
}
async function expedition() {
  let p = await enter();
  p = await repo.world(p.local.id, { type: "accept", writer: "hub-test" });
  p = await visit(p, "portal");
  await repo.world(p.local.id, { type: "travel", writer: "hub-test" });
  const prepared = await repo.beginRun(p.local.id),
    g = loadStage({
      activity: "farming",
      stageId: FARM.stageId,
      difficulty: "normal",
      seed: 55,
      clears: [],
      build: calculateStats(p),
      outfit: "ember",
      startingHp: 50,
      returnTo: "haven",
    });
  g.id = prepared.run.id;
  g.time = 35;
  g.kills = 10;
  g.campaign!.enemies = 10;
  g.campaign!.harvested = ["fallen-wood", "slime-nest"];
  const c = captureCheckpoint(g, { ...prepared.run, sequence: 1 }, 55, {
    activity: "farming",
    stageId: FARM.stageId,
    difficulty: "normal",
    seed: 55,
    clears: [],
    outfit: "ember",
    returnTo: "haven",
  });
  await repo.checkpoint(c);
  const result = {
    id: prepared.run.id,
    run: prepared.run,
    activity: "farming" as const,
    stageId: FARM.stageId,
    difficulty: "normal" as const,
    seed: 55,
    victory: true,
    enemies: 10,
    elites: 0,
    bosses: 0,
    seconds: 35,
    harvested: ["fallen-wood", "slime-nest"],
    hp: 50,
  };
  return { p, g, c, result };
}
describe("authored safe world and movement", () => {
  test("travel rejects invalid destinations and uses authoritative unlocks", () => {
    expect(
      travelReason(
        { stageId: "missing", difficulty: "normal", seed: 4, clears: [] },
        [],
      ),
    ).toBe("Invalid expedition.");
    expect(
      travelReason(
        {
          stageId: "desert-1",
          difficulty: "normal",
          seed: 4,
          clears: ["forest-5:normal"],
        },
        [],
      ),
    ).toContain("previous world");
    expect(
      travelReason(
        { stageId: "forest-1", difficulty: "normal", seed: -1, clears: [] },
        [],
      ),
    ).toBe("Invalid expedition.");
  });
  test("existing campaign destinations and the forest expedition share valid travel rules", () => {
    expect(
      travelReason(
        { stageId: "forest-1", difficulty: "normal", seed: 4, clears: [] },
        [],
      ),
    ).toBeNull();
    expect(
      travelReason(
        {
          stageId: "forest-1",
          activity: "farming",
          difficulty: "normal",
          seed: 4,
          clears: [],
        },
        [],
      ),
    ).toBeNull();
    expect(
      travelReason(
        {
          stageId: "forest-1",
          activity: "farming",
          difficulty: "hard",
          seed: 4,
          clears: [],
        },
        [],
      ),
    ).toContain("five NORMAL");
  });
  test("every doorway, spawn and return position is collision-safe", () => {
    expect(validPosition(HAVEN.spawn)).toBe(true);
    expect(validPosition(HAVEN.return)).toBe(true);
    for (const l of LANDMARKS)
      expect(validPosition(l.entrance), l.id).toBe(true);
  });
  test("diagonal movement has the same speed as a cardinal direction", () => {
    const a = move(HAVEN.spawn, 1, 0, 0.05),
      b = move(HAVEN.spawn, 1, 1, 0.05);
    expect(Math.hypot(a.x - HAVEN.spawn.x, a.y - HAVEN.spawn.y)).toBeCloseTo(
      Math.hypot(b.x - HAVEN.spawn.x, b.y - HAVEN.spawn.y),
    );
  });
  test("solid buildings, fountain and water block movement while doors remain reachable", () => {
    expect(validPosition({ x: 370, y: 350 })).toBe(false);
    expect(validPosition({ x: 900, y: 600 })).toBe(false);
    expect(validPosition({ x: 1700, y: 500 })).toBe(false);
    expect(validPosition({ x: 1700, y: 1080 })).toBe(true);
    let p = { x: 370, y: 454 };
    for (let i = 0; i < 100; i++) p = move(p, 0, -1, 0.05);
    expect(p.y).toBeGreaterThanOrEqual(419);
  });
  test("nearby interactions require range and choose the closest doorway", () => {
    expect(nearest(HAVEN.spawn)).toBeNull();
    for (const l of LANDMARKS) expect(nearest(l.entrance)?.id).toBe(l.id);
    expect(nearest({ x: 20, y: 20 })).toBeNull();
  });
  test("long frames are bounded, and invalid coordinates never become saved positions", () => {
    const p = move(HAVEN.spawn, 1, 0, 20);
    expect(p.x - HAVEN.spawn.x).toBe(9);
    expect(validPosition({ x: Infinity, y: 20 })).toBe(false);
    expect(validWorld({ ...defaultWorld(), position: { x: -1, y: 20 } })).toBe(
      false,
    );
  });
  test("all landmark names and initial tutorial copy have Thai translations", () => {
    for (const l of LANDMARKS)
      expect(translateText("th", l.name)).not.toBe(l.name);
    for (const [key, value] of Object.entries(havenTh))
      expect(
        value && translate("th", "haven", key as keyof typeof havenTh),
      ).toBe(value);
  });
});
describe("hub persistence, independent slots and station actions", () => {
  test("first entry extends the existing save without changing inventory or currency", async () => {
    const original = await repo.load(),
      p = await enter();
    expect(p.rpg).toEqual(original.rpg);
    expect(p.gold).toBe(original.gold);
    expect(p.clears).toEqual(original.clears);
    expect(validWorld(p.local.world)).toBe(true);
  });
  test("position persists in the bound character and stale sequences cannot rewind it", async () => {
    const p = await enter(),
      position = LANDMARKS.find((l) => l.id === "inn")!.entrance;
    await repo.world(p.local.id, {
      type: "position",
      writer: "hub-test",
      sequence: 2,
      position,
    });
    await repo.world(p.local.id, {
      type: "position",
      writer: "hub-test",
      sequence: 1,
      position: HAVEN.spawn,
    });
    expect((await repo.load()).local.world!.position).toEqual(position);
    const second = await repo.create("Second");
    expect(second.local.world!.position).toEqual(HAVEN.spawn);
    expect((await repo.load(p.local.id)).local.world!.position).toEqual(
      position,
    );
  });
  test("another hub writer cannot overwrite a takeover", async () => {
    const p = await enter();
    await repo.world(p.local.id, { type: "enter", writer: "other-tab" });
    await expect(
      repo.world(p.local.id, {
        type: "position",
        writer: "hub-test",
        sequence: 1,
        position: HAVEN.spawn,
      }),
    ).rejects.toThrow("another tab");
  });
  test("station visits validate distance before revealing or saving a location", async () => {
    const p = await enter();
    await expect(
      repo.world(p.local.id, {
        type: "visit",
        writer: "hub-test",
        id: "forge",
        position: HAVEN.spawn,
      }),
    ).rejects.toThrow("closer");
    expect((await repo.load()).local.world!.discoveries).toEqual([]);
    expect((await visit(p, "forge")).local.world!.discoveries).toContain(
      "forge",
    );
  });
  test("appearance remains cosmetic and survives loading", async () => {
    const p = await enter(),
      stats = calculateStats(p);
    await repo.world(p.local.id, {
      type: "outfit",
      writer: "hub-test",
      outfit: "tide",
    });
    const next = await repo.load();
    expect(next.local.world!.outfit).toBe("tide");
    expect(next.rpg).toEqual(p.rpg);
    expect(calculateStats(next)).toEqual(stats);
  });
  test("treasure is within range, rewards actual inventory, and cannot pay twice", async () => {
    const p = await enter();
    await expect(
      repo.world(p.local.id, { type: "treasure", writer: "hub-test" }),
    ).rejects.toThrow("closer");
    await visit(p, "cache");
    const paid = await repo.world(p.local.id, {
      type: "treasure",
      writer: "hub-test",
    });
    expect(paid.gold).toBe(30);
    expect(paid.materials.wood).toBe(2);
    await expect(
      repo.world(p.local.id, { type: "treasure", writer: "hub-test" }),
    ).rejects.toThrow("already");
  });
  test("travel rejects a distant portal and protects an existing run", async () => {
    const p = await enter();
    await expect(
      repo.world(p.local.id, { type: "travel", writer: "hub-test" }),
    ).rejects.toThrow("closer");
    await visit(p, "portal");
    await repo.beginRun(p.local.id);
    await expect(
      repo.world(p.local.id, { type: "travel", writer: "hub-test" }),
    ).rejects.toThrow("Recover or discard");
  });
  test("an interrupted transition with no run marker safely returns to the haven", async () => {
    const p = await enter();
    await visit(p, "portal");
    await repo.world(p.local.id, { type: "travel", writer: "hub-test" });
    const arrived = await repo.world(p.local.id, {
      type: "enter",
      writer: "retry",
    });
    expect(arrived.local.world!.location).toBe("haven");
    expect(arrived.local.world!.position).toEqual(HAVEN.return);
  });
});
describe("expedition, extraction and a path home", () => {
  test("expeditions do not auto-bank loot at the old stage timer", () => {
    const g = loadStage({
      activity: "farming",
      stageId: "forest-1",
      difficulty: "normal",
      seed: 4,
      clears: [],
    });
    g.player.invincible = 999;
    g.time = 7200;
    g.spawnCooldown = 999;
    advanceGame(g, 0.02, 0, 0);
    expect(g.phase).toBe("playing");
    expect(g.bossSpawned).toBe(false);
  });
  test("defeating an optional boss still requires explicit extraction", () => {
    const g = loadStage({
      activity: "farming",
      stageId: "forest-1",
      difficulty: "normal",
      seed: 4,
      clears: [],
    });
    g.player.invincible = 999;
    g.enemies = [];
    g.obstacles = [];
    const boss = spawnEnemy(g, "boss", g.player.x + 50, g.player.y)!;
    g.bullets.push({
      x: boss.x,
      y: boss.y,
      vx: 0,
      vy: 0,
      r: 12,
      damage: 1e9,
      life: 1,
      color: "#fff",
    });
    advanceGame(g, 0.02, 0, 0);
    expect(g.campaign!.bosses).toBe(1);
    expect(g.phase).toBe("playing");
  });
  test("extraction requires actual time and kills at the return portal", () => {
    expect(farmPrompt(FARM.portal, 19, 10, []).ready).toBe(false);
    expect(farmPrompt(FARM.portal, 30, 4, []).ready).toBe(false);
    expect(farmPrompt(FARM.portal, 30, 5, [])).toMatchObject({
      target: "extract",
      ready: true,
    });
    expect(farmPrompt({ x: 1400, y: 100 }, 30, 5, []).target).toBeNull();
  });
  test("resource nodes can be collected only once in a run", () => {
    expect(farmPrompt(FARM.nodes[0], 25, 5, []).target).toBe("fallen-wood");
    expect(farmPrompt(FARM.nodes[0], 25, 5, ["fallen-wood"]).target).toBeNull();
    expect(validHarvest(["fallen-wood", "fallen-wood"])).toBe(false);
    expect(validHarvest(["invented-node"])).toBe(false);
  });
  test("Free Mode supply expeditions can enter all 20 maps without Story unlocks", () => {
    for (const stage of STAGES) {
      const g = loadStage({
        activity: "farming",
        mode: "free",
        stageId: stage.id,
        difficulty: "normal",
        seed: 3,
        clears: [],
      });
      expect(g.campaign!.activity).toBe("farming");
      expect(g.campaign!.mode).toBe("free");
      const layout = expeditionLayout(stage.id, g.campaign!.map);
      expect(layout.nodes).toHaveLength(3);
      expect(layout.nodes.map((n) => n.item)).toEqual(
        g.campaign!.world.materials,
      );
      expect(
        validHarvest(
          layout.nodes.map((n) => n.id),
          stage.id,
        ),
      ).toBe(true);
    }
  });
  test("each biome banks only its own gathered supplies after extraction", () => {
    for (const stage of STAGES.filter((s) => s.number === 1)) {
      const nodes = expeditionLayout(stage.id).nodes;
      const run = {
        id: "supply:" + stage.id,
        mode: "free" as const,
        activity: "farming" as const,
        stageId: stage.id,
        difficulty: "normal" as const,
        seed: 44,
        victory: true,
        enemies: 5,
        elites: 0,
        bosses: 0,
        seconds: 30,
        harvested: [nodes[0].id, nodes[1].id],
      };
      const earned = farmingRewards(run);
      expect(earned.reward.materials[nodes[0].item]).toBeGreaterThanOrEqual(
        nodes[0].amount,
      );
      expect(earned.reward.materials[nodes[1].item]).toBeGreaterThanOrEqual(
        nodes[1].amount,
      );
      expect(earned.reward.firstClear).toBe(false);
      expect(() =>
        farmingRewards({ ...run, harvested: [nodes[0].id, nodes[0].id] }),
      ).toThrow("Invalid expedition");
      expect(() =>
        farmingRewards({ ...run, harvested: ["forest-1-supply-0"] }),
      ).toThrow("Invalid expedition");
    }
  });
  test("farming checkpoints restore the harvest, RNG, appearance and activity", async () => {
    const { c } = await expedition();
    expect(validCheckpoint(c)).toBe(true);
    const partial = structuredClone(c);
    delete partial.environment!.harvested;
    expect(validCheckpoint(partial)).toBe(false);
    const restored = restoreCheckpoint(c);
    expect(restored.campaign!.harvested).toEqual(c.environment!.harvested);
    expect(restored.campaign!.activity).toBe("farming");
    expect(restored.phase).toBe("paused");
    expect((await repo.load()).gold).toBe(0);
  });
  test("successful extraction atomically banks actual loot and never clears the campaign", async () => {
    const { result } = await expedition();
    const first = await repo.settle(result),
      next = first.progress;
    expect(next.gold).toBeGreaterThan(0);
    expect(next.materials.wood).toBeGreaterThanOrEqual(3);
    expect(next.materials["slime-core"]).toBeGreaterThanOrEqual(2);
    expect(next.clears).toEqual([]);
    expect(next.local!.stats.stages).toBe(0);
    expect(next.local!.world).toMatchObject({
      location: "haven",
      position: HAVEN.return,
      hp: 50,
      extractions: 1,
      quest: "completed",
    });
    expect(next.local!.checkpoint).toBeNull();
    expect((await repo.settle(result)).reward).toBeNull();
    expect((await repo.load()).gold).toBe(next.gold);
  });
  test("distant Free Mode supply trips do not complete the forest quest or Story", async () => {
    const { result } = await expedition();
    const node = expeditionLayout("desert-2").nodes[0];
    const returned = await repo.settle({
      ...result,
      stageId: "desert-2",
      mode: "free",
      harvested: [node.id],
      victory: true,
    });
    expect(returned.progress.materials[node.item]).toBeGreaterThanOrEqual(
      node.amount,
    );
    expect(returned.progress.clears).toEqual([]);
    expect(returned.progress.local.world!.location).toBe("haven");
    expect(returned.progress.local.world!.quest).toBe("active");
  });
  test("defeat loses only unbanked expedition resources", async () => {
    const { p, result } = await expedition();
    const lost = await repo.settle({ ...result, victory: false, hp: 0 });
    expect(lost.reward!.gold).toBe(0);
    expect(lost.reward!.materials).toEqual({});
    expect(lost.progress.rpg!.equipment).toEqual(p.rpg!.equipment);
    expect(lost.progress.local!.world!.hp).toBe(1);
    expect(lost.progress.local!.world!.extractions).toBe(0);
  });
  test("abandonment discards the runtime ledger and preserves owned equipment", async () => {
    const { p, result } = await expedition();
    await repo.discardRun(p.local.id, result.run);
    const next = await repo.load();
    expect(next.gold).toBe(p.gold);
    expect(next.rpg!.equipped).toEqual(p.rpg!.equipped);
    expect(next.local.world!.location).toBe("haven");
    expect(next.local.world!.extractions).toBe(0);
    expect(next.local.checkpoint).toBeNull();
  });
  test("extracted materials can fund real crafting and prologue rewards claim once", async () => {
    const { p, result } = await expedition();
    await repo.settle(result);
    const before = await repo.load();
    const crafted = await repo.act({
      id: "after-expedition-craft",
      slotId: p.local.id,
      expectedRevision: before.rpg!.revision,
      at: Date.now(),
      action: { type: "craft", recipeId: "brew-tonic", quantity: 1 },
    });
    expect(crafted.progress.materials.wood).toBe(before.materials.wood - 2);
    expect(crafted.progress.gold).toBe(before.gold - 10);
    const reward = await repo.world(p.local.id, {
      type: "claim",
      writer: "hub-test",
    });
    expect(reward.gold).toBe(crafted.progress.gold + 100);
    await expect(
      repo.world(p.local.id, { type: "claim", writer: "hub-test" }),
    ).rejects.toThrow("before claiming");
    expect((await repo.load()).local.world!.quest).toBe("claimed");
  });
  test("an incomplete extraction and invalid node ledger are rejected", async () => {
    const { result } = await expedition();
    expect(() => farmingRewards({ ...result, seconds: 3 })).toThrow(
      "not ready",
    );
    expect(() => farmingRewards({ ...result, harvested: ["invalid"] })).toThrow(
      "Invalid",
    );
  });
  test("an interrupted write cannot grant extraction loot or clear its checkpoint", async () => {
    const { result } = await expedition();
    const fail = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementationOnce(() => {
        throw new DOMException("quota", "QuotaExceededError");
      });
    await expect(repo.settle(result)).rejects.toThrow("quota");
    fail.mockRestore();
    const saved = await repo.load();
    expect(saved.gold).toBe(0);
    expect(saved.local.checkpoint).not.toBeNull();
    expect(saved.local.world!.extractions).toBe(0);
    await repo.settle(result);
    expect((await repo.load()).local.world!.extractions).toBe(1);
  });
});
describe("world extension and backup compatibility", () => {
  test("version-two backups without the new extension migrate without resetting financial data", async () => {
    const p = await enter(),
      view = await repo.view(),
      file = JSON.parse(await exportSave(view.player, p));
    delete file.payload.save.local.world;
    file.checksum = await checksum(file.payload);
    const imported = await importSave(JSON.stringify(file));
    expect(validWorld(imported.save.local.world)).toBe(true);
    expect(imported.save.gold).toBe(p.gold);
    expect(imported.save.rpg).toEqual(p.rpg);
  });
  test("new backups retain appearance, discovery, quest and return location", async () => {
    const { result } = await expedition();
    await repo.settle(result);
    const view = await repo.view(),
      roundTrip = await importSave(await exportSave(view.player, view.active!));
    expect(roundTrip.save.local.world).toEqual(view.active!.local.world);
  });
  test("future world schemas are rejected without writing; stale coordinates recover safely", async () => {
    const view = await repo.view();
    for (const corrupt of [{ schema: 99 }]) {
      const file = JSON.parse(await exportSave(view.player, view.active!));
      Object.assign(file.payload.save.local.world, corrupt);
      file.checksum = await checksum(file.payload);
      await expect(importSave(JSON.stringify(file))).rejects.toThrow("damaged");
    }
    const file = JSON.parse(await exportSave(view.player, view.active!));
    file.payload.save.local.world.position = { x: -100, y: 5 };
    file.checksum = await checksum(file.payload);
    const recovered = await importSave(JSON.stringify(file));
    expect(recovered.save.local.world!.position).toEqual(HAVEN.spawn);
    expect(recovered.save.rpg).toEqual(view.active!.rpg);
    expect((await repo.load()).local.world!.position).toEqual(HAVEN.spawn);
  });
});
