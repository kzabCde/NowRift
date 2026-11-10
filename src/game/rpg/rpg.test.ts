import { describe, test, expect } from "vitest";
import "fake-indexeddb/auto";
import { emptyProgress } from "../campaign/progression";
import { initializeRpg, validRpg } from "./profile";
import { SLOTS, RARITY_IDS } from "./model";
import { ITEMS, RARITIES, SHOP, ENHANCEMENT, AFFIX_BOUNDS } from "./content";
import { createEquipment, seededEquipment, weightedRarity } from "./items";
import { seeded } from "../campaign/content";
import {
  applyCommand,
  dismantleYield,
  sellPrice,
  type ActionBody,
} from "./actions";
import { usedSlots, inventory } from "./inventory";
import { enhancementQuote, enhancementOutcome } from "./enhancement";
import {
  calculateStats,
  itemStats,
  characterLevel,
  incomingDamage,
} from "./stats";
import { applyResult, campaignRepository } from "../campaign/persistence";
import {
  makeGame,
  applyBuild,
  beginGame,
  advanceGame,
  chooseUpgrade,
  spawnEnemy,
} from "../engine";
import { loadStage } from "../campaign/loader";
function fixture() {
  const p = initializeRpg(emptyProgress());
  p.gold = 1000000;
  p.materials = {
    wood: 100000,
    "copper-ore": 100000,
    "slime-core": 100000,
    "enhancement-stone": 100000,
  };
  return p;
}
let seq = 0;
function command(
  p: ReturnType<typeof fixture>,
  action: ActionBody,
  id = "test-" + ++seq,
  rng?: () => number,
) {
  return applyCommand(
    p,
    { id, at: 10, expectedRevision: p.rpg!.revision, action },
    rng,
  );
}
function weapon(p: ReturnType<typeof fixture>) {
  return p.rpg!.equipment.find((e) => e.id === p.rpg!.equipped.weapon)!;
}
function bagItem(
  p: ReturnType<typeof fixture>,
  id = "loot",
  rarity: "common" | "rare" | "epic" | "legendary" = "rare",
) {
  const e = seededEquipment(id, "desert-weapon", rarity, 5);
  p.rpg!.equipment.push(e);
  return e;
}
describe("item registry, rarity, migration and inventory", () => {
  test("all six slots and five rarity tiers have functional original icon definitions", () => {
    for (const s of SLOTS)
      expect(Object.values(ITEMS).some((d) => d.slot === s)).toBe(true);
    for (const d of Object.values(ITEMS)) {
      expect(d.icon).toBeGreaterThanOrEqual(0);
      expect(d.icon).toBeLessThan(48);
    }
    expect(RARITY_IDS.map((r) => RARITIES[r].multiplier)).toEqual([
      1, 1.2, 1.5, 1.9, 2.5,
    ]);
  });
  test("equipment rolls are deterministic, bounded, and rarity changes attributes", () => {
    for (const rarity of RARITY_IDS) {
      const a = createEquipment("id", "forest-weapon", rarity, 10, seeded(2)),
        b = createEquipment("id", "forest-weapon", rarity, 10, seeded(2));
      expect(a).toEqual(b);
      expect(Object.keys(a.affixes)).toHaveLength(RARITIES[rarity].affixes);
      for (const [key, n] of Object.entries(a.affixes)) {
        const [lo, hi] = AFFIX_BOUNDS[key as keyof typeof AFFIX_BOUNDS],
          factor = key === "projectiles" ? 1 : 1.35;
        expect(n).toBeGreaterThanOrEqual(lo * factor - 0.001);
        expect(n).toBeLessThanOrEqual(hi * factor + 0.001);
      }
    }
    expect(
      itemStats(seededEquipment("id", "forest-weapon", "legendary", 1)).damage,
    ).toBeGreaterThan(
      itemStats(seededEquipment("id", "forest-weapon", "common", 1)).damage,
    );
  });
  test("weighted loot produces all tiers; increased difficulty improves rare outcomes", () => {
    const normal = seeded(4),
      hard = seeded(4);
    let a = 0,
      b = 0;
    const seen = new Set<string>();
    for (let i = 0; i < 10000; i++) {
      const x = weightedRarity(normal),
        y = weightedRarity(hard, 2.4);
      seen.add(x);
      a += RARITY_IDS.indexOf(x);
      b += RARITY_IDS.indexOf(y);
    }
    expect(seen.size).toBe(5);
    expect(b).toBeGreaterThan(a);
  });
  test("legacy wallet, clears and equipment candidates migrate once without losing data", () => {
    const old = emptyProgress();
    old.gold = 50;
    old.xp = 100;
    old.materials = { wood: 3 };
    old.clears = ["forest-1:normal"];
    old.candidates = ["solar-relic", "solar-relic"];
    const p = initializeRpg(old);
    expect(p.gold).toBe(50);
    expect(p.xp).toBe(100);
    expect(p.materials.wood).toBe(3);
    expect(p.clears).toEqual(old.clears);
    expect(p.rpg!.equipment).toHaveLength(8);
    expect(new Set(p.rpg!.equipment.map((e) => e.id)).size).toBe(8);
    expect(initializeRpg(p)).toEqual(p);
    expect(old.candidates).toHaveLength(2);
  });
  test("equip, swap and unequip only move references; stable IDs are never duplicated", () => {
    let p = fixture();
    const e = bagItem(p);
    const original = p.rpg!.equipment.length;
    p = command(p, { type: "equip", itemId: e.id }).progress;
    expect(p.rpg!.equipped.weapon).toBe(e.id);
    expect(p.rpg!.equipment).toHaveLength(original);
    p = command(p, { type: "unequip", slot: "weapon" }).progress;
    expect(p.rpg!.equipped.weapon).toBeNull();
    expect(new Set(p.rpg!.equipment.map((x) => x.id)).size).toBe(original);
    expect(p.rpg!.equipment).toHaveLength(original);
  });
  test("equipped, locked and favorite equipment cannot be sold or dismantled", () => {
    const p = fixture(),
      e = bagItem(p);
    for (const type of ["sell", "dismantle"] as const)
      expect(() =>
        command(p, { type, itemId: weapon(p).id, quantity: 1 }),
      ).toThrow("protected");
    for (const flag of ["locked", "favorite"] as const) {
      const q = command(p, { type: "flag", itemId: e.id, flag }).progress;
      expect(() =>
        command(q, { type: "dismantle", itemId: e.id, quantity: 1 }),
      ).toThrow("protected");
      expect(() =>
        command(q, { type: "sell", itemId: e.id, quantity: 1 }),
      ).toThrow("protected");
    }
    expect(p.rpg!.equipment.find((x) => x.id === e.id)!.locked).toBe(false);
  });
  test("full bag protects earned overflow and claims exactly once after room is made", () => {
    let p = fixture();
    let i = 0;
    while (usedSlots(p) < 60) bagItem(p, "full-" + i++, "common");
    expect(usedSlots(p)).toBe(60);
    expect(() =>
      command(p, { type: "buy", offerId: "staff", quantity: 1 }),
    ).toThrow("full");
    expect(() => command(p, { type: "unequip", slot: "weapon" })).toThrow(
      "full",
    );
    const result = applyResult(p, {
      id: "full-run",
      stageId: "forest-1",
      difficulty: "normal",
      seed: 3,
      victory: true,
      enemies: 40,
      elites: 2,
      bosses: 0,
      seconds: 480,
    });
    p = result.progress;
    expect(p.rpg!.overflow.length).toBeGreaterThan(0);
    expect(usedSlots(p)).toBe(60);
    const parcel = p.rpg!.overflow[0];
    expect(() => command(p, { type: "claim", parcelId: parcel.id })).toThrow(
      "full",
    );
    p = command(p, { type: "sell", itemId: "full-0", quantity: 1 }).progress;
    p = command(p, { type: "claim", parcelId: parcel.id }).progress;
    expect(usedSlots(p)).toBe(60);
    expect(() => command(p, { type: "claim", parcelId: parcel.id })).toThrow(
      "claimed",
    );
    expect(validRpg(p.rpg)).toBe(true);
  });
  test("full-bag existing material stacks still merge; illegal serialized ownership is rejected", () => {
    const p = fixture();
    let i = 0;
    while (usedSlots(p) < 60) bagItem(p, "stack-" + i++);
    const q = command(p, { type: "buy", offerId: "ore", quantity: 5 }).progress;
    expect(q.materials["copper-ore"]).toBe(p.materials["copper-ore"] + 5);
    const bad = structuredClone(q.rpg!);
    bad.equipment.push(bad.equipment[0]);
    expect(validRpg(bad)).toBe(false);
    expect(() => initializeRpg({ ...q, rpg: bad })).toThrow("preserved");
  });
});
describe("enhancement outcomes, costs, pity and exactly-once mutations", () => {
  for (let level = 0; level < 15; level++)
    test(`+${level}: quoted rate, exact cost and successful transition`, () => {
      const p = fixture(),
        e = weapon(p);
      e.enhancement = level;
      const quote = enhancementQuote(e);
      expect(quote.base).toBe(ENHANCEMENT.success[level]);
      const q = command(
        p,
        { type: "enhance", itemId: e.id, expectedEnhancement: level },
        undefined,
        () => 0,
      );
      expect(weapon(q.progress).enhancement).toBe(level + 1);
      expect(q.progress.gold).toBe(p.gold - quote.gold);
      for (const [id, n] of Object.entries(quote.materials))
        expect(q.progress.materials[id]).toBe(p.materials[id] - n);
      expect(q.entry!.enhancement?.success).toBe(true);
      expect(itemStats(weapon(q.progress)).damage).toBeGreaterThan(
        itemStats(e).damage,
      );
    });
  for (let level = 1; level < 15; level++)
    test(`+${level}: failure preserves or downgrades without destroying`, () => {
      const p = fixture(),
        e = weapon(p);
      e.enhancement = level;
      let rolls = 0;
      const q = command(
        p,
        { type: "enhance", itemId: e.id, expectedEnhancement: level },
        undefined,
        () => (++rolls === 1 ? 0.999 : 0.49),
      );
      expect(weapon(q.progress).enhancement).toBe(
        level >= 10 ? level - 1 : level,
      );
      expect(weapon(q.progress).pity).toBe(1);
      expect(q.progress.rpg!.equipment).toHaveLength(6);
      expect(q.progress.gold).toBe(p.gold - enhancementQuote(e).gold);
      expect(q.entry!.enhancement?.success).toBe(false);
    });
  test("upper-level failure can preserve rank; +15 rejects without deduction", () => {
    const p = fixture(),
      e = weapon(p);
    e.enhancement = 14;
    expect(enhancementOutcome(e, () => 0.99).after).toBe(14);
    e.enhancement = 15;
    expect(() =>
      command(p, { type: "enhance", itemId: e.id, expectedEnhancement: 15 }),
    ).toThrow("+15");
    expect(p.gold).toBe(1000000);
  });
  test("pity adds two percentage points per failure, caps at twenty and resets on success", () => {
    let p = fixture();
    const e = weapon(p);
    e.enhancement = 4;
    for (let i = 0; i < 12; i++)
      p = command(
        p,
        { type: "enhance", itemId: e.id, expectedEnhancement: 4 },
        undefined,
        () => 0.999,
      ).progress;
    expect(enhancementQuote(weapon(p)).bonus).toBe(0.2);
    expect(enhancementQuote(weapon(p)).effective).toBeCloseTo(0.9);
    p = command(
      p,
      { type: "enhance", itemId: e.id, expectedEnhancement: 4 },
      undefined,
      () => 0,
    ).progress;
    expect(weapon(p).pity).toBe(0);
    weapon(p).enhancement = 0;
    weapon(p).pity = 20;
    expect(enhancementQuote(weapon(p)).effective).toBe(1);
    expect(enhancementQuote(weapon(p), false).bonus).toBe(0);
  });
  test("duplicate confirmation receipts deduct once; stale or insufficient quotes deduct nothing", () => {
    const p = fixture(),
      a = {
        type: "enhance",
        itemId: weapon(p).id,
        expectedEnhancement: 0,
      } as const;
    const first = applyCommand(
      p,
      { id: "repeat", at: 10, expectedRevision: 0, action: a },
      () => 0,
    );
    const repeat = applyCommand(
      first.progress,
      { id: "repeat", at: 10, expectedRevision: 0, action: a },
      () => 0,
    );
    expect(repeat.progress).toEqual(first.progress);
    expect(() =>
      applyCommand(first.progress, {
        id: "stale",
        at: 10,
        expectedRevision: 0,
        action: a,
      }),
    ).toThrow("changed");
    const broke = fixture();
    broke.gold = 0;
    expect(() => command(broke, a)).toThrow("gold");
    broke.gold = 100;
    broke.materials = {};
    expect(() => command(broke, a)).toThrow("materials");
    expect(broke.rpg!.history).toHaveLength(0);
  });
});
describe("economy, progression and connected combat", () => {
  test("shop purchases, sales and crafting validate balances, quantities and unique ownership", () => {
    let p = fixture();
    const before = p.gold;
    p = command(p, { type: "buy", offerId: "blade", quantity: 2 }).progress;
    const bought = p.rpg!.equipment.filter((e) => e.id.startsWith("purchase:"));
    expect(bought).toHaveLength(2);
    expect(bought[0].id).not.toBe(bought[1].id);
    expect(p.gold).toBe(before - 700);
    const entry = inventory(p).find((e) => e.id === bought[0].id)!;
    p = command(p, { type: "sell", itemId: entry.id, quantity: 1 }).progress;
    expect(p.gold).toBe(before - 700 + sellPrice(entry));
    expect(() =>
      command(p, { type: "sell", itemId: entry.id, quantity: 1 }),
    ).toThrow("own");
    const tonics = p.rpg!.consumables["health-tonic"];
    p = command(p, {
      type: "craft",
      recipeId: "brew-tonic",
      quantity: 2,
    }).progress;
    expect(p.rpg!.consumables["health-tonic"]).toBe(tonics + 2);
    for (const n of [-1, 0, 1.5, Infinity])
      expect(() =>
        command(p, { type: "buy", offerId: "ore", quantity: n }),
      ).toThrow("Quantity");
  });
  test("no ordinary buy/sell or dismantle resale loop creates gold", () => {
    const p = fixture();
    for (const offer of SHOP) {
      const q = command(p, {
        type: "buy",
        offerId: offer.id,
        quantity: 1,
      }).progress;
      const e = inventory(q).find(
        (e) =>
          e.equipment?.id.startsWith("purchase:") ||
          (!e.equipment && e.definitionId === offer.item),
      )!;
      expect(sellPrice(e)).toBeLessThan(offer.price);
      if (e.equipment) {
        const value = Object.entries(dismantleYield(e)).reduce(
          (sum, [id, n]) => sum + (ITEMS[id].sellPrice ?? 0) * n,
          0,
        );
        expect(value).toBeLessThan(offer.price);
      }
    }
  });
  test("dismantle consumes only the unique item, granting configured materials", () => {
    let p = fixture();
    const e = bagItem(p),
      entry = inventory(p).find((x) => x.id === e.id)!,
      yielded = dismantleYield(entry),
      ore = p.materials["copper-ore"];
    p = command(p, { type: "dismantle", itemId: e.id, quantity: 1 }).progress;
    expect(p.rpg!.equipment.some((x) => x.id === e.id)).toBe(false);
    expect(p.materials["copper-ore"]).toBe(ore + yielded["copper-ore"]);
    expect(p.rpg!.history.at(-1)!.items.length).toBeGreaterThan(0);
  });
  test("permanent XP and disciplines increase real build stats without altering run levels", () => {
    let p = fixture();
    const base = calculateStats(p);
    p.xp = 650;
    expect(characterLevel(p.xp).level).toBeGreaterThan(1);
    expect(calculateStats(p).maxHp).toBeGreaterThan(base.maxHp);
    p = command(p, { type: "upgrade", upgradeId: "training" }).progress;
    expect(calculateStats(p).damage).toBeGreaterThan(base.damage);
    const g = loadStage({
      stageId: "forest-1",
      difficulty: "normal",
      seed: 1,
      clears: [],
      build: calculateStats(p),
    });
    expect(g.level).toBe(1);
    expect(g.player.maxHp).toBe(calculateStats(p).maxHp);
    expect(g.weapon.damage).toBe(calculateStats(p).damage);
  });
  test("equip and unequip change actual projectile damage, attack interval, armor, crit, HP, regen and movement", () => {
    let p = fixture();
    const e = bagItem(p, "combat", "legendary");
    e.affixes = {
      attackSpeed: 0.05,
      critChance: 0.02,
      critDamage: 0.1,
      regen: 0.25,
    };
    const before = calculateStats(p);
    p = command(p, { type: "equip", itemId: e.id }).progress;
    const after = calculateStats(p);
    expect(after.damage).toBeGreaterThan(before.damage);
    expect(after.interval).toBeLessThan(before.interval);
    expect(after.critChance).toBeGreaterThan(before.critChance);
    expect(after.critDamage).toBeGreaterThan(before.critDamage);
    expect(after.regen).toBeGreaterThan(before.regen);
    const g = makeGame(800, 500);
    applyBuild(g, after, true);
    beginGame(g);
    g.enemies = [];
    g.spawnCooldown = 999;
    g.obstacles = [];
    g.player.hp -= 10;
    const x = g.player.x,
      hp = g.player.hp;
    advanceGame(g, 0.1, 1, 0);
    expect(g.player.x - x).toBeCloseTo(after.speed * 0.1);
    expect(g.player.hp).toBeGreaterThan(hp);
    const target = spawnEnemy(g, "elite", g.player.x + 60, g.player.y)!;
    target.speed = 0;
    g.weapon.cooldown = 0;
    g.rng = () => 0.99;
    advanceGame(g, 0.02, 0, 0);
    expect(g.bullets[0].damage).toBe(after.damage);
    g.player.invincible = 0;
    g.player.armor = 100;
    g.bullets = [
      {
        x: g.player.x,
        y: g.player.y,
        vx: 0,
        vy: 0,
        r: 8,
        life: 1,
        damage: 20,
        color: "#fff",
        hostile: true,
      },
    ];
    const old = g.player.hp;
    advanceGame(g, 0.02, 0, 0);
    expect(old - g.player.hp).toBeCloseTo(10 - after.regen * 0.02);
    expect(incomingDamage(20, 0)).toBe(20);
    p = command(p, { type: "unequip", slot: "weapon" }).progress;
    expect(calculateStats(p).damage).toBeLessThan(after.damage);
  });
  test("temporary blessings layer on equipped stats and focus expires cleanly", () => {
    const p = fixture(),
      base = calculateStats(p),
      g = makeGame(800, 500);
    applyBuild(g, base, true);
    beginGame(g);
    g.enemies = [];
    g.spawnCooldown = 999;
    g.phase = "upgrade";
    g.offers = ["power"];
    chooseUpgrade(g, "power");
    expect(g.weapon.damage).toBeCloseTo(base.damage + 2.5);
    g.focus = 0.01;
    applyBuild(g, base);
    expect(g.weapon.delay).toBeCloseTo(base.interval / 1.3);
    advanceGame(g, 0.02, 0, 0);
    expect(g.weapon.delay).toBeCloseTo(base.interval);
  });
  test("equipment loot reaches the same inventory and ledger as campaign materials", () => {
    const p = fixture();
    const q = applyResult(p, {
      id: "loot-run",
      stageId: "forest-1",
      difficulty: "normal",
      seed: 52,
      victory: true,
      enemies: 500,
      elites: 20,
      bosses: 0,
      seconds: 480,
    });
    expect(q.reward!.equipmentCount).toBeGreaterThan(1);
    expect(q.progress.rpg!.equipment.length).toBeGreaterThan(6);
    expect(q.progress.rpg!.history.at(-1)!.kind).toBe("rewards");
    expect(q.progress.gold).toBe(p.gold + q.reward!.gold);
    expect(JSON.parse(JSON.stringify(q.progress))).toEqual(q.progress);
  });
  test("paused consumable transactions are single-use and never create negative stock", () => {
    let p = fixture();
    p = command(p, { type: "consume", definitionId: "health-tonic" }).progress;
    expect(p.rpg!.consumables["health-tonic"]).toBe(2);
    p.rpg!.consumables["health-tonic"] = 0;
    expect(() =>
      command(p, { type: "consume", definitionId: "health-tonic" }),
    ).toThrow("No tonic");
  });
});

