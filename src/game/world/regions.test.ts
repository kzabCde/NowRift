import "fake-indexeddb/auto";
import { beforeEach, expect, test } from "vitest";
import { STAGES, WORLDS } from "../campaign/content";
import {
  profileRepository as repo,
  resetClientSelectionForTests,
} from "../persistence/repository";
import { transact } from "../persistence/storage";
import { CITY, npcPosition } from "./city";
import { move, nearest, validPosition } from "./content";
import { regionalCity, cityBounds } from "./regional-city";
import {
  REGIONS,
  REGION_IDS,
  regionForWorld,
  regionAccessReason,
} from "./regions";
import { allWaypoints, waypointLanding, waypointRegion } from "./waypoints";
import { defaultWorld, migrateWorld, validWorld } from "./save";
import {
  currentRegion,
  defaultExploration,
  emptyFog,
  fogGrid,
  fogState,
  mergeFog,
  projectPoint,
  revealFog,
  unprojectPoint,
  validExploration,
  validFog,
} from "./exploration";
import { translateText } from "../../i18n/translator";
import { REGIONAL_QUESTS } from "../quests/regional-content";
import { QUEST_CATALOG } from "../quests/catalog";
import { createJournal } from "../quests/engine";
import { trackedQuestRegion } from "./map";
import { regionalTerrain } from "./regional-terrain";
import { missionFixture, playMission } from "../story/testing/driver";

