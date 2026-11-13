import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import {
  evolutionTier,
  resolveWeaponVisual,
  nextEvolution,
  weaponTexture,
  weaponEffects,
  EVOLUTION_TIERS,
  WEAPON_FAMILIES,
} from "./weapon-visual";
import { seededEquipment } from "../rpg/items";
import { initializeRpg } from "../rpg/profile";
import { emptyProgress } from "../campaign/progression";
import { applyCommand } from "../rpg/actions";
import { campaignLoadout } from "../rpg/stats";
import { validWeaponSnapshot } from "../rpg/weapon-validation";
import { loadStage } from "../campaign/loader";
import {
  captureCheckpoint,
  restoreCheckpoint,
  validCheckpoint,
} from "../persistence/checkpoint";
import { CHARACTERS, type CharacterId } from "../loadout";
import { practiceFrame } from "./character";
import { assetsForScene, pixelAsset, type AssetWorld } from "./assets";
import { translate, translateText } from "../../i18n/translator";

const definitions = [
  "forest-weapon",
  "desert-weapon",
  "frozen-weapon",
  "infernal-weapon",
];
function item(row = 0, enhancement = 0) {
  return {
    ...seededEquipment("evolution-owned", definitions[row], "rare", 3),
    enhancement,
  };
}
function profile(row = 0, enhancement = 0) {
  const p = initializeRpg(emptyProgress());
  p.rpg!.equipment.push(item(row, enhancement));
  p.rpg!.equipped.weapon = "evolution-owned";
  p.gold = 10_000_000;
  p.materials = { "copper-ore": 10000, "enhancement-stone": 10000 };
  return p;
}
test.each(Array.from({ length: 16 }, (_, enhancement) => enhancement))(
  "+%i derives only its three-level milestone",
  (enhancement) => {
    expect(evolutionTier(enhancement)).toBe(Math.floor(enhancement / 3));
    expect(resolveWeaponVisual(item(0, enhancement))!.tier).toBe(
      Math.floor(enhancement / 3),
    );
  },
);
test.each([undefined, null, "15", NaN, Infinity, -Infinity, {}, -3, -1])(
  "invalid enhancement %s safely resolves base",
  (value) => {
    expect(evolutionTier(value)).toBe(0);
  },
);
test("bounded finite values, milestone distances and terminal tier", () => {
  expect(evolutionTier(999)).toBe(5);
  expect(evolutionTier(5.99)).toBe(1);
  for (let rank = 0; rank <= 15; rank++) {
    const next = nextEvolution(rank);
    if (rank === 15) expect(next).toBeNull();
    else expect(next!.enhancement - rank).toBeGreaterThanOrEqual(1);
  }
  expect(nextEvolution(5)).toEqual({ enhancement: 6, tier: 2 });
});
test("all 24 family/tier combinations are independent of rarity and item level", () => {
  const frames = new Set();
  for (let row = 0; row < 4; row++)
    for (let tier = 0; tier < 6; tier++) {
      const base = item(row, tier * 3),
        visual = resolveWeaponVisual(base)!;
      frames.add(visual.frame);
      expect(visual.frame).toBe(row * 6 + tier);
      expect(visual.family).toBe(WEAPON_FAMILIES[row]);
      expect(
        resolveWeaponVisual({ ...base, rarity: "legendary", level: 50 })!.frame,
      ).toBe(visual.frame);
      expect(
        resolveWeaponVisual({ ...base, rarity: "legendary" })!.rarityAccent,
      ).not.toBe(visual.rarityAccent);
    }
  expect(frames.size).toBe(24);
  expect(resolveWeaponVisual(null)).toBeNull();
  expect(
    resolveWeaponVisual({ ...item(), definitionId: "forest-armor" }),
  ).toBeNull();
  expect(
    resolveWeaponVisual({ ...item(), definitionId: "unknown" }),
  ).toBeNull();
});
test.each(definitions)(
  "real actions evolve %s to +15 without adding progression fields",
  (definition) => {
    let p = profile(definitions.indexOf(definition));
    for (let before = 0; before < 15; before++) {
      const result = applyCommand(
        p,
        {
          id: "evolve-" + before,
          at: before + 1,
          expectedRevision: p.rpg!.revision,
          action: {
            type: "enhance",
            itemId: "evolution-owned",
            expectedEnhancement: before,
          },
        },
        () => 0,
      );
      p = result.progress;
      const saved = p.rpg!.equipment.at(-1)!;
      expect(saved.enhancement).toBe(before + 1);
      expect(resolveWeaponVisual(saved)!.tier).toBe(
        Math.floor((before + 1) / 3),
      );
      expect(resolveWeaponVisual(JSON.parse(JSON.stringify(saved)))).toEqual(
        resolveWeaponVisual(saved),
      );
      expect(Object.keys(saved)).toEqual(Object.keys(item()));
    }
  },
);
test("failures preserve appearance; downgrades across a milestone reverse it", () => {
  for (const rank of [5, 8, 11, 14]) {
    const p = profile(1, rank);
    const kept = applyCommand(
      p,
      {
        id: "fail-" + rank,
        at: 1,
        expectedRevision: p.rpg!.revision,
        action: {
          type: "enhance",
          itemId: "evolution-owned",
          expectedEnhancement: rank,
        },
      },
      () => 0.999,
    );
    expect(kept.entry?.enhancement?.success).toBe(false);
    expect(
      resolveWeaponVisual(kept.progress.rpg!.equipment.at(-1))!.frame,
    ).toBe(resolveWeaponVisual(item(1, rank))!.frame);
  }
  const p = profile(1, 12);
  let call = 0;
  const dropped = applyCommand(
    p,
    {
      id: "downgrade",
      at: 1,
      expectedRevision: p.rpg!.revision,
      action: {
        type: "enhance",
        itemId: "evolution-owned",
        expectedEnhancement: 12,
      },
    },
    () => (call++ === 0 ? 0.999 : 0),
  );
  expect(dropped.entry!.enhancement!.after).toBe(11);
  expect(
    resolveWeaponVisual(dropped.progress.rpg!.equipment.at(-1))!.tier,
  ).toBe(3);
});
test("all classes and tiers derive historical appearances from legacy-valid immutable snapshots", () => {
  for (const character of Object.keys(CHARACTERS) as CharacterId[])
    for (let row = 0; row < 4; row++)
      for (let tier = 0; tier < 6; tier++) {
        const p = profile(row, tier * 3),
          historical = campaignLoadout(p, "fire", character).weaponSnapshot;
        expect(validWeaponSnapshot(historical)).toBe(true);
        expect(historical.assetKey).toBe("equipment-weapons");
        p.rpg!.equipment.at(-1)!.enhancement = 15;
        expect(resolveWeaponVisual(historical)!.tier).toBe(tier);
        expect(
          resolveWeaponVisual(campaignLoadout(p).weaponSnapshot)!.tier,
        ).toBe(5);
      }
});
test("checkpoint recovery derives its historical appearance after the live item changes", () => {
  const p = profile(1, 8),
    selection = {
      stageId: "forest-1",
      difficulty: "normal" as const,
      seed: 9,
      clears: [],
      ...campaignLoadout(p),
    };
  const checkpoint = captureCheckpoint(
    loadStage(selection),
    { id: "visual-checkpoint", slotId: "slot", writer: "writer", sequence: 1 },
    9,
    selection,
  );
  expect(validCheckpoint(checkpoint)).toBe(true);
  p.rpg!.equipment.at(-1)!.enhancement = 15;
  const restored = restoreCheckpoint(JSON.parse(JSON.stringify(checkpoint)));
  expect(resolveWeaponVisual(restored.equippedWeapon)!.frame).toBe(8);
  expect(restored.equippedWeapon).toEqual(selection.weaponSnapshot);
  expect(restored.weapon).toEqual(checkpoint.state.weapon);
});
test("missing assets select the correct legacy family or hide; practice stays independent", () => {
  for (let row = 0; row < 4; row++) {
    const visual = resolveWeaponVisual(item(row, 15))!;
    expect(weaponTexture(visual, () => true)).toBe(visual);
    expect(weaponTexture(visual, (key) => key === "equipment-weapons")).toEqual(
      visual.fallback,
    );
    expect(visual.fallback.frame).toBe(row);
    expect(weaponTexture(visual, () => false)).toBeNull();
  }
  expect(practiceFrame).toEqual({
    arcane: 0,
    daggers: 4,
    fire: 5,
    frost: 2,
    slash: 1,
    sweep: 3,
  });
});
test("the canonical registry queues all 24 frames with every supported scene bundle", () => {
  const asset = pixelAsset("weapon-evolution")!;
  expect(asset).toMatchObject({
    path: "/assets/characters/weapon-evolution.png",
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 24,
    columns: 6,
    rows: 4,
    category: "weapon",
    bundle: "common",
    pivot: [0.5, 0.75],
  });
  for (const world of [
    "haven",
    "forest",
    "desert",
    "frozen",
    "infernal",
  ] as AssetWorld[])
    expect(assetsForScene(world)).toContain(asset);
});
test("effects have bounded budgets for every quality and motion preference", () => {
  expect(weaponEffects(0).glow).toBe(false);
  expect(weaponEffects(1).particles).toBe(0);
  expect(weaponEffects(2).glow).toBe(true);
  expect(weaponEffects(3).pulse).toBe(true);
  expect(weaponEffects(4).particles).toBe(2);
  expect(weaponEffects(5).trail).toBe(true);
  expect(weaponEffects(5, true)).toEqual({
    glow: false,
    pulse: false,
    particles: 0,
    trail: false,
  });
  expect(weaponEffects(5, false, true).particles).toBe(0);
});
test("tier names and milestone copy work in both languages", () => {
  for (const name of EVOLUTION_TIERS) {
    expect(translateText("en", name)).toBe(name);
    expect(translateText("th", name)).not.toBe(name);
  }
  expect(
    translate(
      "th",
      "equipment",
      "{count} successful enhancements until the next evolution.",
      { count: 2 },
    ),
  ).toContain("2");
});