describe("IndexedDB economy races", () => {
  async function seedProfile() {
    const p = fixture();
    await campaignRepository.load();
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open("nowrift-campaign", 1);
      r.onsuccess = () => {
        const db = r.result,
          t = db.transaction("progress", "readwrite");
        t.objectStore("progress").put(p, "profile");
        t.oncomplete = () => {
          db.close();
          resolve();
        };
        t.onerror = () => reject(t.error);
      };
    });
    return p;
  }
  test("simultaneous stale enhancements charge exactly once", async () => {
    const p = await seedProfile(),
      id = weapon(p).id,
      quote = enhancementQuote(weapon(p));
    const attempts = await Promise.allSettled(
      ["race-a", "race-b"].map((idRequest) =>
        campaignRepository.act({
          id: idRequest,
          at: 1,
          expectedRevision: 0,
          action: { type: "enhance", itemId: id, expectedEnhancement: 0 },
        }),
      ),
    );
    expect(attempts.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const saved = await campaignRepository.load();
    expect(saved.gold).toBe(p.gold - quote.gold);
    expect(weapon(saved).enhancement).toBe(1);
    expect(saved.rpg!.history.filter((e) => e.kind === "enhance")).toHaveLength(
      1,
    );
  });
  test("duplicate requests in separate transactions return the same result without a second charge", async () => {
    const p = await seedProfile(),
      request = {
        id: "same-receipt",
        at: 1,
        expectedRevision: 0,
        action: { type: "buy", offerId: "staff", quantity: 1 } as const,
      };
    const results = await Promise.all([
      campaignRepository.act(request),
      campaignRepository.act(request),
    ]);
    expect(results[0].entry).toEqual(results[1].entry);
    const saved = await campaignRepository.load();
    expect(saved.gold).toBe(p.gold - 120);
    expect(
      saved.rpg!.equipment.filter((e) => e.id.startsWith("purchase:")),
    ).toHaveLength(1);
    expect(saved.rpg!.revision).toBe(1);
  });
});

