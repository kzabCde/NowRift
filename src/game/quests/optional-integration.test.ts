import "fake-indexeddb/auto";
import { beforeEach, expect, test, vi } from "vitest";
import {
  profileRepository as repo,
  resetClientSelectionForTests,
} from "../persistence/repository";
import { transact } from "../persistence/storage";
import type { SaveData } from "../persistence/model";
import { LANDMARKS } from "../world/content";
import { STAGES } from "../campaign/content";
import { loadStage } from "../campaign/loader";
import { captureCheckpoint } from "../persistence/checkpoint";
import { spawnEnemy } from "../engine";
import { questById } from "./catalog";
import {
  beginMission,
  interactMission,
  missionReceipt,
} from "../story/runtime";
import { questGiverStates, projectQuestJournal } from "./presentation";
import { snapshot } from "../engine";
import {
  missionFixture,
  playObjective,
  fixtureTick,
  strike,
} from "../story/testing/driver";
import { seededEquipment } from "../rpg/items";
import { usedSlots } from "../rpg/inventory";
import { translateText } from "../../i18n/translator";

beforeEach(async () => {
  resetClientSelectionForTests();
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase("nowrift-campaign");
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
});
async function write(p: SaveData) {
  await transact((_, s) => {
    s.put(p, "profile");
  });
}
async function seeded() {
  let p = await repo.load();
  p.clears = STAGES.map((s) => s.id + ":normal");
  await write(p);
  p = await repo.world(p.local.id, { type: "enter", writer: "optional-test" });
  return p;
}
async function command(
  p: SaveData,
  questId: string,
  type: "accept" | "claim" | "deliver",
  objectiveId?: string,
) {
  const d = questById(questId)!,
    giver = LANDMARKS.find((l) => l.id === d.giver)!;
  return repo.quest(p.local.id, {
    type,
    questId,
    objectiveId,
    writer: "optional-test",
    epoch: p.local.world!.positionEpoch,
    position: giver.entrance,
  });
}
test("a delivery consumes real unprotected inventory, rejects missing items, and concurrent claims pay once", async () => {
  let p = await seeded();
  p = await command(p, "side-forest-5", "accept");
  const id = questById("side-forest-5")!.objectives[0].id,
    unchanged = structuredClone(p);
  await expect(command(p, "side-forest-5", "deliver", id)).rejects.toThrow(
    "own",
  );
  expect(await repo.load()).toEqual(unchanged);
  p.materials["slime-core"] = 3;
  p.rpg!.stackFlags["slime-core"] = { favorite: false, locked: true };
  await write(p);
  await expect(command(p, "side-forest-5", "deliver", id)).rejects.toThrow(
    "protected",
  );
  expect((await repo.load()).materials["slime-core"]).toBe(3);
  p.rpg!.stackFlags["slime-core"].locked = false;
  await write(p);
  p = await command(p, "side-forest-5", "deliver", id);
  expect(p.materials["slime-core"]).toBe(0);
  expect(translateText("th", p.rpg!.history.at(-1)!.items[0])).toContain(
    "ส่งมอบ",
  );
  expect(p.local.journal!.quests["side-forest-5"].status).toBe(
    "READY_TO_CLAIM",
  );
  expect(questGiverStates(p.local.journal!).workshop).toBe("ready");
  const before = structuredClone(p),
    reward = questById("side-forest-5")!.reward;
  await Promise.all([
    command(p, "side-forest-5", "claim"),
    command(p, "side-forest-5", "claim"),
  ]);
  const saved = await repo.load();
  expect(saved.gold).toBe(before.gold + reward.gold);
  expect(translateText("th", saved.rpg!.history.at(-1)!.items[0])).toContain(
    "ได้รับ",
  );
  expect(saved.xp).toBe(before.xp + reward.xp);
  expect(
    saved.receipts.filter((id) => id === `quest:${p.local.id}:side-forest-5`),
  ).toHaveLength(1);
  expect(saved.rpg!.equipped).toEqual(before.rpg!.equipped);
});
test("hub-only objectives advance on bounded real interactions and quest rewards use overflow when the bag is full", async () => {
  let p = await seeded();
  p = await command(p, "side-forest-3", "accept");
  const forge = LANDMARKS.find((l) => l.id === "forge")!,
    training = LANDMARKS.find((l) => l.id === "training")!;
  await expect(
    repo.world(p.local.id, {
      type: "visit",
      writer: "optional-test",
      id: "forge",
      position: { x: 300, y: 300 },
    }),
  ).rejects.toThrow();
  expect(
    (await repo.load()).local.journal!.quests["side-forest-3"].progress,
  ).toEqual({});
  for (const l of [forge, training])
    p = await repo.world(p.local.id, {
      type: "visit",
      writer: "optional-test",
      id: l.id,
      position: l.entrance,
    });
  expect(p.local.journal!.quests["side-forest-3"].status).toBe(
    "READY_TO_CLAIM",
  );
  for (let n = 0; usedSlots(p) < 60; n++)
    p.rpg!.equipment.push(
      seededEquipment("full-bag-" + n, "forest-weapon", "common", 1),
    );
  await write(p);
  const before = p.rpg!.equipped;
  p = await command(p, "side-forest-3", "claim");
  expect(
    p.rpg!.overflow.some((o) => o.definitionId === "wood" && o.quantity === 2),
  ).toBe(true);
  expect(p.rpg!.equipped).toEqual(before);
  expect(usedSlots(p)).toBe(60);
});
test("Story rescue evidence advances an accepted side quest and survives checkpoint replay without double progress", async () => {
  let p = await seeded();
  p = await command(p, "side-forest-6", "accept");
  const { g, selection } = missionFixture("forest-2");
  const prepared = await repo.beginRun(
    p.local.id,
    false,
    undefined,
    false,
    selection,
  );
  g.id = prepared.run.id;
  beginMission(g);
  playObjective(g);
  playObjective(g);
  const captive = g.campaign!.mission!.objects.find(
    (o) => o.kind === "rescue",
  )!;
  Object.assign(g.player, { x: captive.x, y: captive.y });
  expect(interactMission(g, captive.id)?.advanced).toBe(true);
  // This exact production transition can be checkpointed before victory settlement.
  const c = captureCheckpoint(
    g,
    { ...prepared.run, sequence: 1 },
    selection.seed,
    selection,
  );
  const saved = await repo.checkpoint(c);
  expect(saved.local.journal!.quests["side-forest-6"].status).toBe(
    "READY_TO_CLAIM",
  );
  const once = saved.local.journal!.quests["side-forest-6"].progress;
  expect(
    (await repo.checkpoint(c)).local.journal!.quests["side-forest-6"].progress,
  ).toEqual(once);
  fixtureTick(g);
  const receipt = missionReceipt(g)!;
  await repo.settle({
    id: g.id!,
    run: prepared.run,
    stageId: "forest-2",
    difficulty: "normal",
    seed: selection.seed,
    mode: "story",
    victory: true,
    seconds: g.time,
    enemies: g.campaign!.enemies,
    elites: g.campaign!.elites,
    bosses: 0,
    enemyKills: g.campaign!.enemyKills,
    mission: receipt,
  });
  expect(
    (await repo.load()).local.journal!.quests["side-forest-6"].progress,
  ).toEqual(once);
});
test("Free combat updates explicitly eligible contracts live and at checkpoints without advancing Main or Story-only side quests", async () => {
  let p = await seeded();
  p = await command(p, "side-forest-4", "accept");
  p = await command(p, "side-forest-6", "accept");
  const selection = {
    stageId: "forest-1",
    difficulty: "normal" as const,
    seed: 13,
    mode: "free" as const,
    activity: "farming" as const,
    clears: p.clears,
    missionVersion: 0 as const,
  };
  const prepared = await repo.beginRun(
      p.local.id,
      false,
      undefined,
      false,
      selection,
    ),
    g = loadStage(selection);
  g.id = prepared.run.id;
  g.player.invincible = 999;
  for (let i = 0; i < 6; i++) {
    spawnEnemy(g, "goblin", g.player.x + 80, g.player.y);
    strike(g);
    fixtureTick(g, 0.05);
  }
  const projected = projectQuestJournal(
    prepared.save,
    snapshot(g).questEvidence,
  );
  expect(projected.quests["side-forest-4"].status).toBe("READY_TO_CLAIM");
  expect(
    projectQuestJournal(prepared.save, {
      ...snapshot(g).questEvidence!,
      runId: "previous-run",
    }),
  ).toBe(prepared.save.local.journal);
  expect(prepared.save.local.journal!.quests["side-forest-4"].progress).toEqual(
    {},
  );
  const saved = await repo.checkpoint(
    captureCheckpoint(g, { ...prepared.run, sequence: 1 }, 13, selection),
  );
  expect(saved.local.journal!.quests["side-forest-4"].status).toBe(
    "READY_TO_CLAIM",
  );
  expect(saved.local.journal!.quests["side-forest-6"].progress).toEqual({});
  expect(saved.local.journal!.quests["main-forest-1"].progress).toEqual({});
  expect(saved.clears).toEqual(p.clears);
});
test("Orin's four-chapter chain gates each entry and its real equipment reward goes to overflow without changing the equipped weapon", async () => {
  let p = await seeded();
  expect(p.local.journal!.quests["npc-frozen-2"].status).toBe("LOCKED");
  Object.assign(p.materials, {
    "copper-ore": 4,
    "gold-ore": 3,
    "ancient-shard": 2,
    "frost-crystal": 2,
    "enhancement-stone": 3,
  });
  await write(p);
  for (const id of ["npc-forest-2", "npc-desert-2", "npc-frozen-2"]) {
    p = await command(p, id, "accept");
    for (const o of questById(id)!.objectives)
      p = await command(p, id, "deliver", o.id);
    expect(p.local.journal!.quests[id].status).toBe("READY_TO_CLAIM");
    if (id === "npc-frozen-2") {
      for (let n = 0; usedSlots(p) < 60; n++)
        p.rpg!.equipment.push(
          seededEquipment("chain-bag-" + n, "forest-weapon", "common", 1),
        );
      await write(p);
    }
    const equipped = structuredClone(p.rpg!.equipped);
    p = await command(p, id, "claim");
    expect(p.rpg!.equipped).toEqual(equipped);
  }
  const item = p.rpg!.overflow.find(
    (o) => o.equipment?.definitionId === "frozen-weapon",
  )!.equipment!;
  expect(item).toMatchObject({ rarity: "rare", level: 15 });
  expect(p.local.journal!.flags).toContain("npc:orin:flexible-steel");
  expect(p.local.journal!.quests["npc-infernal-2"].status).toBe("AVAILABLE");
  const before = structuredClone(p);
  p = await command(p, "npc-frozen-2", "claim");
  expect(p.gold).toBe(before.gold);
  expect(p.xp).toBe(before.xp);
  expect(p.rpg!.overflow).toEqual(before.rpg!.overflow);
});
test("quest rewards honor a purchased larger backpack and reload with more than sixty owned bag slots", async () => {
  let p = await seeded();
  p.gold = 600;
  p.materials["slime-core"] = 3;
  await write(p);
  p = (
    await repo.act({
      slotId: p.local.id,
      id: "quest-bag-expansion",
      expectedRevision: p.rpg!.revision,
      at: Date.now(),
      action: { type: "expandBag" },
    })
  ).progress as SaveData;
  expect(p.rpg!.capacity).toBe(70);
  p = await command(p, "side-forest-5", "accept");
  p = await command(
    p,
    "side-forest-5",
    "deliver",
    questById("side-forest-5")!.objectives[0].id,
  );
  for (let n = 0; usedSlots(p) < 65; n++)
    p.rpg!.equipment.push(
      seededEquipment("expanded-quest-bag-" + n, "forest-weapon", "common", 1),
    );
  await write(p);
  p = await command(p, "side-forest-5", "claim");
  expect(p.materials.wood).toBe(2);
  expect(p.rpg!.overflow).toHaveLength(0);
  expect(usedSlots(p)).toBe(66);
  const saved = await repo.load();
  expect(saved.rpg!.capacity).toBe(70);
  expect(saved.rpg).toEqual(p.rpg);
});
test("real daily material gifts progress explicitly Haven-eligible collection without progressing Main", async () => {
  let p = await seeded();
  p = await command(p, "side-desert-2", "accept");
  const now = Date.now(),
    clock = vi.spyOn(Date, "now");
  try {
    for (let day = 0; day < 5; day++) {
      clock.mockReturnValue(now + day * 86400000);
      p = await repo.claim("checkin", "", p.local.revision, p.local.id);
    }
  } finally {
    clock.mockRestore();
  }
  const objective = questById("side-desert-2")!.objectives[0];
  expect(p.local.journal!.quests["side-desert-2"].progress[objective.id]).toBe(
    5,
  );
  expect(p.materials["ancient-shard"]).toBe(5);
  expect(p.local.journal!.quests["main-desert-2"].progress).toEqual({});
});
