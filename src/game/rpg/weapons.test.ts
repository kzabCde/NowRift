import "fake-indexeddb/auto";
import { beforeEach, expect, test } from "vitest";
import { emptyProgress } from "../campaign/progression";
import { STAGES } from "../campaign/content";
import { loadStage } from "../campaign/loader";
import { initializeRpg } from "./profile";
import { seededEquipment } from "./items";
import { ITEMS } from "./content";
import { applyCommand } from "./actions";
import {
  calculateStats,
  campaignLoadout,
  resolveEquippedWeapon,
} from "./stats";
import { CHARACTERS, type CharacterId } from "../loadout";
import { advanceGame, chooseUpgrade, spawnEnemy, type Game } from "../engine";
import {
  captureCheckpoint,
  restoreCheckpoint,
  validCheckpoint,
} from "../persistence/checkpoint";
import {
  profileRepository as repo,
  resetClientSelectionForTests,
} from "../persistence/repository";
import { migrateSave } from "../persistence/validation";
import { transact } from "../persistence/storage";
import { bodyFrame, bodyKey, facingFromAngle } from "../presentation/character";

const weapons = [
  "forest-weapon",
  "desert-weapon",
  "frozen-weapon",
  "infernal-weapon",
];
const characters = Object.keys(CHARACTERS) as CharacterId[];
function equipped(definitionId = "forest-weapon") {
  const p = initializeRpg(emptyProgress());
  const item = seededEquipment(
    "owned-" + definitionId,
    definitionId,
    "rare",
    3,
  );
  p.rpg!.equipment.push(item);
  p.rpg!.equipped.weapon = item.id;
  return p;
}
function target(g: Game, distance = 60, behind = false) {
  g.obstacles = [];
  g.enemies = [];
  g.spawnCooldown = 1000;
  g.weapon.cooldown = 0;
  g.weapon.crit = 0;
  const enemy = spawnEnemy(
    g,
    "slime",
    g.player.x + (behind ? -distance : distance),
    g.player.y,
  )!;
  enemy.hp = enemy.maxHp = 100000;
  enemy.speed = 0;
  return enemy;
}
beforeEach(async () => {
  resetClientSelectionForTests();
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase("nowrift-campaign");
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error("Open test database"));
  });
});

test.each(
  characters.flatMap((character) =>
    weapons.map((definitionId) => ({ character, definitionId })),
  ),
)(
  "$character uses owned $definitionId with matching live combat and independent body",
  ({ character, definitionId }) => {
    const p = equipped(definitionId),
      before = structuredClone(p.rpg);
    const loadout = campaignLoadout(p, "fire", character),
      snapshot = loadout.weaponSnapshot;
    expect(snapshot.instanceId).toBe(p.rpg!.equipped.weapon);
    expect(snapshot.attackId).toBe(ITEMS[definitionId].weapon!.attack);
    expect(snapshot.frame).toBe(ITEMS[definitionId].weapon!.frame);
    expect(snapshot.stats).toEqual(calculateStats(p, "daggers", character));
    const g = loadStage(
      {
        stageId: "forest-1",
        difficulty: "normal",
        seed: 42,
        clears: [],
        ...loadout,
      },
      "fire",
    );
    expect(g.weaponId).toBe(snapshot.attackId);
    expect(g.character).toBe(character);
    expect(g.player.maxHp).toBe(snapshot.stats.maxHp);
    expect(g.player.speed).toBe(snapshot.stats.speed);
    const enemy = target(g);
    for (let i = 0; i < 5; i++) advanceGame(g, 0.1, 0, 0);
    expect(enemy.hp).toBeLessThan(enemy.maxHp);
    if (definitionId === "frozen-weapon") expect(enemy.slow).toBeGreaterThan(0);
    if (["desert-weapon", "infernal-weapon"].includes(definitionId))
      expect(g.bullets).toHaveLength(0);
    expect(p.rpg).toEqual(before);
    expect(bodyKey(character, "moss")).toContain(character);
  },
);

test("melee has a real directional arc, limited reach, and measurable velocity/multishot upgrades", () => {
  const p = equipped("desert-weapon"),
    g = loadStage({
      stageId: "forest-1",
      difficulty: "normal",
      seed: 22,
      clears: [],
      ...campaignLoadout(p),
    });
  const enemy = target(g),
    behind = spawnEnemy(g, "slime", g.player.x - 70, g.player.y)!;
  behind.hp = behind.maxHp = 100000;
  behind.speed = 0;
  advanceGame(g, 0.02, 0, 0);
  expect(enemy.maxHp - enemy.hp).toBeCloseTo(
    g.weapon.damage * (1 + (g.weapon.projectiles - 1) * 0.15),
  );
  expect(behind.hp).toBe(behind.maxHp);
  const oldRange = g.weapon.range;
  for (const upgrade of ["velocity", "multishot"] as const) {
    g.phase = "upgrade";
    g.offers = [upgrade];
    expect(chooseUpgrade(g, upgrade)).toBe(true);
  }
  expect(g.weapon.range).toBeGreaterThan(oldRange);
  enemy.hp = enemy.maxHp;
  g.weapon.cooldown = 0;
  g.weapon.crit = 0;
  advanceGame(g, 0.02, 0, 0);
  expect(enemy.maxHp - enemy.hp).toBeCloseTo(
    g.weapon.damage * (1 + (g.weapon.projectiles - 1) * 0.15),
  );
  enemy.x = g.player.x + g.weapon.range + 30;
  behind.hp = 0;
  enemy.hp = enemy.maxHp;
  g.weapon.cooldown = 0;
  g.weapon.crit = 0;
  advanceGame(g, 0.02, 0, 0);
  expect(enemy.hp).toBe(enemy.maxHp);
});