describe("equipment effects through live collision and firing systems", () => {
  test("equipping a stronger helmet reduces damage from the same hostile projectile", () => {
    const p = fixture(),
      helmet = seededEquipment("armor-proof", "desert-helmet", "rare", 8);
    p.rpg!.equipment.push(helmet);
    const upgraded = command(p, { type: "equip", itemId: helmet.id }).progress;
    function hit(profile: typeof p) {
      const stats = calculateStats(profile),
        g = makeGame(800, 500);
      applyBuild(g, stats, true);
      beginGame(g);
      g.enemies = [];
      g.spawnCooldown = 999;
      g.weapon.cooldown = 999;
      const hp = g.player.hp;
      g.bullets.push({
        x: g.player.x,
        y: g.player.y,
        vx: 0,
        vy: 0,
        r: 6,
        life: 1,
        damage: 100,
        color: "#fff",
        hostile: true,
      });
      advanceGame(g, 0.02, 0, 0);
      return hp - g.player.hp;
    }
    expect(hit(upgraded)).toBeLessThan(hit(p));
  });
  test("projectile count, critical damage and fire blast area follow equipped item stats", () => {
    let p = fixture();
    const blade = bagItem(p, "crit-proof", "legendary");
    blade.affixes = {
      attackSpeed: 0.05,
      critChance: 0.02,
      critDamage: 0.1,
      regen: 0.25,
    };
    const ring = seededEquipment("area-proof", "frozen-ring", "rare", 5);
    ring.affixes = { projectiles: 1, area: 0.05 };
    p.rpg!.equipment.push(ring);
    p = command(p, { type: "equip", itemId: blade.id }).progress;
    p = command(p, { type: "equip", itemId: ring.id }).progress;
    const stats = calculateStats(p, "fire"),
      g = makeGame(800, 500, "fire", () => 0);
    applyBuild(g, stats, true);
    beginGame(g);
    g.enemies = [];
    g.spawnCooldown = 999;
    const target = spawnEnemy(g, "elite", g.player.x + 100, g.player.y)!;
    target.speed = 0;
    g.weapon.cooldown = 0;
    advanceGame(g, 0.02, 0, 0);
    expect(g.bullets).toHaveLength(stats.projectiles);
    expect(g.bullets[0].damage).toBeCloseTo(stats.damage * stats.critDamage);
    expect(g.bullets[0].blast).toBeCloseTo(64 * stats.area);
    expect(g.bullets[0].blast).toBeGreaterThan(64);
  });
  test("world boss candidates become owned, named relic gear", () => {
    const p = fixture();
    p.clears = [
      "forest-1:normal",
      "forest-2:normal",
      "forest-3:normal",
      "forest-4:normal",
    ];
    const q = applyResult(p, {
      id: "boss-relic",
      stageId: "forest-5",
      difficulty: "normal",
      seed: 16,
      victory: true,
      enemies: 0,
      elites: 0,
      bosses: 1,
      seconds: 660,
    });
    const relic = q.progress.rpg!.equipment.find(
      (e) => e.definitionId === "boss-forest",
    );
    expect(relic).toBeDefined();
    expect(ITEMS[relic!.definitionId].name).toBe("Verdant Relic");
    expect(RARITY_IDS.indexOf(relic!.rarity)).toBeGreaterThanOrEqual(
      RARITY_IDS.indexOf("rare"),
    );
  });
});
