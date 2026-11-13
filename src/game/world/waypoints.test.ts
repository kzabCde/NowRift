import "fake-indexeddb/auto";
import { beforeEach, expect, test } from "vitest";
import {
  profileRepository as repo,
  resetClientSelectionForTests,
} from "../persistence/repository";
import { migrateSave } from "../persistence/validation";
import { WAYPOINTS, waypointLanding, fastTravelReason } from "./waypoints";
import { defaultWorld, migrateWorld, validWorld } from "./save";
import { HAVEN, LANDMARKS, validPosition, cityCollision } from "./content";
import { SOLIDS } from "./city";
import legacy from "../rpg/fixtures/six-slot-save.json";

beforeEach(async () => {
  resetClientSelectionForTests();
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase("nowrift-campaign");
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error("Open test database"));
  });
});
async function enter() {
  const p = await repo.load();
  return repo.world(p.local.id, { type: "enter", writer: "waypoint-test" });
}
test("initial waypoints are Plaza and Sanctuary only; every exact registered landing is safe", () => {
  const w = defaultWorld();
  expect(w.waypoints).toEqual(["plaza", "grove"]);
  expect(WAYPOINTS).toHaveLength(9);
  for (const p of WAYPOINTS) {
    expect(waypointLanding(p)).not.toBeNull();
    expect(validPosition(waypointLanding(p))).toBe(true);
    expect(LANDMARKS.find((l) => l.id === p.landmarkId)!.entrance).toEqual(
      p.spawn,
    );
  }
});
test("locked, unknown, stale, foreign-writer and expedition travel cannot mutate the save", async () => {
  const p = await enter(),
    world = structuredClone(p.local.world!);
  for (const command of [
    {
      type: "fast-travel" as const,
      writer: "waypoint-test",
      waypointId: "guild",
      expectedEpoch: 0,
    },
    {
      type: "fast-travel" as const,
      writer: "waypoint-test",
      waypointId: "invented",
      expectedEpoch: 0,
    },
    {
      type: "fast-travel" as const,
      writer: "other-tab",
      waypointId: "plaza",
      expectedEpoch: 0,
    },
    {
      type: "fast-travel" as const,
      writer: "waypoint-test",
      waypointId: "plaza",
      expectedEpoch: 9,
    },
  ])
    await expect(repo.world(p.local.id, command)).rejects.toThrow();
  expect((await repo.load()).local.world).toEqual(world);
  expect(
    fastTravelReason({ ...world, location: "expedition" }, "plaza"),
  ).toContain("Return");
});
test("exploration unlocks every district and all nine fast travels retain the same build, economy and quests", async () => {
  let p = await enter();
  const before = structuredClone(p);
  for (const point of WAYPOINTS) {
    p = await repo.world(p.local.id, {
      type: "visit",
      writer: "waypoint-test",
      id: point.landmarkId,
      position: point.spawn,
    });
    expect(p.local.world!.waypoints).toContain(point.id);
  }
  let epoch = p.local.world!.positionEpoch;
  for (const point of WAYPOINTS) {
    p = await repo.world(p.local.id, {
      type: "fast-travel",
      writer: "waypoint-test",
      waypointId: point.id,
      expectedEpoch: epoch++,
    });
    expect(p.local.world!.position).toEqual(waypointLanding(point));
    expect(p.local.world!.positionEpoch).toBe(epoch);
    expect(p.local.world!.location).toBe("haven");
    expect(p.local.id).toBe(before.local.id);
    expect(p.rpg).toEqual(before.rpg);
    expect(p.gold).toBe(before.gold);
    expect(p.xp).toBe(before.xp);
    expect(p.materials).toEqual(before.materials);
    expect(p.clears).toEqual(before.clears);
    expect(p.local.world!.quest).toBe(before.local.world!.quest);
    expect(p.local.activeRun).toEqual(before.local.activeRun);
  }
  expect((await repo.load()).local.world).toEqual(p.local.world);
});
test("visiting an actual station unlocks its district without requiring a second economy or reward", async () => {
  const p = await enter(),
    forge = LANDMARKS.find((l) => l.id === "forge")!;
  const next = await repo.world(p.local.id, {
    type: "visit",
    writer: "waypoint-test",
    id: forge.id,
    position: forge.entrance,
  });
  expect(next.local.world!.waypoints).toContain("emberforge");
  expect(next.rpg).toEqual(p.rpg);
  expect(next.gold).toBe(p.gold);
});
test("a delayed high-sequence autosave from an old epoch cannot overwrite a committed arrival", async () => {
  const p = await enter(),
    old = structuredClone(p.local.world!);
  const landed = await repo.world(p.local.id, {
    type: "fast-travel",
    writer: "waypoint-test",
    waypointId: "grove",
    expectedEpoch: old.positionEpoch,
  });
  const stale = await repo.world(p.local.id, {
    type: "position",
    writer: "waypoint-test",
    sequence: 999999,
    epoch: old.positionEpoch,
    position: old.position,
  });
  expect(stale.local.world).toEqual(landed.local.world);
  const moved = await repo.world(p.local.id, {
    type: "position",
    writer: "waypoint-test",
    sequence: landed.local.world!.sequence + 1,
    epoch: landed.local.world!.positionEpoch,
    position: HAVEN.spawn,
  });
  expect(moved.local.world!.position).toEqual(HAVEN.spawn);
  await expect(
    repo.world(p.local.id, {
      type: "fast-travel",
      writer: "waypoint-test",
      waypointId: "grove",
      expectedEpoch: old.positionEpoch,
    }),
  ).rejects.toThrow("changed");
});
test("a new session and reload retain the arrival epoch, location and discovery state", async () => {
  const p = await enter();
  const landed = await repo.world(p.local.id, {
    type: "fast-travel",
    writer: "waypoint-test",
    waypointId: "grove",
    expectedEpoch: 0,
  });
  const reentered = await repo.world(p.local.id, {
    type: "enter",
    writer: "new-session",
  });
  expect(reentered.local.world!.positionEpoch).toBe(1);
  expect(reentered.local.world!.position).toEqual(landed.local.world!.position);
  await expect(
    repo.world(p.local.id, {
      type: "position",
      writer: "waypoint-test",
      epoch: 1,
      sequence: 100,
      position: HAVEN.spawn,
    }),
  ).rejects.toThrow("another tab");
});
test("legacy world migration preserves all progression and frozen checkpoints, infers explored waypoints and runs once", () => {
  const value = JSON.parse(JSON.stringify(legacy));
  value.local.world.discoveries = ["forge", "portal"];
  const next = migrateSave(value, value.local.id, value.local.lastPlayed),
    w = next.local.world!;
  expect(w.schema).toBe(2);
  expect(w.layoutRevision).toBe(3);
  expect(w.positionEpoch).toBe(0);
  expect(w.waypoints).toEqual(["plaza", "grove", "emberforge", "gate"]);
  expect(validPosition(w.position)).toBe(true);
  expect(next.gold).toBe(value.gold);
  expect(next.xp).toBe(value.xp);
  expect(next.materials).toEqual(value.materials);
  expect(next.local.checkpoint).toEqual(value.local.checkpoint);
  for (const key of [
    "outfit",
    "hp",
    "writer",
    "sequence",
    "location",
    "tutorial",
    "quest",
    "extractions",
    "discoveries",
    "cacheClaimed",
  ] as const)
    expect(w[key]).toEqual(value.local.world[key]);
  expect(migrateWorld(w)).toBe(w);
  expect(migrateSave(next, next.local.id, next.local.lastPlayed)).toEqual(next);
});
test("invalid waypoint metadata is rejected and unreachable registry coordinates cannot be used for a landing", () => {
  const w = defaultWorld();
  expect(validWorld({ ...w, waypoints: [...w.waypoints, "unknown"] })).toBe(
    false,
  );
  expect(validWorld({ ...w, positionEpoch: -1 })).toBe(false);
  expect(migrateWorld({ ...w, layoutRevision: 99 })).toBeNull();
  expect(
    waypointLanding({ ...WAYPOINTS[0], spawn: { x: -9999, y: -9999 } }),
  ).toBeNull();
});
test("the spatial broad phase preserves all geometry contacts while bounding local collision work", () => {
  let seed = 87;
  for (let i = 0; i < 3000; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const x = (seed / HAVEN.width) % HAVEN.width;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const y = (seed / HAVEN.height) % HAVEN.height;
    const p = { x, y },
      r = HAVEN.radius;
    const expected =
      x >= r &&
      y >= r &&
      x <= HAVEN.width - r &&
      y <= HAVEN.height - r &&
      !SOLIDS.some(
        (s) =>
          x + r > s.x && x - r < s.x + s.w && y + r > s.y && y - r < s.y + s.h,
      );
    expect(validPosition(p)).toBe(expected);
  }
  expect(cityCollision.size).toBeGreaterThan(50);
  expect(cityCollision.near(HAVEN.spawn, 12).size).toBeLessThan(
    SOLIDS.length / 3,
  );
});
