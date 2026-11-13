import { expect, test } from "vitest";
import {
  CITY,
  DISTRICTS,
  cityLighting,
  cityMilestones,
  districtAt,
  npcPosition,
  SOLIDS,
} from "./city";
import { HAVEN, LANDMARKS, validPosition, nearest, move } from "./content";
import map from "../../../public/assets/haven/city-map.json";
import { migrateSave } from "../persistence/validation";
import legacy from "../rpg/fixtures/six-slot-save.json";
import { defaultWorld } from "./save";

function reachable() {
  const step = 16,
    queue = [HAVEN.spawn as { x: number; y: number }],
    seen = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    for (const [x, y] of [
      [p.x + step, p.y],
      [p.x - step, p.y],
      [p.x, p.y + step],
      [p.x, p.y - step],
    ]) {
      const id = key(x, y);
      if (seen.has(id) || !validPosition({ x, y })) continue;
      seen.add(id);
      queue.push({ x, y });
    }
  }
  return queue;
}
test("the authored nine districts have identity, lore, spawns and distinct material contracts", () => {
  expect(DISTRICTS).toHaveLength(9);
  expect(new Set(DISTRICTS.map((d) => d.id)).size).toBe(9);
  for (const district of DISTRICTS) {
    expect(district.motifs.length).toBeGreaterThanOrEqual(3);
    expect(districtAt(district.center).id).toBe(district.id);
    expect(validPosition(district.center), district.id + " spawn").toBe(true);
    expect(district.lore.length).toBeGreaterThan(60);
    expect(
      LANDMARKS.some((l) => l.district === district.id && l.kind === "lore"),
    ).toBe(true);
  }
});
test("every district and every functional entrance is connected by actual walkable geometry", () => {
  const paths = reachable();
  expect(validPosition(HAVEN.return)).toBe(true);
  for (const target of [
    ...LANDMARKS.map((l) => ({ id: l.id, ...l.entrance })),
    ...CITY.spawns,
  ]) {
    expect(validPosition(target), target.id + " entrance is blocked").toBe(
      true,
    );
    expect(
      paths.some((p) => Math.hypot(p.x - target.x, p.y - target.y) < 24),
      target.id + " unreachable",
    ).toBe(true);
  }
  expect(paths.length).toBeGreaterThan(5000);
});
test("visible rivers block movement, visible bridges connect both banks and rails keep their gates open", () => {
  for (const water of CITY.water)
    expect(
      validPosition({ x: water.x + water.w / 2, y: water.y + water.h / 2 }),
    ).toBe(false);
  for (const bridge of CITY.bridges) {
    const y = bridge.y + bridge.h / 2;
    for (let x = bridge.x - 16; x <= bridge.x + bridge.w + 16; x += 8)
      expect(validPosition({ x, y }), `bridge ${x},${y}`).toBe(true);
  }
  const training = LANDMARKS.find((l) => l.id === "training")!;
  const p = { ...LANDMARKS.find((l) => l.id === "forge")!.entrance };
  expect(validPosition(training.entrance)).toBe(true);
  for (let i = 0; i < 100; i++) Object.assign(p, move(p, 0, -1, 0.05));
  const forge = LANDMARKS.find((l) => l.id === "forge")!.solid!;
  expect(p.y).toBeGreaterThanOrEqual(forge.y + forge.h + HAVEN.radius);
});
test("the new layouts retain every historical discovery ID and use spatially bounded affordances", () => {
  for (const id of [
    "forge",
    "workshop",
    "wardrobe",
    "market",
    "inn",
    "store",
    "mara",
    "board",
    "portal",
    "training",
    "cache",
  ])
    expect(LANDMARKS.some((l) => l.id === id)).toBe(true);
  for (const l of LANDMARKS)
    expect(nearest(l.entrance)?.id, l.id + " has an ambiguous entrance").toBe(
      l.id,
    );
  expect(nearest({ x: 1800, y: 200 })).toBeNull();
});
test("the cosmetic day clock and occupation schedules are deterministic and stay on navigable ground", () => {
  expect(cityLighting(300_000).night).toBe(false);
  expect(cityLighting(900_000).night).toBe(true);
  expect(cityLighting(300_000)).toEqual(cityLighting(1_500_000));
  for (const npc of CITY.npcs)
    for (let t = 0; t < 1_200_000; t += 4500) {
      const p = npcPosition(npc, t);
      expect(validPosition(p), `${npc.id} at ${t}: ${p.x},${p.y}`).toBe(true);
      expect(npcPosition(npc, t)).toEqual(p);
    }
});
test("ground, terrain, structural, foreground and collision tile layers share one exact grid", () => {
  expect(Object.keys(map.layers)).toEqual([
    "ground",
    "terrain",
    "structures",
    "foreground",
    "collision",
  ]);
  expect(map.columns * map.tileSize * map.scale).toBe(HAVEN.width);
  expect(map.rows * map.tileSize * map.scale).toBe(HAVEN.height);
  for (const rows of Object.values(map.layers)) {
    expect(rows).toHaveLength(map.rows);
    for (const row of rows) {
      expect(row).toHaveLength(map.columns);
      expect(row.every((i) => Number.isInteger(i) && i >= -1 && i < 80)).toBe(
        true,
      );
    }
  }
  expect(SOLIDS.every((s) => s.w > 0 && s.h > 0)).toBe(true);
});
test("a save stranded by the new visible geometry relocates only its position, without resetting progression or checkpoints", () => {
  const value = JSON.parse(JSON.stringify(legacy));
  value.local.world = defaultWorld();
  const current = migrateSave(value, value.local.id, value.local.lastPlayed);
  const stranded = structuredClone(current);
  stranded.local.world!.position = { x: -100, y: 5 };
  expect(validPosition(stranded.local.world!.position)).toBe(false);
  const restored = migrateSave(
    stranded,
    stranded.local.id,
    stranded.local.lastPlayed,
  );
  expect(restored).toEqual({
    ...current,
    local: {
      ...current.local,
      world: { ...current.local.world, position: HAVEN.spawn },
    },
  });
  expect(
    migrateSave(restored, restored.local.id, restored.local.lastPlayed),
  ).toEqual(restored);
});
test("visual milestones derive solely from actual clear, extraction, quest and cache persistence", () => {
  expect(cityMilestones({ clears: [] })).toEqual({
    guardians: 0,
    extractions: 0,
    questClaimed: false,
    cacheClaimed: false,
  });
  expect(
    cityMilestones({
      clears: ["forest-5:normal", "desert-5:normal", "frozen-5:hard"],
      local: {
        world: { extractions: 3, quest: "claimed", cacheClaimed: true },
      },
    }),
  ).toEqual({
    guardians: 2,
    extractions: 3,
    questClaimed: true,
    cacheClaimed: true,
  });
});
