import "fake-indexeddb/auto";
import { beforeEach, expect, test } from "vitest";
import legacy from "./fixtures/six-slot-save.json";
import { emptyProgress, type Progress } from "../campaign/progression";
import { migrateSave } from "../persistence/validation";
import { initializeRpg, migrateRpg, validRpg } from "./profile";
import {
  ITEMS,
  OUTFITTER_OFFERS,
  GENERAL_SHOP,
  SHOP,
  WEARABLE_SLOTS,
} from "./content";
import { LEGACY_SLOTS, RARITY_IDS, SLOTS } from "./model";
import { applyCommand, shopEquipment, type ActionBody } from "./actions";
import { seededEquipment } from "./items";
import { usedSlots } from "./inventory";
import { calculateStats, campaignLoadout, itemStats } from "./stats";
import { previewEquipment } from "./preview";
import { enhancementQuote } from "./enhancement";
import { resolveAppearance, validAppearance } from "../presentation/appearance";
import { resolveWeaponVisual } from "../presentation/weapon-visual";
import { restoreCheckpoint, validCheckpoint } from "../persistence/checkpoint";
import { CHARACTERS, type CharacterId } from "../loadout";
import { STAGES } from "../campaign/content";
import { loadStage } from "../campaign/loader";
import {
  profileRepository as repo,
  resetClientSelectionForTests,
} from "../persistence/repository";
import { transact } from "../persistence/storage";
import { purchaseEligibility } from "./shop";
import { translateText } from "../../i18n/translator";

