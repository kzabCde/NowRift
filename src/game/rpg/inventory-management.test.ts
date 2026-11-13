import { describe, expect, test } from "vitest";
import { emptyProgress } from "../campaign/progression";
import {
  applyCommand,
  dismantleYield,
  sellPrice,
  type ActionBody,
} from "./actions";
import { BAG_MAX_CAPACITY, BAG_UPGRADE_COSTS, bagUpgradeCost } from "./bag";
import { inventory, usedSlots } from "./inventory";
import { seededEquipment } from "./items";
import { initializeRpg, validRpg } from "./profile";

function fixture() {
  const p = initializeRpg(emptyProgress());
  p.gold = 40000;
  return p;
}
let sequence = 0;
function act(p: ReturnType<typeof fixture>, action: ActionBody) {
  return applyCommand(p, {
    id: `inventory-action-${++sequence}`,
    at: 100,
    expectedRevision: p.rpg!.revision,
    action,
  }).progress;
}
describe("bag upgrades and transactional inventory management", () => {
  test("all six Gold purchases persist and cap at 120 slots", () => {
    let p = fixture();
    const initialGold = p.gold;
    for (let i = 0; i < BAG_UPGRADE_COSTS.length; i++) {
      expect(bagUpgradeCost(p.rpg!.capacity)).toBe(BAG_UPGRADE_COSTS[i]);
      p = act(p, { type: "expandBag" });
      expect(p.rpg!.capacity).toBe(70 + i * 10);
      expect(initializeRpg(p)).toEqual(p);
      expect(validRpg(p.rpg)).toBe(true);
    }
    expect(p.rpg!.capacity).toBe(BAG_MAX_CAPACITY);
    expect(p.gold).toBe(
      initialGold - BAG_UPGRADE_COSTS.reduce((a, b) => a + b, 0),
    );
    expect(() => act(p, { type: "expandBag" })).toThrow("maximum");
    expect(p.rpg!.history).toHaveLength(6);
  });
  test("insufficient Gold and invalid capacities never mutate the original save", () => {
    const p = fixture();
    p.gold = 499;
    expect(() => act(p, { type: "expandBag" })).toThrow("gold");
    expect(p.gold).toBe(499);
    expect(p.rpg!.capacity).toBe(60);
    for (const invalid of [59, 65, 121, 130, NaN, Infinity]) {
      const broken = structuredClone(p.rpg!);
      broken.capacity = invalid;
      expect(validRpg(broken)).toBe(false);
    }
  });
  test("duplicate receipts and stale revisions cannot purchase an expansion twice", () => {
    const p = fixture();
    const command = {
      id: "expand-once",
      at: 123,
      expectedRevision: 0,
      action: { type: "expandBag" } as const,
    };
    const first = applyCommand(p, command).progress;
    expect(applyCommand(first, command).progress).toEqual(first);
    expect(() =>
      applyCommand(first, { ...command, id: "stale-expand" }),
    ).toThrow("changed");
    expect(first.rpg!.capacity).toBe(70);
  });
  test("bulk sale of unique gear and stack quantities pays a single receipt", () => {
    const p = fixture();
    const blade = seededEquipment("bulk-blade", "desert-weapon", "rare", 5);
    const ring = seededEquipment("bulk-ring", "frozen-ring", "rare", 5);
    p.rpg!.equipment.push(blade, ring);
    p.materials.wood = 8;
    const a = inventory(p);
    const sold = [
      a.find((e) => e.id === blade.id)!,
      a.find((e) => e.id === ring.id)!,
      a.find((e) => e.id === "stack:wood")!,
    ];
    const expected =
      sellPrice(sold[0]) + sellPrice(sold[1]) + sellPrice(sold[2]) * 3;
    const before = p.gold;
    const next = act(p, {
      type: "bulkSell",
      items: [
        { itemId: blade.id, quantity: 1 },
        { itemId: ring.id, quantity: 1 },
        { itemId: "stack:wood", quantity: 3 },
      ],
    });
    expect(next.gold).toBe(before + expected);
    expect(
      next.rpg!.equipment.some((e) => e.id === blade.id || e.id === ring.id),
    ).toBe(false);
    expect(next.materials.wood).toBe(5);
    expect(next.rpg!.history).toHaveLength(1);
    expect(p.gold).toBe(before);
  });
  test("bulk sale accepts a stack larger than the normal shop purchase limit", () => {
    const p = fixture();
    p.materials.wood = 12000;
    const value = sellPrice(inventory(p).find((e) => e.id === "stack:wood")!);
    const next = act(p, {
      type: "bulkSell",
      items: [{ itemId: "stack:wood", quantity: 12000 }],
    });
    expect(next.materials.wood).toBe(0);
    expect(next.gold).toBe(p.gold + 12000 * value);
  });
  test("bulk sale rejects protected, duplicate, missing and over-quantity items atomically", () => {
    const p = fixture();
    const blade = seededEquipment("protected", "desert-weapon", "rare", 5);
    p.rpg!.equipment.push(blade);
    p.materials.wood = 4;
    const normal = { itemId: "stack:wood", quantity: 2 };
    for (const items of [
      [normal, { itemId: "starter-weapon", quantity: 1 }],
      [normal, normal],
      [normal, { itemId: "no-such-item", quantity: 1 }],
      [{ itemId: "stack:wood", quantity: 10 }],
    ])
      expect(() => act(p, { type: "bulkSell", items })).toThrow();
    blade.locked = true;
    expect(() =>
      act(p, {
        type: "bulkSell",
        items: [normal, { itemId: blade.id, quantity: 1 }],
      }),
    ).toThrow("Protected");
    expect(p.materials.wood).toBe(4);
    expect(p.rpg!.equipment.some((e) => e.id === blade.id)).toBe(true);
    expect(p.rpg!.history).toHaveLength(0);
  });
  test("bulk dismantling aggregates yields, handles overflow and leaves originals unchanged", () => {
    const p = fixture();
    const a = seededEquipment("salvage-a", "desert-weapon", "rare", 5);
    const b = seededEquipment("salvage-b", "frozen-ring", "epic", 8);
    a.enhancement = 5;
    b.enhancement = 5;
    p.rpg!.equipment.push(a, b);
    const yieldA = dismantleYield(inventory(p).find((e) => e.id === a.id)!);
    const yieldB = dismantleYield(inventory(p).find((e) => e.id === b.id)!);
    const next = act(p, { type: "bulkDismantle", itemIds: [a.id, b.id] });
    for (const id of Object.keys(yieldA))
      expect(next.materials[id]).toBe(
        (yieldA[id as keyof typeof yieldA] ?? 0) +
          (yieldB[id as keyof typeof yieldB] ?? 0),
      );
    expect(next.rpg!.history).toHaveLength(1);
    expect(p.rpg!.equipment.some((e) => e.id === a.id)).toBe(true);

    const full = fixture();
    full.rpg!.consumables = {};
    for (let i = 0; i < 60; i++)
      full.rpg!.equipment.push(
        seededEquipment(`bag-gear-${i}`, "desert-weapon", "rare", 5),
      );
    full.rpg!.equipment.find((e) => e.id === "bag-gear-0")!.enhancement = 5;
    expect(usedSlots(full)).toBe(60);
    const result = act(full, {
      type: "bulkDismantle",
      itemIds: ["bag-gear-0"],
    });
    expect(result.rpg!.overflow.length).toBe(1);
    expect(usedSlots(result)).toBe(60);
    expect(result.rpg!.overflow[0].definitionId).toBe("enhancement-stone");
    expect(validRpg(result.rpg)).toBe(true);
  });
  test("existing starter items remain protected in single-item actions", () => {
    const p = fixture();
    p.rpg!.equipped.weapon = null;
    expect(() =>
      act(p, { type: "sell", itemId: "starter-weapon", quantity: 1 }),
    ).toThrow("Starter");
    expect(() =>
      act(p, { type: "dismantle", itemId: "starter-weapon", quantity: 1 }),
    ).toThrow("Starter");
  });
});