beforeEach(async () => {
  resetClientSelectionForTests();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("nowrift-campaign");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Open database"));
  });
});
test("world quest markers follow physical givers and local objectives instead of chapter labels", () => {
  const journal = createJournal(QUEST_CATALOG);
  journal.tracked = "main-frozen-5";
  journal.quests[journal.tracked].status = "READY_TO_CLAIM";
  expect(trackedQuestRegion(journal)).toBe("central");
  const regional = REGIONAL_QUESTS.find((q) => q.chapterId === "frozen")!;
  journal.tracked = regional.id;
  journal.quests[regional.id].status = "READY_TO_CLAIM";
  expect(trackedQuestRegion(journal)).toBe("north");
  journal.quests[regional.id].status = "ACTIVE";
  expect(trackedQuestRegion(journal)).toBe("north");
  journal.quests[regional.id].rewardClaimed = true;
  expect(trackedQuestRegion(journal)).toBeNull();
  journal.tracked = "main-forest-1";
  journal.quests[journal.tracked].status = "ACTIVE";
  expect(trackedQuestRegion(journal)).toBe("south");
});
test.each(["north", "northeast", "south"] as const)(
  "%s: every water tile matches its physical boundary and bridges leave a dry crossing",
  (region) => {
    const city = regionalCity(region),
      terrain = regionalTerrain(city, region);
    for (const rectangle of [...city.water, ...city.bridges])
      for (const value of [rectangle.x, rectangle.y, rectangle.w, rectangle.h])
        expect(value % 32).toBe(0);
    for (let row = 0; row < city.rows; row++)
      for (let column = 0; column < city.columns; column++) {
        const p = { x: column * 32 + 16, y: row * 32 + 16 },
          contains = (s: { x: number; y: number; w: number; h: number }) =>
            p.x >= s.x && p.x < s.x + s.w && p.y >= s.y && p.y < s.y + s.h;
        const water = city.water.some(contains) && !city.bridges.some(contains);
        expect(Math.floor(terrain.layers.ground[row][column] / 4) === 8).toBe(
          water,
        );
      }
    for (const bridge of city.bridges)
      expect(
        validPosition(
          { x: bridge.x + bridge.w / 2, y: bridge.y + bridge.h / 2 },
          region,
        ),
      ).toBe(true);
  },
);
test("regional geography maps the four original bosses without changing forty stage IDs or unlock order", () => {
  expect(REGIONS.map((r) => [r.id, r.bossStage])).toEqual([
    ["north", "frozen-5"],
    ["northeast", "desert-5"],
    ["central", "infernal-5"],
    ["south", "forest-5"],
  ]);
  expect(WORLDS.map((w) => w.id)).toEqual([
    "forest",
    "desert",
    "frozen",
    "infernal",
  ]);
  expect(STAGES).toHaveLength(40);
  for (const w of WORLDS)
    expect(regionForWorld(w.id).bossStage).toBe(`${w.id}-5`);
  expect(regionAccessReason("central", [])).toBeNull();
  expect(regionAccessReason("south", [])).toBeNull();
  expect(regionAccessReason("north", [])).not.toBeNull();
  expect(regionalCity("central")).toBe(CITY);
});
test.each(REGION_IDS)(
  "%s: all entrances, district beacons, physical water and NPC lanes are navigable",
  (region) => {
    const city = regionalCity(region),
      bounds = cityBounds(region),
      step = 16;
    expect(validPosition(bounds.spawn, region)).toBe(true);
    expect(validPosition(bounds.return, region)).toBe(true);
    const start = {
      x: Math.round(bounds.spawn.x / step) * step,
      y: Math.round(bounds.spawn.y / step) * step,
    };
    const queue = [start],
      seen = new Set([`${start.x},${start.y}`]);
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i];
      for (const [dx, dy] of [
        [step, 0],
        [-step, 0],
        [0, step],
        [0, -step],
      ]) {
        const n = { x: p.x + dx, y: p.y + dy },
          key = `${n.x},${n.y}`;
        if (!seen.has(key) && validPosition(n, region)) {
          seen.add(key);
          queue.push(n);
        }
      }
    }
    for (const l of city.landmarks) {
      expect(validPosition(l.entrance, region), l.id + " blocked").toBe(true);
      expect(
        queue.some(
          (p) => Math.hypot(p.x - l.entrance.x, p.y - l.entrance.y) < 24,
        ),
        l.id + " unreachable",
      ).toBe(true);
      expect(nearest(l.entrance, region)?.id).toBe(l.id);
    }
    for (const w of city.waypoints) {
      expect(waypointRegion(w.id)).toBe(region);
      expect(waypointLanding(w), w.id).toEqual(w.spawn);
    }
    for (const s of city.water)
      expect(
        validPosition({ x: s.x + s.w / 2, y: s.y + s.h / 2 }, region),
      ).toBe(false);
    for (const npc of city.npcs)
      for (const time of [0, 300_000, 312_000, 600_000, 900_000])
        expect(
          validPosition(npcPosition(npc, time), region),
          npc.id + " lane",
        ).toBe(true);
    const p = { ...bounds.spawn };
    for (let i = 0; i < 500; i++)
      Object.assign(p, move(p, -1, -1, 0.05, 180, region));
    expect(validPosition(p, region)).toBe(true);
    for (const kind of [
      "blacksmith",
      "merchant",
      "wardrobe",
      "crafting",
      "quest-board",
      "guild",
      "portal",
      "storage",
      "rest",
    ])
      expect(city.landmarks.some((l) => l.kind === kind)).toBe(true);
  },
);
test("compact discovery is monotonic, versioned, region-scoped and independent of camera scale", () => {
  for (const region of REGION_IDS) {
    const b = cityBounds(region),
      empty = emptyFog(region),
      a = revealFog(empty, region, b.spawn),
      other = { x: 120, y: 120 };
    expect(validFog(a, region)).toBe(true);
    expect(fogState(a, region, b.spawn, b.spawn)).toBe("visible");
    expect(fogState(a, region, b.spawn, null)).toBe("explored");
    expect(fogState(a, region, other, null)).toBe("undiscovered");
    const merged = mergeFog(a, revealFog(empty, region, other), region);
    expect(mergeFog(merged, a, region)).toBe(merged);
    expect(validFog(merged + "0", region)).toBe(false);
    expect(() => mergeFog(merged, "garbage", region)).toThrow();
    const view = { width: 320, height: 220 },
      p = { x: b.width * 0.72, y: b.height * 0.19 };
    const back = unprojectPoint(projectPoint(p, b, view), b, view);
    expect(back.x).toBeCloseTo(p.x);
    expect(back.y).toBeCloseTo(p.y);
    expect(empty.length).toBe(fogGrid(region).digits);
  }
  const s = defaultExploration(CITY.spawn);
  expect(validExploration(s)).toBe(true);
  expect(validExploration({ ...s, schema: 99 })).toBe(false);
  expect(validExploration({ ...s, explored: { central: "ff" } })).toBe(false);
});
test("legacy navigation migration preserves valid coordinates and old unlocks without rewards; it is idempotent", () => {
  const old = defaultWorld();
  delete old.atlas;
  old.position = { ...CITY.return };
  old.waypoints.push("guild");
  old.discoveries.push("guild");
  const next = migrateWorld(old)!;
  expect(next.position).toEqual(old.position);
  expect(next.waypoints).toEqual(old.waypoints);
  expect(next.discoveries).toEqual(old.discoveries);
  expect(next.atlas?.region).toBe("central");
  expect(migrateWorld(next)).toEqual(next);
  expect(validWorld(next)).toBe(true);
  expect(
    migrateWorld({ ...next, atlas: { ...next.atlas, region: "invented" } }),
  ).toBeNull();
});
test("first regional journeys require a physical Gate, campaign access and current writer/arrival; discovered travel persists without changing the character", async () => {
  let p = await repo.load();
  p.clears = STAGES.map((s) => s.id + ":normal");
  await transact((_, store) => {
    store.put(p, "profile");
  });
  p = await repo.world(p.local.id, { type: "enter", writer: "atlas-test" });
  const character = {
    xp: p.xp,
    gold: p.gold,
    rpg: structuredClone(p.rpg),
    clears: [...p.clears],
    character: p.local.character,
  };
  await expect(
    repo.world(p.local.id, {
      type: "fast-travel",
      writer: "atlas-test",
      waypointId: "north-plaza",
      viaGate: true,
      expectedEpoch: 0,
    }),
  ).rejects.toThrow("Gate");
  for (const region of ["south", "northeast", "north", "central"] as const) {
    const origin = regionalCity(currentRegion(p.local.world)),
      gate = origin.landmarks.find((l) => l.kind === "portal")!;
    p = await repo.world(p.local.id, {
      type: "visit",
      writer: "atlas-test",
      id: gate.id,
      position: gate.entrance,
    });
    const epoch = p.local.world!.positionEpoch,
      target = region === "central" ? "plaza" : `${region}-plaza`;
    p = await repo.world(p.local.id, {
      type: "fast-travel",
      writer: "atlas-test",
      waypointId: target,
      viaGate: true,
      expectedEpoch: epoch,
    });
    expect(currentRegion(p.local.world)).toBe(region);
    expect(validPosition(p.local.world!.position, region)).toBe(true);
    expect(p.local.world!.waypoints).toContain(target);
    expect(p.xp).toBe(character.xp);
    expect(p.gold).toBe(character.gold);
    expect(p.rpg).toEqual(character.rpg);
    expect(p.clears).toEqual(character.clears);
    expect(p.local.character).toBe(character.character);
    const position = { ...p.local.world!.position };
    p = await repo.world(p.local.id, {
      type: "position",
      writer: "atlas-test",
      position: CITY.spawn,
      epoch,
      sequence: 999,
    });
    expect(p.local.world!.position).toEqual(position);
    expect((await repo.load()).local.world).toEqual(p.local.world);
  }
  p = await repo.world(p.local.id, {
    type: "fast-travel",
    writer: "atlas-test",
    waypointId: "north-plaza",
    expectedEpoch: p.local.world!.positionEpoch,
  });
  expect(currentRegion(p.local.world)).toBe("north");
  expect(allWaypoints()).toHaveLength(30);
});
test("locked regional entry and unknown map destinations reject atomically", async () => {
  let p = await repo.load();
  p = await repo.world(p.local.id, { type: "enter", writer: "atlas-test" });
  const gate = regionalCity("central").landmarks.find(
    (l) => l.kind === "portal",
  )!;
  p = await repo.world(p.local.id, {
    type: "visit",
    writer: "atlas-test",
    id: gate.id,
    position: gate.entrance,
  });
  const before = structuredClone(p);
  await expect(
    repo.world(p.local.id, {
      type: "fast-travel",
      writer: "atlas-test",
      waypointId: "north-plaza",
      viaGate: true,
      expectedEpoch: 0,
    }),
  ).rejects.toThrow();
  await expect(
    repo.world(p.local.id, {
      type: "mark-location",
      writer: "atlas-test",
      expectedEpoch: 0,
      destination: { region: "north", landmarkId: "unknown" },
    }),
  ).rejects.toThrow();
  expect(await repo.load()).toEqual(before);
});
test("regional names, service signs, architecture and lore resolve in Thai", () => {
  for (const r of REGIONS) {
    for (const source of [
      r.name,
      r.capital,
      r.story,
      r.architecture,
      ...r.districts,
      ...regionalCity(r.id).landmarks.map((l) => l.name),
      ...regionalCity(r.id).districts.flatMap((d) => [
        d.name,
        d.loreTitle,
        d.lore,
        ...d.motifs,
      ]),
    ]) {
      expect(translateText("th", source), source).not.toBe(source);
    }
  }
});
test.each(REGION_IDS)(
  "%s investigation uses a real local giver, material delivery and verified guardian settlement; claims cannot duplicate",
  async (region) => {
    let p = await repo.load();
    p.clears = STAGES.map((s) => s.id + ":normal");
    for (const id of ["wood", "ancient-shard", "frost-crystal", "obsidian"])
      p.materials[id] = 10;
    await transact((_, s) => {
      s.put(p, "profile");
    });
    p = await repo.world(p.local.id, {
      type: "enter",
      writer: "regional-quest",
    });
    if (region !== "central") {
      const gate = regionalCity("central").landmarks.find(
        (l) => l.kind === "portal",
      )!;
      p = await repo.world(p.local.id, {
        type: "visit",
        writer: "regional-quest",
        id: gate.id,
        position: gate.entrance,
      });
      p = await repo.world(p.local.id, {
        type: "fast-travel",
        writer: "regional-quest",
        waypointId: region + "-plaza",
        viaGate: true,
        expectedEpoch: p.local.world!.positionEpoch,
      });
    }
    const d = REGIONAL_QUESTS.find(
        (q) => q.giver === (region === "central" ? "guild" : region + "-guild"),
      )!,
      giver = regionalCity(region).landmarks.find((l) => l.id === d.giver)!,
      epoch = p.local.world!.positionEpoch;
    const atGiver = {
      questId: d.id,
      writer: "regional-quest",
      epoch,
      position: giver.entrance,
    };
    p = await repo.quest(p.local.id, { ...atGiver, type: "accept" });
    const record = regionalCity(region).landmarks.find(
      (l) => l.id === d.objectives[0].target,
    )!;
    p = await repo.world(p.local.id, {
      type: "visit",
      writer: "regional-quest",
      id: record.id,
      position: record.entrance,
    });
    const material = d.objectives[1].target,
      before = p.materials[material];
    p = await repo.quest(p.local.id, {
      ...atGiver,
      type: "deliver",
      objectiveId: d.objectives[1].id,
    });
    expect(p.materials[material]).toBe(before - 3);
    await expect(
      repo.quest(p.local.id, { ...atGiver, type: "claim" }),
    ).rejects.toThrow("Complete");
    const { g, selection } = missionFixture(d.objectives[2].target),
      prepared = await repo.beginRun(
        p.local.id,
        false,
        undefined,
        false,
        selection,
      );
    g.id = prepared.run.id;
    const mission = playMission(g);
    p = (
      await repo.settle({
        id: g.id,
        run: prepared.run,
        stageId: selection.stageId,
        difficulty: selection.difficulty,
        seed: selection.seed,
        mode: "story",
        victory: true,
        seconds: g.time,
        enemies: g.campaign!.enemies,
        elites: g.campaign!.elites,
        bosses: 1,
        enemyKills: g.campaign!.enemyKills,
        mission,
      })
    ).progress;
    expect(p.local.journal!.quests[d.id].status).toBe("READY_TO_CLAIM");
    const beforeClaim = {
      gold: p.gold,
      xp: p.xp,
      equipped: structuredClone(p.rpg!.equipped),
    };
    await Promise.all([
      repo.quest(p.local.id, { ...atGiver, type: "claim" }),
      repo.quest(p.local.id, { ...atGiver, type: "claim" }),
    ]);
    p = await repo.load();
    expect(p.gold).toBe(beforeClaim.gold + d.reward.gold);
    expect(p.xp).toBe(beforeClaim.xp + d.reward.xp);
    expect(p.rpg!.equipped).toEqual(beforeClaim.equipped);
    expect(p.local.journal!.quests[d.id].status).toBe("COMPLETED");
    expect(currentRegion(p.local.world)).toBe(region);
  },
);
