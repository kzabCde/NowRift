import "fake-indexeddb/auto";
import { beforeEach, expect, test } from "vitest";
import {
  profileRepository as repo,
  resetClientSelectionForTests,
} from "../persistence/repository";
import { transact } from "../persistence/storage";
import {
  captureCheckpoint,
  restoreCheckpoint,
  validCheckpoint,
} from "../persistence/checkpoint";
import { advanceGame, snapshot } from "../engine";
import { loadStage } from "../campaign/loader";
import { STAGES, stageById } from "../campaign/content";
import {
  emptyFog,
  mergeFog,
  currentRegion,
  revealFog,
  validFog,
  rememberWilderness,
} from "./exploration";
import { regionalCity, cityBounds } from "./regional-city";
import { connectedArea } from "./measure";

beforeEach(async () => {
  resetClientSelectionForTests();
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase("nowrift-campaign");
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
});
test("wilderness markers use real field positions, harvesting state and facing; navigation never fabricates progress", () => {
  const stage = stageById("forest-1"),
    selection = {
      stageId: stage.id,
      difficulty: "normal" as const,
      seed: stage.environment.seed,
      clears: [],
      activity: "farming" as const,
      mode: "free" as const,
    },
    g = loadStage(selection);
  g.enemies = [];
  g.spawnCooldown = 999;
  const first = snapshot(g).navigation!;
  expect(first.region).toBe("south");
  expect(first.position).toEqual({ x: g.player.x, y: g.player.y });
  expect(first.markers.find((m) => m.id === "fallen-wood")).toMatchObject({
    x: 710,
    y: 700,
    complete: false,
  });
  const before = {
    kills: g.kills,
    gold: g.gold,
    xp: g.xp,
    harvested: [...g.campaign!.harvested!],
  };
  g.campaign!.mapTarget = "fallen-wood";
  for (let i = 0; i < 100; i++) advanceGame(g, 0.05, 1, 0);
  const next = snapshot(g).navigation!;
  expect(next.facing).toBe("right");
  expect(next.explored).not.toBe(first.explored);
  expect(mergeFog(first.explored, next.explored, "south", "wilderness")).toBe(
    next.explored,
  );
  expect(next.target).toBe("fallen-wood");
  expect({
    kills: g.kills,
    gold: g.gold,
    xp: g.xp,
    harvested: g.campaign!.harvested,
  }).toEqual(before);
  g.campaign!.harvested!.push("fallen-wood");
  expect(
    snapshot(g).navigation!.markers.find((m) => m.id === "fallen-wood")!
      .complete,
  ).toBe(true);
});
test("field discovery and guidance survive a checkpoint, reject corrupt bitsets, persist the canonical region and return to the originating city", async () => {
  let p = await repo.load();
  p.clears = STAGES.map((s) => s.id + ":normal");
  await transact((_, s) => {
    s.put(p, "profile");
  });
  p = await repo.world(p.local.id, { type: "enter", writer: "field-map" });
  const gate = regionalCity("central").landmarks.find(
    (l) => l.kind === "portal",
  )!;
  p = await repo.world(p.local.id, {
    type: "visit",
    writer: "field-map",
    id: gate.id,
    position: gate.entrance,
  });
  p = await repo.world(p.local.id, {
    type: "fast-travel",
    writer: "field-map",
    waypointId: "north-plaza",
    expectedEpoch: 0,
    viaGate: true,
  });
  const northGate = regionalCity("north").landmarks.find(
    (l) => l.kind === "portal",
  )!;
  p = await repo.world(p.local.id, {
    type: "visit",
    writer: "field-map",
    id: northGate.id,
    position: northGate.entrance,
  });
  p = await repo.world(p.local.id, { type: "travel", writer: "field-map" });
  const character = {
    rpg: structuredClone(p.rpg),
    clears: [...p.clears],
    gold: p.gold,
    xp: p.xp,
  };
  const stage = stageById("forest-1"),
    selection = {
      stageId: stage.id,
      difficulty: "normal" as const,
      seed: stage.environment.seed,
      clears: p.clears,
      activity: "farming" as const,
      mode: "free" as const,
    },
    prepared = await repo.beginRun(
      p.local.id,
      false,
      undefined,
      false,
      selection,
    ),
    g = loadStage(selection);
  g.id = prepared.run.id;
  g.enemies = [];
  g.spawnCooldown = 999;
  g.campaign!.mapTarget = "fallen-wood";
  for (let i = 0; i < 80; i++) advanceGame(g, 0.05, 1, 0);
  const cp = captureCheckpoint(
    g,
    { ...prepared.run, sequence: 1 },
    selection.seed,
    selection,
  );
  expect(validCheckpoint(cp)).toBe(true);
  p = await repo.checkpoint(cp);
  expect(p.local.world!.atlas!.wilderness?.south?.explored).toBe(
    g.campaign!.explored,
  );
  expect(currentRegion(p.local.world)).toBe("north");
  const restored = restoreCheckpoint(cp);
  expect(snapshot(restored).navigation!.explored).toBe(g.campaign!.explored);
  expect(restored.campaign!.mapTarget).toBe("fallen-wood");
  const corrupt = structuredClone(cp);
  corrupt.environment!.explored = "invalid";
  expect(validCheckpoint(corrupt)).toBe(false);
  await expect(repo.checkpoint(corrupt)).rejects.toThrow();
  const legacy = structuredClone(cp);
  delete legacy.environment!.explored;
  delete legacy.environment!.mapTarget;
  expect(validCheckpoint(legacy)).toBe(true);
  p = (
    await repo.settle({
      id: g.id,
      run: prepared.run,
      stageId: selection.stageId,
      difficulty: "normal",
      seed: selection.seed,
      mode: "free",
      activity: "farming",
      harvested: [],
      victory: false,
      seconds: g.time,
      enemies: 0,
      elites: 0,
      bosses: 0,
      hp: g.player.hp,
      enemyKills: {},
      explored: g.campaign!.explored,
    })
  ).progress;
  expect(currentRegion(p.local.world)).toBe("north");
  expect(p.local.world!.position).toEqual(cityBounds("north").return);
  expect(p.local.world!.location).toBe("haven");
  const returned = { ...p.local.world!.position },
    departureEpoch = p.local.world!.positionEpoch;
  p = await repo.world(p.local.id, {
    type: "position",
    writer: "field-map",
    sequence: 999,
    epoch: departureEpoch - 1,
    position: regionalCity("north").spawn,
  });
  expect(p.local.world!.position).toEqual(returned);
  expect({
    ...p.rpg,
    history: character.rpg!.history,
    revision: character.rpg!.revision,
  }).toEqual(character.rpg);
  expect(p.rpg!.history).toHaveLength(character.rpg!.history.length + 1);
  expect(p.rpg!.revision).toBe(character.rpg!.revision + 1);
  expect(p.clears).toEqual(character.clears);
  expect(p.gold).toBe(character.gold);
  expect(p.xp).toBe(character.xp);
  const memory = p.local.world!.atlas!.wilderness!.south!;
  rememberWilderness(
    p.local.world,
    { ...selection, seed: selection.seed + 1 },
    emptyFog("south", "wilderness"),
  );
  expect(p.local.world!.atlas!.wilderness!.south).toEqual(memory);
  const replay = loadStage({ ...selection, mapExplored: memory.explored });
  expect(replay.campaign!.explored).toBe(memory.explored);
});
test("city and wilderness grids cannot be confused, and area accounting excludes an inaccessible island", () => {
  const fog = revealFog(
    emptyFog("south", "wilderness"),
    "south",
    { x: 900, y: 700 },
    "wilderness",
  );
  expect(validFog(fog, "south", "wilderness")).toBe(true);
  expect(validFog(fog, "south")).toBe(false);
  const area = connectedArea(
    { width: 100, height: 100 },
    { x: 5, y: 5 },
    (c) => !(c.x < 60 && c.x + c.w > 40),
    10,
  );
  expect(area.reachableArea).toBe(4000);
  expect(area.grossArea).toBe(10000);
});
