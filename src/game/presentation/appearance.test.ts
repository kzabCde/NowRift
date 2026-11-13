import { resolveWeaponVisual } from "./weapon-visual";
import "fake-indexeddb/auto";
import { beforeEach, expect, test } from "vitest";
import { emptyProgress } from "../campaign/progression";
import { initializeRpg } from "../rpg/profile";
import { seededEquipment } from "../rpg/items";
import { SLOTS, type Rarity } from "../rpg/model";
import { applyCommand } from "../rpg/actions";
import { calculateStats, campaignLoadout } from "../rpg/stats";
import { CHARACTERS, type CharacterId } from "../loadout";
import { loadStage } from "../campaign/loader";
import {
  captureCheckpoint,
  restoreCheckpoint,
  validCheckpoint,
} from "../persistence/checkpoint";
import {
  profileRepository as repo,
  resetClientSelectionForTests,
} from "../persistence/repository";
import {
  committedRpgVisual,
  commitVisualAction,
  createVisualActionState,
  advanceVisualAction,
} from "./action-feedback";
import {
  defaultAppearance,
  resolveAppearance,
  validAppearance,
  appearanceAssets,
  layerDepth,
  weaponVisualFrame,
} from "./appearance";
import { pixelAsset } from "./assets";
import { animationDuration } from "./animation";
const worlds = ["forest", "desert", "frozen", "infernal"];
function fixture(world = "forest", rarity: Rarity = "rare") {
  const p = initializeRpg(emptyProgress());
  for (const slot of SLOTS) {
    const item = seededEquipment(
      `owned-${world}-${slot}`,
      `${world}-${slot}`,
      rarity,
      3,
    );
    p.rpg!.equipment.push(item);
    p.rpg!.equipped[slot] = item.id;
  }
  return p;
}
beforeEach(async () => {
  resetClientSelectionForTests();
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase("nowrift-campaign");
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error("Open database"));
  });
});
test("all archetypes, biome equipment and rarity silhouettes resolve to existing independent frame grids", () => {
  for (const character of Object.keys(CHARACTERS) as CharacterId[])
    for (const world of worlds)
      for (const rarity of ["common", "rare", "legendary"] as const) {
        const p = fixture(world, rarity),
          before = structuredClone(p),
          look = resolveAppearance(p, character);
        expect(validAppearance(look)).toBe(true);
        expect(p).toEqual(before);
        expect(new Set(look.layers.map((l) => l.slot)).size).toBe(
          look.layers.length,
        );
        for (const slot of [
          "body",
          "skin",
          "hair",
          "face",
          "pants",
          "inner",
          "back",
          "gloves",
          "armor",
          "headwear",
          "boots",
          "ring",
          "necklace",
        ])
          expect(look.layers.some((l) => l.slot === slot)).toBe(true);
        for (const asset of appearanceAssets(look)) {
          const meta = pixelAsset(asset.key)!;
          expect(meta.path).toBe(asset.path);
          expect(meta.frameCount).toBe(104);
          expect(meta.width).toBe(1248);
        }
        const weapon = campaignLoadout(p, undefined, character).weaponSnapshot;
        expect(weaponVisualFrame(weapon)).toBe(
          resolveWeaponVisual(weapon)!.frame,
        );
        expect(weaponVisualFrame(weapon)).toBeLessThan(
          pixelAsset("weapon-evolution")!.frameCount,
        );
      }
});
test("equipping and unequipping individual armor leaves every other owned item and layer identity intact", () => {
  const p = fixture(),
    old = resolveAppearance(p),
    id = p.rpg!.equipped.helmet!;
  const result = applyCommand(p, {
    id: "remove-headwear",
    at: 1,
    expectedRevision: p.rpg!.revision,
    action: { type: "unequip", slot: "helmet" },
  }).progress;
  const next = resolveAppearance(result);
  expect(next.layers.some((l) => l.slot === "headwear")).toBe(false);
  expect(next.layers.filter((l) => l.slot !== "headwear")).toEqual(
    old.layers.filter((l) => l.slot !== "headwear"),
  );
  expect(result.rpg!.equipment).toEqual(p.rpg!.equipment);
  expect(result.rpg!.equipment.some((e) => e.id === id)).toBe(true);
});
test("skin, face, hair and cloak choices alter only appearance and validate canonical local assets", () => {
  const p = fixture(),
    before = calculateStats(p),
    look = resolveAppearance(p, "strider", "tide", {
      skin: "umber",
      hair: "braid",
      face: "scar",
    });
  expect(validAppearance(look)).toBe(true);
  expect(look.layers.some((l) => l.path.endsWith("skin-umber.png"))).toBe(true);
  expect(look.layers.some((l) => l.path.endsWith("hair-braid.png"))).toBe(true);
  expect(look.layers.some((l) => l.path.endsWith("face-scar.png"))).toBe(true);
  expect(calculateStats(p)).toEqual(before);
  for (const mutate of [
    (v: typeof look) => {
      v.layers[0].path = "https://example.org/not-an-asset.png";
    },
    (v: typeof look) => {
      v.equipment[0].enhancement = 99;
    },
    (v: typeof look) => {
      v.layers.pop();
    },
    (v: typeof look) => {
      v.equipment.push({ ...v.equipment[0] });
    },
  ]) {
    const v = structuredClone(look);
    mutate(v);
    expect(validAppearance(v)).toBe(false);
  }
  expect(layerDepth("back", "up", -4)).toBeGreaterThan(0);
  expect(layerDepth("back", "down", -4)).toBeLessThan(0);
  expect(validAppearance(defaultAppearance("sentinel"))).toBe(true);
});
test("new checkpoints freeze all equipment appearance independently of later inventory and cosmetic changes", () => {
  const p = fixture("frozen", "epic"),
    selection = {
      stageId: "forest-1",
      difficulty: "normal" as const,
      seed: 412,
      clears: [],
      ...campaignLoadout(p, undefined, "strider"),
    };
  const g = loadStage(selection),
    cp = captureCheckpoint(
      g,
      {
        id: "frozen-appearance-run",
        slotId: "slot-appearance",
        writer: "tab",
        sequence: 1,
      },
      412,
      selection,
    );
  expect(validCheckpoint(cp)).toBe(true);
  p.rpg!.equipped.armor = null;
  p.rpg!.equipment[0].enhancement = 12;
  const restored = restoreCheckpoint(cp);
  expect(restored.visualAppearance).toEqual(selection.visualAppearance);
  expect(restored.visualAppearance!.equipment).toHaveLength(7);
  expect(restored.visualAppearance!.appearanceKey).not.toBe(
    resolveAppearance(p, "strider", "ember").appearanceKey,
  );
  const corrupt = structuredClone(cp);
  corrupt.state.visualAppearance!.layers[0].key = "wrong";
  expect(validCheckpoint(corrupt)).toBe(false);
});
test("wardrobe changes commit through the existing local profile without altering equipment, currency or stats", async () => {
  const p = await repo.load();
  await repo.world(p.local.id, { type: "enter", writer: "wardrobe" });
  const next = await repo.world(p.local.id, {
    type: "appearance",
    writer: "wardrobe",
    outfit: "ember",
    customization: { skin: "pale", hair: "crest", face: "vigil" },
  });
  expect(next.rpg).toEqual(p.rpg);
  expect(next.gold).toBe(p.gold);
  expect(calculateStats(next)).toEqual(calculateStats(p));
  expect((await repo.load(p.local.id)).local.world!.customization).toEqual({
    skin: "pale",
    hair: "crest",
    face: "vigil",
  });
  await expect(
    repo.world(p.local.id, {
      type: "appearance",
      writer: "wardrobe",
      outfit: "tide",
      customization: { skin: "invalid", hair: "crest", face: "vigil" } as never,
    }),
  ).rejects.toThrow();
  expect((await repo.load()).local.world!.outfit).toBe("ember");
});
test("craft and enhancement visuals require committed real ledger entries; replay and rejected actions award no visual loot", () => {
  const p = fixture();
  p.gold = 10000;
  p.materials = { wood: 100, "slime-core": 100, "copper-ore": 100 };
  const action = {
    type: "enhance" as const,
    itemId: p.rpg!.equipped.weapon!,
    expectedEnhancement: 0,
  };
  const result = applyCommand(
    p,
    {
      id: "real-enhancement",
      at: 1,
      expectedRevision: p.rpg!.revision,
      action,
    },
    () => 0,
  );
  const receipt = committedRpgVisual(p, result, action)!;
  expect(receipt.pose).toBe("craft");
  expect(receipt.items).toEqual([]);
  expect(receipt.gold).toBe(0);
  expect(
    committedRpgVisual(p, { progress: p, entry: result.entry }, action),
  ).toBeNull();
  expect(committedRpgVisual(result.progress, result, action)).toBeNull();
  const state = createVisualActionState();
  expect(commitVisualAction(state, receipt)).toBe(true);
  expect(commitVisualAction(state, receipt)).toBe(false);
  advanceVisualAction(state, 100, true);
  expect(state.active!.ageMs).toBe(0);
  advanceVisualAction(state, animationDuration("craft"));
  expect(state.active).toBeNull();
});