/** Decode actual committed RGBA pixels rather than trusting metadata alone. */
function atlasPixels() {
  const png = readFileSync("public/assets/characters/weapon-evolution.png");
  expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect([
    png.readUInt32BE(16),
    png.readUInt32BE(20),
    png[24],
    png[25],
  ]).toEqual([192, 128, 8, 6]);
  const chunks: Buffer[] = [];
  for (let offset = 8; offset < png.length; ) {
    const size = png.readUInt32BE(offset);
    if (png.toString("ascii", offset + 4, offset + 8) === "IDAT")
      chunks.push(png.subarray(offset + 8, offset + 8 + size));
    offset += size + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks)),
    stride = 192 * 4,
    out = Buffer.alloc(stride * 128);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < stride; x++) {
      const filter = raw[y * (stride + 1)],
        a = x >= 4 ? out[y * stride + x - 4] : 0,
        b = y ? out[(y - 1) * stride + x] : 0,
        c = x >= 4 && y ? out[(y - 1) * stride + x - 4] : 0;
      const p = a + b - c,
        pa = Math.abs(p - a),
        pb = Math.abs(p - b),
        pc = Math.abs(p - c);
      const predictor = [
        0,
        a,
        b,
        Math.floor((a + b) / 2),
        pa <= pb && pa <= pc ? a : pb <= pc ? b : c,
      ][filter];
      if (predictor === undefined) throw new Error("Invalid PNG filter");
      out[y * stride + x] = (raw[y * (stride + 1) + x + 1] + predictor) & 255;
    }
  return out;
}
test("24 committed frames have valid pixels, transparent gutters, binary alpha and stable grips", () => {
  const pixels = atlasPixels();
  const meta = JSON.parse(
    readFileSync("public/assets/characters/weapon-evolution.json", "utf8"),
  );
  expect(meta.frames).toHaveLength(24);
  const hashes = new Set();
  const silhouettes = new Map<string, Set<string>>();
  for (const frame of meta.frames) {
    const cell = Buffer.alloc(32 * 32 * 4),
      [ox, oy] = frame.rect;
    const silhouette = Buffer.alloc(32 * 32);
    let visible = 0;
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const source = ((oy + y) * 192 + ox + x) * 4,
          target = (y * 32 + x) * 4;
        pixels.copy(cell, target, source, source + 4);
        const alpha = cell[target + 3];
        silhouette[y * 32 + x] = alpha;
        expect([0, 255]).toContain(alpha);
        if (alpha) {
          visible++;
          expect(meta.palette[frame.family]).toContain(
            "#" + cell.subarray(target, target + 3).toString("hex"),
          );
        }
        if (x === 0 || y === 0 || x === 31 || y === 31) expect(alpha).toBe(0);
      }
    expect(visible).toBeGreaterThan(40);
    expect(cell[(24 * 32 + 16) * 4 + 3]).toBe(255);
    const hash = createHash("sha256").update(cell).digest("hex");
    expect(hash).toBe(frame.sha256);
    hashes.add(hash);
    const familySilhouettes =
      silhouettes.get(frame.family) ?? new Set<string>();
    familySilhouettes.add(
      createHash("sha256").update(silhouette).digest("hex"),
    );
    silhouettes.set(frame.family, familySilhouettes);
    expect(frame.frame).toBe(
      WEAPON_FAMILIES.indexOf(frame.family) * 6 + frame.tier,
    );
    expect(
      readFileSync(
        `art/weapon-evolution/${frame.family}-${frame.tier}.svg`,
        "utf8",
      ),
    ).toContain('shape-rendering="crispEdges"');
  }
  expect(hashes.size).toBe(24);
  for (const silhouettesOfFamily of silhouettes.values())
    expect(silhouettesOfFamily.size).toBe(6);
  expect(readFileSync("public/sw.js", "utf8")).toContain(
    '"/assets/characters/weapon-evolution.png"',
  );
});