test("canonical equip and enhancement actions change actual combat, without creating ownership", () => {
  let p = equipped("desert-weapon");
  p.gold = 100000;
  p.materials = {
    "copper-ore": 1000,
    "enhancement-stone": 1000,
    "ancient-shard": 1000,
    "gold-ore": 1000,
  };
  const id = p.rpg!.equipped.weapon!,
    old = resolveEquippedWeapon(p)!;
  const enhanced = applyCommand(
    p,
    {
      id: "enhance-real-weapon",
      at: 1,
      expectedRevision: p.rpg!.revision,
      action: { type: "enhance", itemId: id, expectedEnhancement: 0 },
    },
    () => 0,
  );
  p = enhanced.progress;
  const next = resolveEquippedWeapon(p)!;
  expect(next.enhancement).toBe(1);
  expect(next.stats.damage).toBeGreaterThan(old.stats.damage);
  expect(next.instanceId).toBe(old.instanceId);
  const g = loadStage({
      stageId: "forest-1",
      difficulty: "normal",
      seed: 1,
      clears: [],
      ...campaignLoadout(p),
    }),
    e = target(g);
  advanceGame(g, 0.02, 0, 0);
  expect(e.maxHp - e.hp).toBeCloseTo(
    next.stats.damage * (1 + (g.weapon.projectiles - 1) * 0.15),
  );
  const before = structuredClone(p.rpg!.equipment);
  p = applyCommand(p, {
    id: "equip-starter",
    at: 2,
    expectedRevision: p.rpg!.revision,
    action: { type: "equip", itemId: "starter-weapon" },
  }).progress;
  expect(resolveEquippedWeapon(p)!.attackId).toBe("arcane");
  expect(p.rpg!.equipment).toEqual(before);
});

test("character changes preserve unique equipment, ranks, affixes and every save slot", async () => {
  const first = await repo.load();
  await repo.create("Second", "sentinel");
  await repo.create("Third", "strider");
  await repo.select(first.local.id);
  const before = await repo.load(first.local.id),
    roster = (await repo.view()).player.slots;
  for (const character of characters) {
    const next = await repo.configure(
      { character, weapon: "fire" },
      first.local.id,
    );
    expect(next.rpg).toEqual(before.rpg);
    expect(resolveEquippedWeapon(next)!.attackId).toBe("arcane");
    expect(resolveEquippedWeapon(next)!.stats.maxHp).toBe(
      calculateStats(next, "arcane", character).maxHp,
    );
    expect((await repo.view()).player.slots).toEqual(roster);
  }
});

test("version-two local saves and older RPG saves retain owned enhanced weapons and ignore legacy free styles", async () => {
  const p = await repo.load();
  p.rpg!.equipment.push(
    seededEquipment("historic-blade", "desert-weapon", "epic", 8),
  );
  p.rpg!.equipped.weapon = "historic-blade";
  p.rpg!.equipment.at(-1)!.enhancement = 7;
  p.local.weapon = "frost";
  p.gold = 1513;
  const migrated = migrateSave(
    JSON.parse(JSON.stringify(p)),
    p.local.id,
    Date.now(),
  );
  expect(migrated.rpg).toEqual(p.rpg);
  expect(migrated.gold).toBe(1513);
  expect(resolveEquippedWeapon(migrated)!.attackId).toBe("slash");
  const old = initializeRpg(equipped("infernal-weapon"));
  expect(old.rpg).toEqual(equipped("infernal-weapon").rpg);
});

test("empty, missing, duplicated, corrupt and wrong-slot references never become an invented weapon", () => {
  const p = equipped();
  for (const id of [null, "missing", "starter-armor"]) {
    const copy = structuredClone(p);
    copy.rpg!.equipped.weapon = id;
    expect(resolveEquippedWeapon(copy)).toBeNull();
    expect(calculateStats(copy).damage).toBe(0);
    expect(() => campaignLoadout(copy)).toThrow("Equip a weapon");
    expect(copy.rpg!.equipment).toEqual(p.rpg!.equipment);
  }
  for (const mutate of [
    (copy: typeof p) => {
      copy.rpg!.equipment.push(structuredClone(copy.rpg!.equipment.at(-1)!));
    },
    (copy: typeof p) => {
      copy.rpg!.equipment.at(-1)!.enhancement = NaN;
    },
    (copy: typeof p) => {
      copy.rpg!.equipment.at(-1)!.definitionId = "missing";
    },
  ]) {
    const copy = structuredClone(p);
    mutate(copy);
    expect(resolveEquippedWeapon(copy)).toBeNull();
  }
});