function funded() {
  const p = initializeRpg(emptyProgress());
  p.gold = 1000000;
  p.clears = STAGES.map((stage) => `${stage.id}:normal`);
  p.materials = { wood: 1000, "copper-ore": 1000, "enhancement-stone": 1000 };
  return p;
}
let sequence = 0;
function act(p: Progress, action: ActionBody, id = "outfitters-" + ++sequence) {
  return applyCommand(
    p,
    {
      id,
      at: Date.parse("2026-11-13T05:00:00Z"),
      expectedRevision: p.rpg!.revision,
      action,
    },
    () => 0,
  );
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

test("the six-slot golden save migrates once without rewards or changes to its frozen checkpoint", () => {
  const before = JSON.parse(JSON.stringify(legacy)),
    next = migrateSave(before, legacy.local.id, legacy.local.lastPlayed);
  expect(validRpg(next.rpg)).toBe(true);
  expect(next.rpg!.schema).toBe(2);
  expect(next.rpg!.equipped.pants).toBeNull();
  const expected = structuredClone(before);
  expected.rpg.schema = 2;
  expected.rpg.equipped.pants = null;
  expect(next).toEqual(expected);
  expect(migrateSave(next, next.local.id, next.local.lastPlayed)).toEqual(next);
  expect(before).toEqual(legacy);
  expect(validCheckpoint(next.local.checkpoint)).toBe(true);
  const restored = restoreCheckpoint(next.local.checkpoint!);
  expect(restored.visualAppearance).toEqual(
    legacy.local.checkpoint.state.visualAppearance,
  );
  expect(restored.visualAppearance!.schema).toBe(1);
  expect(
    restored.visualAppearance!.layers.find((layer) => layer.slot === "pants")!
      .key,
  ).toContain("pants-desert");
  expect(restored.weapon).toEqual(legacy.local.checkpoint.state.weapon);
  expect(resolveWeaponVisual(restored.equippedWeapon)!.tier).toBe(2);
  expect(resolveAppearance(next).schema).toBe(2);
  expect(
    resolveAppearance(next).layers.find((layer) => layer.slot === "pants")!.key,
  ).toContain("pants-base");
});
test("all six original slots, icon indices and IDs remain stable; new saves do not grant free pants", () => {
  const p = initializeRpg(emptyProgress());
  expect(SLOTS).toHaveLength(7);
  expect(p.rpg!.equipment).toHaveLength(6);
  expect(p.rpg!.equipped.pants).toBeNull();
  for (const [wi, world] of [
    "forest",
    "desert",
    "frozen",
    "infernal",
  ].entries())
    for (const [si, slot] of LEGACY_SLOTS.entries())
      expect(ITEMS[`${world}-${slot}`].icon).toBe(wi * 6 + si);
  expect(
    new Set(
      Object.values(ITEMS)
        .filter((item) => item.slot === "pants")
        .map((item) => item.icon),
    ),
  ).toEqual(new Set([44, 45, 46, 47]));
  expect(initializeRpg(p)).toBe(p);
});
test("damaged current or legacy slot maps are rejected instead of granting or discarding gear", () => {
  const legacyData = JSON.parse(JSON.stringify(legacy.rpg));
  delete legacyData.equipped.helmet;
  expect(migrateRpg(legacyData)).toBeNull();
  const current = structuredClone(funded().rpg!);
  delete (current.equipped as Partial<typeof current.equipped>).pants;
  expect(migrateRpg(current)).toBeNull();
  expect(migrateRpg({ ...legacy.rpg, schema: "1" })).toBeNull();
  expect(
    migrateRpg({
      ...legacy.rpg,
      equipped: { ...legacy.rpg.equipped, pants: "foreign" },
    }),
  ).toBeNull();
});
test("repository loads persist the slot upgrade across every character without changing ownership", async () => {
  const original = await repo.load();
  const stored = JSON.parse(JSON.stringify(legacy));
  stored.local.id = original.local.id;
  stored.local.checkpoint.run.slotId = original.local.id;
  stored.local.activeRun.slotId = original.local.id;
  await transact((_, store) => store.put(stored, "profile"));
  const first = await repo.load();
  expect(first.rpg!.schema).toBe(2);
  expect(first.rpg!.equipped.pants).toBeNull();
  expect(first.rpg!.equipment).toEqual(legacy.rpg.equipment);
  expect((await repo.load()).rpg).toEqual(first.rpg);
  const second = await repo.create("Tailor Two", "strider");
  expect(second.rpg!.equipped.pants).toBeNull();
  await repo.select(first.local.id);
  expect((await repo.load()).rpg!.equipment).toEqual(first.rpg!.equipment);
});
test("catalog reuses all existing apparel and the exact original vest offer", () => {
  expect(OUTFITTER_OFFERS).toHaveLength(80);
  expect(SHOP).toHaveLength(87);
  expect(new Set(SHOP.map((offer) => offer.id)).size).toBe(SHOP.length);
  expect(OUTFITTER_OFFERS.find((offer) => offer.id === "armor")).toBe(
    GENERAL_SHOP.find((offer) => offer.id === "armor"),
  );
  expect(SHOP.find((offer) => offer.id === "armor")).toMatchObject({
    price: 120,
    level: 3,
    rarity: "uncommon",
    item: "forest-armor",
  });
  for (const world of ["forest", "desert", "frozen", "infernal"])
    for (const slot of WEARABLE_SLOTS) {
      const offers = OUTFITTER_OFFERS.filter(
        (offer) => offer.item === `${world}-${slot}`,
      );
      expect(offers.map((offer) => offer.rarity)).toEqual(RARITY_IDS);
    }
});
test.each(OUTFITTER_OFFERS)(
  "purchase, preview, equip and enhancement share the real $id attributes",
  (offer) => {
    const p = funded(),
      before = structuredClone(p),
      prototype = shopEquipment(offer.id, "outfitters-preview");
    const result = act(p, { type: "buy", offerId: offer.id, quantity: 1 });
    const bought = result.progress.rpg!.equipment.at(-1)!;
    expect(result.progress.gold).toBe(p.gold - offer.price);
    expect({ ...bought, id: prototype.id }).toEqual(prototype);
    const equipped = act(result.progress, {
      type: "equip",
      itemId: bought.id,
    }).progress;
    expect(calculateStats(equipped)).toEqual(
      calculateStats(previewEquipment(p, prototype)),
    );
    expect(
      itemStats(bought)[ITEMS[bought.definitionId].primary!],
    ).toBeGreaterThan(0);
    const quote = enhancementQuote(bought);
    expect(quote.materials.wood).toBe(1);
    const enhanced = act(equipped, {
      type: "enhance",
      itemId: bought.id,
      expectedEnhancement: 0,
    }).progress;
    expect(
      enhanced.rpg!.equipment.find((item) => item.id === bought.id)!
        .enhancement,
    ).toBe(1);
    expect(p).toEqual(before);
  },
);
test("purchases are unique and replay-safe; insufficient funds, capacity, revision and unlocks are enforced", () => {
  const offer = OUTFITTER_OFFERS[0],
    p = funded();
  const first = act(
    p,
    { type: "buy", offerId: offer.id, quantity: 1 },
    "repeat-order",
  ).progress;
  const replay = applyCommand(first, {
    id: "repeat-order",
    at: 2,
    expectedRevision: 0,
    action: { type: "buy", offerId: offer.id, quantity: 1 },
  }).progress;
  expect(replay).toEqual(first);
  const second = act(first, {
    type: "buy",
    offerId: offer.id,
    quantity: 1,
  }).progress;
  expect(new Set(second.rpg!.equipment.map((item) => item.id)).size).toBe(
    p.rpg!.equipment.length + 2,
  );
  const poor = structuredClone(p);
  poor.gold = offer.price - 1;
  expect(() =>
    act(poor, { type: "buy", offerId: offer.id, quantity: 1 }),
  ).toThrow("Not enough gold");
  const full = structuredClone(p);
  while (usedSlots(full) < 60)
    full.rpg!.equipment.push(
      seededEquipment(
        "fill-" + full.rpg!.equipment.length,
        "forest-pants",
        "common",
        1,
      ),
    );
  expect(purchaseEligibility(full, offer)).toBe("Inventory full.");
  expect(() =>
    act(full, { type: "buy", offerId: offer.id, quantity: 1 }),
  ).toThrow("Inventory full");
  expect(() =>
    act(p, { type: "buy", offerId: "made-up", quantity: 1 }),
  ).toThrow("Unknown shop offer");
  for (const quantity of [0, -1, 0.5, 100, Infinity])
    expect(() =>
      act(p, { type: "buy", offerId: offer.id, quantity }),
    ).toThrow();
  expect(() =>
    applyCommand(first, {
      id: "stale",
      at: 2,
      expectedRevision: 0,
      action: { type: "buy", offerId: offer.id, quantity: 1 },
    }),
  ).toThrow("inventory changed");
  const locked = structuredClone(p);
  locked.clears = [];
  locked.xp = 100000;
  const rare = OUTFITTER_OFFERS.find((offer) => offer.rarity === "rare")!;
  expect(() =>
    act(locked, { type: "buy", offerId: rare.id, quantity: 1 }),
  ).toThrow("required world milestone");
  expect(purchaseEligibility(locked, OUTFITTER_OFFERS[0])).toBeNull();
});
test("pants stats, replacement and removal affect only the selected item contribution", () => {
  let p = funded();
  const base = calculateStats(p);
  const a = seededEquipment("leg-a", "forest-pants", "common", 3),
    b = seededEquipment("leg-b", "frozen-pants", "common", 5);
  p.rpg!.equipment.push(a, b);
  p = act(p, { type: "equip", itemId: a.id }).progress;
  expect(calculateStats(p).armor).toBeCloseTo(base.armor + itemStats(a).armor);
  p = act(p, { type: "equip", itemId: b.id }).progress;
  expect(calculateStats(p).armor).toBeCloseTo(base.armor + itemStats(b).armor);
  p = act(p, { type: "unequip", slot: "pants" }).progress;
  expect(calculateStats(p)).toEqual(base);
  const protectedGear = act(p, {
    type: "flag",
    itemId: b.id,
    flag: "favorite",
  }).progress;
  expect(() =>
    act(protectedGear, { type: "sell", itemId: b.id, quantity: 1 }),
  ).toThrow("protected");
  p = act(p, { type: "equip", itemId: b.id }).progress;
  expect(() => act(p, { type: "sell", itemId: b.id, quantity: 1 })).toThrow(
    "protected",
  );
  p = act(p, { type: "unequip", slot: "pants" }).progress;
  const sold = act(p, { type: "sell", itemId: b.id, quantity: 1 }).progress;
  expect(sold.gold).toBeGreaterThan(p.gold);
  expect(sold.rpg!.equipment.some((item) => item.id === b.id)).toBe(false);
});
test("every class/theme/rarity uses independent pants and retains customization, weapons and other layers", () => {
  for (const character of Object.keys(CHARACTERS) as CharacterId[])
    for (const world of ["forest", "desert", "frozen", "infernal"])
      for (const rarity of RARITY_IDS) {
        const p = funded(),
          item = seededEquipment("pants-owned", `${world}-pants`, rarity, 8);
        item.enhancement = 9;
        p.rpg!.equipment.push(item);
        const before = resolveAppearance(p, character),
          weapon = resolveWeaponVisual(campaignLoadout(p).weaponSnapshot);
        const equipped = act(p, { type: "equip", itemId: item.id }).progress,
          after = resolveAppearance(equipped, character);
        expect(validAppearance(after)).toBe(true);
        expect(
          after.layers.find((layer) => layer.slot === "pants")!.definitionId,
        ).toBe(item.definitionId);
        expect(after.layers.filter((layer) => layer.slot !== "pants")).toEqual(
          before.layers.filter((layer) => layer.slot !== "pants"),
        );
        expect(
          resolveWeaponVisual(campaignLoadout(equipped).weaponSnapshot),
        ).toEqual(weapon);
        const chest = seededEquipment("other-chest", "desert-armor", "epic", 8);
        equipped.rpg!.equipment.push(chest);
        const changed = act(equipped, {
          type: "equip",
          itemId: chest.id,
        }).progress;
        expect(
          resolveAppearance(changed, character).layers.find(
            (layer) => layer.slot === "pants",
          ),
        ).toEqual(after.layers.find((layer) => layer.slot === "pants"));
      }
});
test("Story and Free Mode freeze identical clothing stats and appearance while live inventory changes", () => {
  for (const mode of ["story", "free"] as const) {
    const p = funded(),
      pants = seededEquipment("travel-pants", "infernal-pants", "legendary", 8);
    pants.enhancement = 12;
    p.rpg!.equipment.push(pants);
    p.rpg!.equipped.pants = pants.id;
    const build = campaignLoadout(p),
      selection = {
        stageId: "forest-1",
        difficulty: "normal" as const,
        seed: 8,
        clears: p.clears,
        mode,
        ...build,
      };
    const g = loadStage(selection),
      frozen = structuredClone(g.visualAppearance);
    p.rpg!.equipped.pants = null;
    expect(g.player.maxHp).toBe(build.weaponSnapshot.stats.maxHp);
    expect(g.player.speed).toBe(build.weaponSnapshot.stats.speed);
    expect(g.visualAppearance).toEqual(frozen);
    expect(
      g.visualAppearance!.equipment.find((item) => item.slot === "pants")!
        .instanceId,
    ).toBe(pants.id);
  }
});
test("new clothing names, descriptions and transaction messages translate offline", () => {
  for (const item of Object.values(ITEMS).filter(
    (item) => item.slot === "pants",
  )) {
    expect(translateText("th", item.name)).not.toBe(item.name);
    expect(translateText("th", item.description)).not.toBe(item.description);
  }
  expect(
    translateText(
      "th",
      "Complete the required world milestone before buying this offer.",
    ),
  ).not.toContain("Complete");
});
