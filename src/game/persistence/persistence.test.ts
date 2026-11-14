import "fake-indexeddb/auto";
import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import {
  profileRepository as repo,
  playerId,
  resetClientSelectionForTests,
} from "./repository";
import { gameDay } from "./daily";
import { calendarReward, calendarDay } from "./calendar";
import { exportSave, importSave, checksum } from "./backup";
import {
  captureCheckpoint,
  restoreCheckpoint,
  validCheckpoint,
} from "./checkpoint";
import { loadStage } from "../campaign/loader";
import { calculateStats } from "../rpg/stats";
import { advanceGame, spawnEnemy } from "../engine";
import { preferences } from "./preferences";
import { saveStatus } from "./status";
import type { SaveData, RunOwner } from "./model";
const NOW = Date.UTC(2026, 10, 10, 12),
  DAY = 86400000;
async function resetDb(name: string) {
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase(name);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
    r.onblocked = () =>
      reject(new Error("Test left a database connection open"));
  });
}
async function rawPut(key: string, value: unknown) {
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.open("nowrift-campaign", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("progress");
    r.onsuccess = () => {
      const db = r.result,
        t = db.transaction("progress", "readwrite");
      t.objectStore("progress").put(value, key);
      t.oncomplete = () => {
        db.close();
        resolve();
      };
      t.onerror = () => reject(t.error);
    };
  });
}
async function rawGet(key: string) {
  return new Promise<unknown>((resolve, reject) => {
    const r = indexedDB.open("nowrift-campaign", 1);
    r.onsuccess = () => {
      const db = r.result,
        t = db.transaction("progress", "readonly"),
        q = t.objectStore("progress").get(key);
      q.onsuccess = () => resolve(q.result);
      t.oncomplete = () => db.close();
      t.onerror = () => reject(t.error);
    };
  });
}
function at(time: number) {
  vi.mocked(Date.now).mockReturnValue(time);
}
beforeEach(async () => {
  vi.restoreAllMocks();
  resetClientSelectionForTests();
  await resetDb("nowrift-campaign");
  await resetDb("nowrift-saves");
  vi.spyOn(Date, "now").mockReturnValue(NOW);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function act(
  p: SaveData,
  action: Parameters<typeof repo.act>[0]["action"],
) {
  return (
    await repo.act({
      id: crypto.randomUUID(),
      slotId: p.local.id,
      at: Date.now(),
      expectedRevision: p.rpg!.revision,
      action,
    })
  ).progress;
}
async function settle(id = "stage-run", run?: RunOwner) {
  return repo.settle({
    id: run?.id ?? id,
    run,
    stageId: "forest-1",
    difficulty: "normal",
    seed: run ? 32 : 34,
    victory: true,
    enemies: 120,
    elites: 2,
    bosses: 0,
    seconds: 480,
  });
}
async function simulation() {
  const p = await repo.load(),
    r = await repo.beginRun(p.local.id),
    g = loadStage({
      stageId: "forest-1",
      difficulty: "normal",
      seed: 32,
      clears: [],
      build: calculateStats(p),
    });
  g.id = r.run.id;
  g.player.invincible = 999;
  return { p, run: r.run, g };
}
describe("local guest profiles and three isolated characters", () => {
  test("new player ID uses browser crypto and remains stable across reload", async () => {
    const spy = vi.spyOn(crypto, "getRandomValues");
    expect(playerId()).toMatch(/^NR-[0-9A-F]{8}$/);
    expect(spy).toHaveBeenCalled();
    const p = await repo.load(),
      v = await repo.view();
    expect(v.player.id).toMatch(/^NR-[0-9A-F]{8}$/);
    expect(v.player.slots).toHaveLength(1);
    expect(p.local.id).toBe(v.player.activeSlotId);
    expect(p.gold).toBe(0);
    resetClientSelectionForTests();
    expect((await repo.view()).player.id).toBe(v.player.id);
  });
  test("three slots keep independent wallets, inventories, names and stage unlocks", async () => {
    const first = await repo.load();
    await repo.claim("checkin", "", first.local.revision, first.local.id);
    const won = await settle();
    const second = await repo.create("Ash", "sentinel"),
      third = await repo.create("Dusk", "strider");
    expect(second.gold).toBe(0);
    expect(third.local.character).toBe("strider");
    expect(second.clears).toEqual([]);
    expect(second.rpg!.history).toEqual([]);
    await expect(repo.create("Fourth")).rejects.toThrow("three");
    await repo.select(first.local.id);
    const loaded = await repo.load();
    expect(loaded.gold).toBe(400 + won.reward!.gold);
    expect(loaded.clears).toContain("forest-1:normal");
    expect(loaded.local.name).toBe("Rift Wanderer");
    expect((await repo.load(second.local.id)).gold).toBe(0);
  });
  test("player and character names validate, persist, and reject stale edits", async () => {
    let v = await repo.view();
    await repo.renamePlayer("Rift Keeper", v.player.revision);
    const p = v.active!;
    await repo.renameSlot(p.local.id, "Moonlight", p.local.revision);
    await expect(
      repo.renameSlot(p.local.id, "Stale", p.local.revision),
    ).rejects.toThrow("changed");
    v = await repo.view();
    expect(v.player.username).toBe("Rift Keeper");
    expect(v.active!.local.name).toBe("Moonlight");
    await expect(repo.renamePlayer(" ", v.player.revision)).rejects.toThrow(
      "1 to 24",
    );
  });
  test("delete protects the last slot and makes a recovery copy before deleting another", async () => {
    const p = await repo.load();
    await expect(repo.deleteSlot(p.local.id, p.local.revision)).rejects.toThrow(
      "at least one",
    );
    const second = await repo.create("Temporary");
    await repo.deleteSlot(second.local.id, second.local.revision);
    expect((await repo.view()).slots).toHaveLength(1);
    expect((await repo.backups())[0].save.local.name).toBe("Temporary");
    expect((await repo.load()).local.id).toBe(p.local.id);
  });
  test("old campaign/RPG state migrates without resetting balances or enhanced gear", async () => {
    const p = await repo.load();
    await settle();
    const earned = await repo.load();
    earned.rpg!.equipment[0].enhancement = 7;
    const old: Partial<SaveData> = { ...earned };
    delete old.local;
    await rawPut("profile", old);
    const loaded = await repo.load(p.local.id);
    expect(loaded.gold).toBe(earned.gold);
    expect(loaded.clears).toEqual(earned.clears);
    expect(loaded.rpg!.equipment[0].enhancement).toBe(7);
    expect(loaded.local.schema).toBe(2);
    expect(await repo.load()).toEqual(loaded);
  });
});
describe("Bangkok check-ins, objectives and achievements", () => {
  test("game-day switches exactly at Bangkok midnight, independent of host timezone", () => {
    expect(gameDay(Date.UTC(2026, 0, 1, 16, 59, 59))).toBe("2026-01-01");
    expect(gameDay(Date.UTC(2026, 0, 1, 17))).toBe("2026-01-02");
    expect(gameDay(Date.UTC(2026, 11, 31, 17))).toBe("2027-01-01");
  });
  test("a player can claim once a day across all three slots and concurrent requests", async () => {
    const p = await repo.load(),
      results = await Promise.allSettled([
        repo.claim("checkin", "", p.local.revision, p.local.id),
        repo.claim("checkin", "", p.local.revision, p.local.id),
      ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await repo.load()).gold).toBe(400);
    const second = await repo.create("Second");
    await expect(
      repo.claim("checkin", "", second.local.revision, second.local.id),
    ).rejects.toThrow("already");
    expect((await repo.view()).player.checkins).toHaveLength(1);
  });
  test("a real November calendar grants dated provisions and exactly one final-day Epic chest", async () => {
    const gifts = [];
    for (let day = 1; day <= 30; day++) {
      at(Date.UTC(2026, 10, day, 12));
      const p = await repo.load(),
        key = calendarDay("2026-11", day);
      gifts.push(calendarReward(key).gift);
      await repo.claim("checkin", key, p.local.revision, p.local.id);
    }
    const v = await repo.view(),
      p = v.active!;
    expect(v.player.checkins.map((c) => c.day)).toEqual(
      Array.from({ length: 30 }, (_, i) => calendarDay("2026-11", i + 1)),
    );
    expect(
      v.player.checkins.every(
        (c) => c.calendarVersion === 1 && c.cycle === undefined,
      ),
    ).toBe(true);
    expect(p.gold).toBe(gifts.reduce((n, gift) => n + (gift.gold ?? 0), 0));
    expect(p.materials["enhancement-stone"]).toBe(
      gifts.reduce(
        (n, gift) => n + (gift.materials?.["enhancement-stone"] ?? 0),
        0,
      ),
    );
    expect(p.rpg!.equipment.filter((e) => e.rarity === "epic")).toHaveLength(1);
    expect(
      p.rpg!.history.filter((h) => h.id.startsWith("checkin:")),
    ).toHaveLength(30);
    expect(p.receipts.filter((id) => id.startsWith("checkin:"))).toHaveLength(
      30,
    );
    expect(p.local.daily.progress.gold ?? 0).toBe(0);
  });
  test("legacy seven-day history and today's receipt survive calendar migration, exports and restores", async () => {
    let p = await repo.load();
    const v = await repo.view(),
      legacy = { day: gameDay(NOW), cycle: 6, slotId: p.local.id, at: NOW },
      receipt = `checkin:${v.player.id}:${legacy.day}`;
    v.player.checkins.push(legacy);
    p.receipts.push(receipt);
    p.gold = 1750;
    p.xp = 1234;
    await rawPut("player", v.player);
    await rawPut("profile", p);
    await expect(
      repo.claim("checkin", legacy.day, p.local.revision, p.local.id),
    ).rejects.toThrow("already");
    at(NOW + DAY);
    p = await repo.load();
    await repo.claim("checkin", gameDay(), p.local.revision, p.local.id);
    const next = await repo.view();
    expect(next.player.checkins[0]).toEqual(legacy);
    expect(next.active!.receipts).toContain(receipt);
    expect(next.active!.gold).toBe(1750);
    expect(next.active!.materials.wood).toBe(4);
    expect(next.active!.xp).toBe(1234);
    const backup = (await repo.backups()).find(
      (b) => b.reason === "Before monthly calendar rewards",
    )!;
    expect(backup.player.checkins).toEqual([legacy]);
    expect(backup.save.receipts).toContain(receipt);
    const imported = await importSave(
      await exportSave(next.player, next.active!),
    );
    expect(imported.player.checkins).toEqual(next.player.checkins);
    await repo.replace(
      imported.save,
      imported.player.checkins,
      next.active!.local.revision,
      next.active!.local.id,
      imported.player,
    );
    const reloaded = await repo.view();
    expect(reloaded.player.checkins).toEqual(next.player.checkins);
    await expect(
      repo.claim(
        "checkin",
        gameDay(),
        reloaded.active!.local.revision,
        reloaded.active!.local.id,
      ),
    ).rejects.toThrow("already");
  });
  test("skipping dates never shifts the offered reward and explicit past/future claims are rejected atomically", async () => {
    let p = await repo.load();
    await expect(
      repo.claim("checkin", "2026-11-09", p.local.revision, p.local.id),
    ).rejects.toThrow("today");
    await expect(
      repo.claim("checkin", "2026-11-11", p.local.revision, p.local.id),
    ).rejects.toThrow("today");
    expect((await repo.view()).player.checkins).toEqual([]);
    expect((await repo.load()).gold).toBe(0);
    at(Date.UTC(2026, 10, 14, 12));
    p = await repo.load();
    p = await repo.claim("checkin", "2026-11-14", p.local.revision, p.local.id);
    expect(p.gold).toBe(750);
    expect(p.materials["enhancement-stone"]).toBe(3);
    expect((await repo.view()).player.checkins.map((c) => c.day)).toEqual([
      "2026-11-14",
    ]);
  });
  test("February 28 combines weekly and month-end rewards in one atomic gift, even under competing claims", async () => {
    at(Date.UTC(2026, 1, 28, 12));
    const p = await repo.load();
    const attempts = await Promise.allSettled([
      repo.claim("checkin", "2026-02-28", p.local.revision, p.local.id),
      repo.claim("checkin", "2026-02-28", p.local.revision, p.local.id),
    ]);
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
    const saved = await repo.load();
    expect(saved.gold).toBe(2500);
    expect(saved.materials["enhancement-stone"]).toBe(5);
    expect(
      saved.rpg!.equipment.filter((e) => e.rarity === "epic"),
    ).toHaveLength(1);
    expect(saved.rpg!.history.filter((h) => h.kind === "gift")).toHaveLength(1);
    expect((await repo.view()).player.checkins).toHaveLength(1);
  });
  test("a failed check-in root write rolls back wallet, receipt, inventory and player history together", async () => {
    const p = await repo.load(),
      original = IDBObjectStore.prototype.put;
    const spy = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementation(function (
        this: IDBObjectStore,
        value: unknown,
        key?: IDBValidKey,
      ) {
        if (key === "player")
          throw new DOMException("Disk full", "QuotaExceededError");
        return original.call(this, value, key);
      });
    await expect(
      repo.claim("checkin", gameDay(), p.local.revision, p.local.id),
    ).rejects.toThrow();
    spy.mockRestore();
    expect(await repo.load()).toEqual(p);
    expect((await repo.view()).player.checkins).toEqual([]);
  });
  test("a device clock rollback cannot repeat a check-in", async () => {
    let p = await repo.load();
    await repo.claim("checkin", "", p.local.revision, p.local.id);
    at(NOW - DAY);
    p = await repo.load();
    await expect(
      repo.claim("checkin", "", p.local.revision, p.local.id),
    ).rejects.toThrow("clock");
  });
  test("actual settlement counters advance objectives, character XP and achievements", async () => {
    await repo.load();
    await settle();
    let p = await repo.load();
    expect(p.local.stats.kills).toBe(122);
    expect(p.local.daily.progress.hunt).toBe(100);
    expect(p.local.daily.progress.stages).toBe(1);
    expect(p.local.achievements["first-blood"].unlockedAt).toBe(NOW);
    expect(p.xp).toBeGreaterThan(100);
    const old = p.gold;
    p = await repo.claim("quest", "hunt", p.local.revision, p.local.id);
    expect(p.gold).toBe(old + 150);
    await expect(
      repo.claim("quest", "hunt", p.local.revision, p.local.id),
    ).rejects.toThrow("already");
  });
  test("incomplete objectives cannot pay out and game-day reset clears only daily progress", async () => {
    let p = await repo.load();
    await expect(
      repo.claim("quest", "stages", p.local.revision, p.local.id),
    ).rejects.toThrow("incomplete");
    await settle();
    p = await repo.load();
    const kills = p.local.stats.kills;
    at(NOW + DAY);
    p = await repo.load();
    expect(p.local.daily.progress).toEqual({});
    expect(p.local.stats.kills).toBe(kills);
    expect(p.local.achievements["first-blood"].unlockedAt).toBe(NOW);
  });
  test("claimed objectives stay claimed after clock moves away and back", async () => {
    await repo.load();
    await settle();
    let p = await repo.load();
    await repo.claim("quest", "hunt", p.local.revision, p.local.id);
    at(NOW + DAY);
    await repo.load();
    at(NOW);
    p = await repo.load();
    expect(p.local.daily.claimed).toContain("hunt");
    await expect(
      repo.claim("quest", "hunt", p.local.revision, p.local.id),
    ).rejects.toThrow("already");
  });
  test("successful enhancement and dismantling increment actual objective counters", async () => {
    let p = await repo.load();
    p = await repo.claim("checkin", "", p.local.revision, p.local.id);
    p.materials["copper-ore"] = 3;
    await rawPut("profile", p);
    p = await act(p, {
      type: "enhance",
      itemId: p.rpg!.equipped.weapon!,
      expectedEnhancement: 0,
    });
    expect(p.local.daily.progress.enhance).toBe(1);
    p = await act(p, { type: "buy", offerId: "staff", quantity: 3 });
    for (const item of p.rpg!.equipment.filter((e) =>
      e.id.startsWith("purchase:"),
    ))
      p = await act(p, { type: "dismantle", itemId: item.id, quantity: 1 });
    expect(p.local.daily.progress.salvage).toBe(3);
  });
  test("achievement rewards commit once and do not feed the earned-Gold quest", async () => {
    let p = await repo.load();
    expect(p.local.achievements.outfit.unlockedAt).toBe(NOW);
    p = await repo.claim("achievement", "outfit", p.local.revision, p.local.id);
    expect(p.gold).toBe(100);
    expect(p.local.achievements.outfit.claimed).toBe(true);
    expect((await repo.load()).local.achievements.outfit.claimed).toBe(true);
    expect(p.local.daily.progress.gold ?? 0).toBe(0);
    await expect(
      repo.claim("achievement", "outfit", p.local.revision, p.local.id),
    ).rejects.toThrow("already");
  });
});
describe("consistent run checkpoints and writer ownership", () => {
  test("combat snapshot resumes paused with actors, upgrades, cooldowns and exact RNG state", async () => {
    const { g, run } = await simulation();
    for (let i = 0; i < 20; i++) advanceGame(g, 0.1, 1, 0);
    g.weapon.cooldown = 0.42;
    g.stacks.power = 1;
    const c = captureCheckpoint(g, { ...run, sequence: 1 }, 32, {
      stageId: "forest-1",
      difficulty: "normal",
      seed: 32,
      clears: [],
    });
    expect(validCheckpoint(c)).toBe(true);
    await repo.checkpoint(c);
    const restored = restoreCheckpoint(c);
    expect(restored.phase).toBe("paused");
    expect(restored.id).toBe(g.id);
    expect(restored.player).toEqual({ ...g.player, moving: false });
    expect(restored.enemies).toEqual(g.enemies);
    expect(restored.weapon).toEqual(g.weapon);
    expect(restored.rng()).toBe(g.rng());
    restored.phase = "playing";
    advanceGame(g, 0.1, 0, 1);
    advanceGame(restored, 0.1, 0, 1);
    expect(restored.player).toEqual(g.player);
    expect(restored.enemies).toEqual(g.enemies);
  });
  test("checkpointed kills and time are not counted twice after recovery and settlement", async () => {
    const { g, run, p } = await simulation();
    g.kills = 20;
    g.campaign!.enemies = 20;
    g.time = 20;
    await repo.checkpoint(
      captureCheckpoint(g, { ...run, sequence: 1 }, 32, {
        stageId: "forest-1",
        difficulty: "normal",
        seed: 32,
        clears: [],
      }),
    );
    resetClientSelectionForTests();
    const resumed = await repo.beginRun(p.local.id, true);
    await settle("ignored", resumed.run);
    const saved = await repo.load(p.local.id);
    expect(saved.local.stats.kills).toBe(122);
    expect(saved.local.stats.seconds).toBe(480);
    const gold = saved.gold;
    await settle("ignored", resumed.run);
    expect((await repo.load()).gold).toBe(gold);
    expect((await repo.load()).local.checkpoint).toBeNull();
  });
  test("accelerated combat saves actual playtime across recovery and settles rewards exactly once", async () => {
    const { g, run, p } = await simulation();
    g.time = 40;
    g.realTime = 10;
    g.kills = 20;
    g.campaign!.enemies = 20;
    await repo.checkpoint(
      captureCheckpoint(g, { ...run, sequence: 1 }, 32, {
        stageId: "forest-1",
        difficulty: "normal",
        seed: 32,
        clears: [],
      }),
    );
    expect((await repo.load()).local.stats.seconds).toBe(10);
    const recovered = await repo.beginRun(p.local.id, true);
    expect(restoreCheckpoint(recovered.checkpoint!).realTime).toBe(10);
    const result = {
      id: recovered.run.id,
      run: recovered.run,
      stageId: "forest-1",
      difficulty: "normal" as const,
      seed: 32,
      victory: true,
      enemies: 120,
      elites: 2,
      bosses: 0,
      seconds: 480,
      realSeconds: 120,
    };
    const settled = await repo.settle(result);
    const saved = await repo.load();
    expect(saved.local.stats.seconds).toBe(120);
    expect(saved.local.stats.kills).toBe(122);
    expect(saved.clears).toContain("forest-1:normal");
    expect(settled.reward!.gold).toBeGreaterThan(0);
    expect((await repo.settle(result)).reward).toBeNull();
    expect((await repo.load()).gold).toBe(saved.gold);
    expect((await repo.load()).local.stats.seconds).toBe(120);
  });
  test("taking over a checkpoint rejects old-tab checkpoint and reward writes", async () => {
    const { g, run, p } = await simulation();
    const c = captureCheckpoint(g, { ...run, sequence: 1 }, 32, {
      stageId: "forest-1",
      difficulty: "normal",
      seed: 32,
      clears: [],
    });
    await repo.checkpoint(c);
    resetClientSelectionForTests();
    const next = await repo.beginRun(p.local.id, true);
    expect(next.run.writer).not.toBe(run.writer);
    await expect(
      repo.checkpoint({ ...c, run: { ...run, sequence: 2 } }),
    ).rejects.toThrow("another tab");
    await expect(settle("", run)).rejects.toThrow("another tab");
  });
  test("out-of-order checkpoints cannot replace the latest committed snapshot", async () => {
    const { g, run, p } = await simulation();
    g.time = 10;
    const c = captureCheckpoint(g, { ...run, sequence: 2 }, 32);
    await repo.checkpoint(c);
    await repo.checkpoint({
      ...c,
      run: { ...run, sequence: 1 },
      state: { ...c.state, time: 5 },
    });
    expect((await repo.load(p.local.id)).local.checkpoint!.state.time).toBe(10);
  });
  test("invalid checkpoint keeps the previous snapshot and corrupt checkpoint can be discarded alone", async () => {
    const { g, run, p } = await simulation();
    const c = captureCheckpoint(g, { ...run, sequence: 1 }, 32);
    await repo.checkpoint(c);
    await expect(repo.checkpoint({ ...c, random: NaN })).rejects.toThrow(
      "validated",
    );
    const before = await repo.load();
    const bad = structuredClone(before);
    bad.local.checkpoint!.state.weapon.delay = 0;
    await rawPut("profile", bad);
    expect((await repo.view()).active).toBeNull();
    await repo.discardDamagedCheckpoint(p.local.id);
    const clean = await repo.load();
    expect(clean.gold).toBe(before.gold);
    expect(clean.rpg).toEqual(before.rpg);
    expect(clean.local.checkpoint).toBeNull();
  });
  test("enemy death events from the actual engine reach persisted metrics", async () => {
    const { g, run } = await simulation();
    g.obstacles = [];
    g.enemies = [];
    g.bullets = [];
    const e = spawnEnemy(g, "slime", g.player.x + 40, g.player.y)!;
    g.bullets.push({
      x: e.x,
      y: e.y,
      vx: 0,
      vy: 0,
      r: 8,
      damage: 1000,
      life: 1,
      color: "#fff",
    });
    advanceGame(g, 0.02, 0, 0);
    expect(g.kills).toBe(1);
    await repo.checkpoint(
      captureCheckpoint(g, { ...run, sequence: 1 }, 32, {
        stageId: "forest-1",
        difficulty: "normal",
        seed: 32,
        clears: [],
      }),
    );
    expect((await repo.load()).local.stats.kills).toBe(1);
  });
});
describe("backup validation, corruption recovery and atomic failures", () => {
  test("complete JSON backup round trip preserves inventory, enhancement, currencies and clears", async () => {
    await repo.load();
    await settle();
    const view = await repo.view();
    const encoded = await exportSave(view.player, view.active!),
      decoded = await importSave(encoded);
    expect(decoded.save).toEqual(JSON.parse(JSON.stringify(view.active)));
    expect(decoded.player.id).toBe(view.player.id);
    expect(decoded.version).toBe(2);
  });
  test("malformed JSON, checksum corruption and incompatible versions are rejected", async () => {
    await expect(importSave("{bad")).rejects.toThrow("JSON");
    const v = await repo.view(),
      file = JSON.parse(await exportSave(v.player, v.active!));
    file.payload.save.gold++;
    await expect(importSave(JSON.stringify(file))).rejects.toThrow("checksum");
    file.payload.version = 999;
    file.checksum = await checksum(file.payload);
    await expect(importSave(JSON.stringify(file))).rejects.toThrow(
      "incompatible",
    );
  });
  test("a recomputed checksum does not bypass item, balance or duplicate-ID validation", async () => {
    const v = await repo.view();
    for (const edit of [
      (p: SaveData) => (p.rpg!.equipment[0].definitionId = "missing-item"),
      (p: SaveData) => (p.gold = -1),
      (p: SaveData) => p.rpg!.equipment.push(p.rpg!.equipment[0]),
      (p: SaveData) =>
        p.rpg!.equipment.push(
          ...Array.from({ length: 60 }, (_, i) => ({
            ...p.rpg!.equipment[0],
            id: "bag-" + i,
          })),
        ),
    ]) {
      const file = JSON.parse(await exportSave(v.player, v.active!));
      edit(file.payload.save);
      file.checksum = await checksum(file.payload);
      await expect(importSave(JSON.stringify(file))).rejects.toThrow("damaged");
    }
  });
  test("version-one campaign files migrate through the same validated import path", async () => {
    const v = await repo.view(),
      file = JSON.parse(await exportSave(v.player, v.active!));
    file.payload.version = 1;
    delete file.payload.save.local;
    file.checksum = await checksum(file.payload);
    const loaded = await importSave(JSON.stringify(file));
    expect(loaded.save.local.schema).toBe(2);
    expect(loaded.save.rpg!.equipped).toEqual(v.active!.rpg!.equipped);
  });
  test("import backs up the target, protects other slots, and merges shared check-in claims", async () => {
    let p = await repo.load();
    p = await repo.claim("checkin", "", p.local.revision, p.local.id);
    const v = await repo.view(),
      file = await importSave(await exportSave(v.player, p));
    const second = await repo.create("Other");
    await repo.replace(
      file.save,
      file.player.checkins,
      second.local.revision,
      second.local.id,
    );
    expect((await repo.load()).local.id).toBe(second.local.id);
    expect((await repo.load()).gold).toBe(400);
    expect((await repo.load(p.local.id)).gold).toBe(400);
    expect((await repo.backups()).length).toBe(1);
    const current = await repo.load();
    await expect(
      repo.claim("checkin", "", current.local.revision, current.local.id),
    ).rejects.toThrow("already");
  });
  test("stale import previews cannot overwrite newer character changes", async () => {
    const p = await repo.load();
    await repo.renameSlot(p.local.id, "Newer", p.local.revision);
    await expect(
      repo.replace(p, [], p.local.revision, p.local.id),
    ).rejects.toThrow("changed");
    expect(await repo.backups()).toHaveLength(0);
    expect((await repo.load()).local.name).toBe("Newer");
  });
  test("importing another slot rebinds reward receipts across daily resets", async () => {
    await repo.load();
    await settle();
    let source = await repo.load();
    source = await repo.claim(
      "quest",
      "hunt",
      source.local.revision,
      source.local.id,
    );
    source = await repo.claim(
      "achievement",
      "first-blood",
      source.local.revision,
      source.local.id,
    );
    const target = await repo.create("Imported wanderer");
    let imported = await repo.replace(
      source,
      [],
      target.local.revision,
      target.local.id,
    );
    expect(imported.receipts).toContain(
      `quest:${target.local.id}:${gameDay(NOW)}:hunt`,
    );
    expect(imported.receipts).toContain(
      `achievement:${target.local.id}:first-blood`,
    );
    expect(
      imported.rpg!.history.some(
        (e) => e.id === `quest:${target.local.id}:${gameDay(NOW)}:hunt`,
      ),
    ).toBe(true);
    at(NOW + DAY);
    await repo.load();
    at(NOW);
    imported = await repo.load();
    expect(imported.local.daily.claimed).toContain("hunt");
    await expect(
      repo.claim("quest", "hunt", imported.local.revision, target.local.id),
    ).rejects.toThrow("already claimed");
    expect((await repo.load(source.local.id)).gold).toBe(source.gold);
  });
  test("a damaged slot stays preserved until a validated backup replaces it", async () => {
    const p = await repo.load(),
      bad = { ...p, gold: -100 };
    await rawPut("profile", bad);
    await expect(repo.load()).rejects.toThrow("damaged");
    expect(await rawGet("profile")).toEqual(bad);
    expect((await repo.view()).errors[p.local.id]).toContain("damaged");
    await repo.replace(p, [], null, p.local.id);
    expect((await repo.load()).gold).toBe(0);
  });
  test("quota errors abort both the reward and player history; indicator reports failure", async () => {
    const p = await repo.load();
    const spy = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementationOnce(() => {
        throw new DOMException("quota", "QuotaExceededError");
      });
    await expect(
      repo.claim("checkin", "", p.local.revision, p.local.id),
    ).rejects.toThrow("quota");
    expect(saveStatus.get().phase).toBe("failed");
    spy.mockRestore();
    expect((await repo.view()).player.checkins).toEqual([]);
    expect((await repo.load()).gold).toBe(0);
  });
  test("partial writes during import cannot replace the target or leave a false backup", async () => {
    const p = await repo.load();
    let n = 0;
    const original = IDBObjectStore.prototype.put;
    const failing = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementation(function (
        this: IDBObjectStore,
        ...args: Parameters<IDBObjectStore["put"]>
      ) {
        if (++n === 2) throw new DOMException("quota", "QuotaExceededError");
        return original.apply(this, args);
      });
    await expect(
      repo.replace(p, [], p.local.revision, p.local.id),
    ).rejects.toThrow("quota");
    failing.mockRestore();
    expect(await repo.backups()).toEqual([]);
    expect((await repo.load()).gold).toBe(p.gold);
  });
});

describe("recovery boundaries and save confirmation", () => {
  test("malformed optional combat state is rejected before checkpoint restoration", async () => {
    const { g, run } = await simulation();
    const c = captureCheckpoint(g, { ...run, sequence: 1 }, 32);
    expect(c.state.enemies.length).toBeGreaterThan(0);
    for (const key of ["slow", "hit", "age", "pattern", "enraged"]) {
      const bad = structuredClone(c);
      Object.assign(bad.state.enemies[0], { [key]: "invalid" });
      expect(validCheckpoint(bad)).toBe(false);
      expect(() => restoreCheckpoint(bad)).toThrow("damaged");
    }
  });
  test("long negative cooldowns remain recoverable without changing combat state", async () => {
    const { g, run } = await simulation();
    g.weapon.cooldown = -45;
    g.campaign!.burnTick = -120;
    g.enemies[0].contact = -90;
    g.enemies[0].attack = -75;
    const c = captureCheckpoint(g, { ...run, sequence: 1 }, 32);
    expect(validCheckpoint(c)).toBe(true);
    const restored = restoreCheckpoint(c);
    expect(restored.weapon.cooldown).toBe(-45);
    expect(restored.campaign!.burnTick).toBe(-120);
    expect(restored.enemies[0].attack).toBe(-75);
  });
  test("checkpoint quota failure leaves the last valid checkpoint available", async () => {
    const { g, run, p } = await simulation();
    g.time = 10;
    await repo.checkpoint(captureCheckpoint(g, { ...run, sequence: 1 }, 32));
    g.time = 20;
    const fail = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementationOnce(() => {
        throw new DOMException("quota", "QuotaExceededError");
      });
    await expect(
      repo.checkpoint(captureCheckpoint(g, { ...run, sequence: 2 }, 32)),
    ).rejects.toThrow("quota");
    fail.mockRestore();
    expect((await repo.load()).local.checkpoint!.state.time).toBe(10);
    const resumed = await repo.beginRun(p.local.id, true);
    expect(resumed.checkpoint!.state.time).toBe(10);
  });
  test("an intact export can recover damaged player metadata without erasing original slot records", async () => {
    const v = await repo.view(),
      p = v.active!;
    await rawPut("player", { ...v.player, schema: 999 });
    await expect(repo.view()).rejects.toThrow("profile is damaged");
    await repo.replace(p, v.player.checkins, null, null, v.player);
    const recovered = await repo.view();
    expect(recovered.player.id).toBe(v.player.id);
    expect(recovered.active!.rpg!.equipped).toEqual(p.rpg!.equipped);
    expect(await rawGet("profile")).toEqual(p);
  });
  test("an IndexedDB save cannot hide failed preference persistence", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("full", "QuotaExceededError");
      },
    });
    expect(() => preferences.set("nowrift-locale-v1", "th")).toThrow();
    expect(saveStatus.get().phase).toBe("failed");
    await repo.load();
    expect(saveStatus.get().phase).toBe("failed");
    preferences.queue("nowrift-preferences-v1", '{"muted":true}');
    preferences.flush();
    expect(saveStatus.get().phase).toBe("failed");
    await repo.load();
    expect(saveStatus.get().phase).toBe("failed");
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {} });
    preferences.queue("nowrift-preferences-v1", '{"muted":true}');
    preferences.flush();
    expect(saveStatus.get().phase).toBe("saved");
  });
});