test("an atomic fresh stage start rejects an empty slot while recovery retains its original weapon and exact configuration", async () => {
  const p = await repo.load(),
    prepared = await repo.beginRun(p.local.id, false, undefined, true);
  const selection = {
    stageId: "forest-1",
    difficulty: "normal" as const,
    seed: 21,
    clears: [],
    ...campaignLoadout(prepared.save),
  };
  // Non-default tuning proves recovery uses the persisted attack, not today's registry.
  selection.weaponSnapshot.attack.range = 333;
  selection.weaponSnapshot.attack.speed = 271;
  const g = loadStage(selection);
  expect(g.weapon.range).toBe(333);
  expect(g.weapon.speed).toBe(271);
  advanceGame(g, 0.1, 1, 0);
  const c = captureCheckpoint(
    g,
    { ...prepared.run, sequence: 1 },
    21,
    selection,
  );
  expect(validCheckpoint(c)).toBe(true);
  await repo.checkpoint(c);
  await transact((records, store) => {
    const live = structuredClone(records.get("profile")) as typeof p;
    live.rpg!.equipped.weapon = null;
    store.put(live, "profile");
  });
  const resumed = await repo.beginRun(p.local.id, true, undefined, true),
    restored = restoreCheckpoint(resumed.checkpoint!);
  expect(restored.equippedWeapon).toEqual(g.equippedWeapon);
  expect(restored.weapon).toEqual(g.weapon);
  expect(restored.player).toEqual({ ...g.player, moving: false });
  expect(restored.rng()).toBe(g.rng());
  await repo.discardRun(p.local.id, resumed.run);
  await expect(
    repo.beginRun(p.local.id, false, undefined, true),
  ).rejects.toThrow("Equip a weapon");
  expect((await repo.load()).local.activeRun).toBeNull();
});

test("checkpoint validation rejects inconsistent item snapshots and accepts reordered exported properties", async () => {
  const p = await repo.load(),
    r = await repo.beginRun(p.local.id),
    s = {
      stageId: "forest-1",
      difficulty: "normal" as const,
      seed: 5,
      clears: [],
      ...campaignLoadout(p),
    };
  const c = captureCheckpoint(loadStage(s), { ...r.run, sequence: 1 }, 5, s);
  const sorted = Object.fromEntries(Object.entries(c.state.build!).reverse());
  expect(validCheckpoint({ ...c, state: { ...c.state, build: sorted } })).toBe(
    true,
  );
  for (const mutate of [
    (copy: typeof c) => {
      copy.state.equippedWeapon!.instanceId = "other";
    },
    (copy: typeof c) => {
      copy.state.equippedWeapon!.frame = 3;
    },
    (copy: typeof c) => {
      copy.state.equippedWeapon!.attack.speed = NaN;
    },
  ]) {
    const broken = structuredClone(c);
    mutate(broken);
    expect(validCheckpoint(broken)).toBe(false);
  }
});

test("older checkpoints keep their original style and stats without claiming a historical inventory instance", async () => {
  const p = await repo.load(),
    r = await repo.beginRun(p.local.id);
  const s = {
    stageId: "forest-1",
    difficulty: "normal" as const,
    seed: 8,
    clears: [],
    build: calculateStats(p),
  };
  const g = loadStage(s, "fire"),
    c = captureCheckpoint(g, r.run, 8, s);
  expect(validCheckpoint(c)).toBe(true);
  const restored = restoreCheckpoint(c);
  expect(restored.weaponId).toBe("fire");
  expect(restored.weapon).toEqual(g.weapon);
  expect(restored.equippedWeapon).toBeUndefined();
});

test("every existing stage accepts every owned weapon with its own world mechanics", () => {
  const clears = STAGES.map((s) => s.id + ":normal");
  for (const stage of STAGES)
    for (const definitionId of weapons) {
      const p = equipped(definitionId),
        g = loadStage({
          stageId: stage.id,
          difficulty: "normal",
          seed: 17,
          clears,
          ...campaignLoadout(p, "fire", "strider"),
        });
      advanceGame(g, 0.02, 1, 0);
      expect(g.campaign!.definition.id).toBe(stage.id);
      expect(g.equippedWeapon!.definitionId).toBe(definitionId);
      expect(g.phase).toBe("playing");
    }
});

test("shared presentation selects all facing and animation rows without changing the weapon", () => {
  for (const [angle, facing] of [
    [0, "right"],
    [Math.PI / 2, "down"],
    [Math.PI, "left"],
    [-Math.PI / 2, "up"],
  ] as const) {
    expect(facingFromAngle(angle)).toBe(facing);
    for (const pose of ["idle", "walk", "attack", "hit", "death"] as const) {
      expect(bodyFrame(facing, pose, 200, 900)).toBeGreaterThanOrEqual(0);
      expect(bodyFrame(facing, pose, 200, 900)).toBeLessThan(48);
    }
  }
});
