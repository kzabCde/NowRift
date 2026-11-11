import "fake-indexeddb/auto";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { preferences } from "../persistence/preferences";
import { flowReducer, initialFlow } from "./flow";
import { characterName } from "../persistence/identity";
import {
  profileRepository as repo,
  resetClientSelectionForTests,
} from "../persistence/repository";
import { transact } from "../persistence/storage";
import { HAVEN } from "../world/content";
import { initializeRpg } from "../rpg/profile";
import { emptyProgress } from "../campaign/progression";
import { calculateStats } from "../rpg/stats";
import { ACTIVITIES } from "../world/activities";
import { LANDMARKS } from "../world/content";
import { journeyTh } from "../../i18n/dictionaries/journey-th";
import { translate } from "../../i18n/translator";
beforeEach(async () => {
  resetClientSelectionForTests();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("nowrift-campaign");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Open test database"));
  });
});
const identity = (id = "character-identity-0001") => ({
  id,
  name: "  นักเดินทาง  ",
  character: "sentinel" as const,
  outfit: "tide" as const,
});
afterEach(() => vi.restoreAllMocks());
test("entry inspection never creates a character on fresh storage", async () => {
  expect(await repo.entryView()).toBeNull();
  expect(await transact((records) => [...records.keys()])).toEqual([]);
});
test("first identity creates exactly one canonical slot with real starting build", async () => {
  const p = await repo.createCharacter(identity()),
    v = (await repo.entryView())!;
  expect(v.slots).toHaveLength(1);
  expect(v.player.activeSlotId).toBe(p.local.id);
  expect(p.local.name).toBe("นักเดินทาง");
  expect(p.local.world!.outfit).toBe("tide");
  expect(p.local.world!.hp).toBe(
    calculateStats(initializeRpg(emptyProgress()), "arcane", "sentinel").maxHp,
  );
  expect(p.local.world!.position).toEqual(HAVEN.spawn);
  expect((await repo.load()).rpg).toEqual(p.rpg);
});
test("duplicate and concurrent confirmations cannot duplicate a slot or its starter equipment", async () => {
  const [a, b] = await Promise.all([
    repo.createCharacter(identity()),
    repo.createCharacter(identity()),
  ]);
  expect(a.local.id).toBe(b.local.id);
  expect(a.rpg).toEqual(b.rpg);
  expect((await repo.view()).slots).toHaveLength(1);
  await repo.createCharacter(identity("character-identity-0002"));
  await repo.createCharacter(identity());
  expect((await repo.view()).player.activeSlotId).toBe(a.local.id);
  expect((await repo.view()).slots).toHaveLength(2);
  await expect(
    repo.createCharacter({ ...identity(), name: "Different" }),
  ).rejects.toThrow("another tab");
});
test("score-only legacy installations retain their existing best score during character creation", async () => {
  vi.spyOn(preferences, "get").mockImplementation((key) =>
    key === "nowrift-phase1-best-kills" ? "42" : null,
  );
  const p = await repo.createCharacter(identity());
  expect(p.local.stats.bestKills).toBe(42);
});
test("existing legacy progress is preserved and never claimed by new onboarding", async () => {
  const old = await repo.load();
  await transact((_records, store) => {
    old.gold = 321;
    old.clears = ["forest-1:normal"];
    store.put(old, "profile");
  });
  const created = await repo.createCharacter(identity());
  expect(created.local.id).not.toBe(old.local.id);
  const restored = await repo.load(old.local.id);
  expect(restored.gold).toBe(321);
  expect(restored.clears).toEqual(old.clears);
  expect(restored.rpg).toEqual(old.rpg);
});
test("three-slot capacity is enforced atomically under concurrent creation", async () => {
  await repo.createCharacter(identity());
  const outcomes = await Promise.allSettled(
    [2, 3, 4].map((n) =>
      repo.createCharacter(identity("character-identity-000" + n)),
    ),
  );
  expect(outcomes.filter((x) => x.status === "fulfilled")).toHaveLength(2);
  expect((await repo.view()).slots).toHaveLength(3);
});
test("invalid names, controls, bidi and broken identities never create data", async () => {
  for (const value of [
    " ",
    "a".repeat(25),
    "name\u0000",
    "name\u202e",
    "\ud800",
    "!!!",
    "\u0301",
  ]) {
    expect(() => characterName(value)).toThrow();
    await expect(
      repo.createCharacter({ ...identity(), name: value }),
    ).rejects.toThrow();
  }
  expect(characterName("  Élan  ")).toBe("Élan");
  expect(characterName("E\u0301lan")).toBe("Élan");
  expect(await repo.entryView()).toBeNull();
});
test("damaged roots and orphan slots are preserved and block new identities", async () => {
  await transact((_records, store) =>
    store.put({ retained: true }, "slot:orphan"),
  );
  await expect(repo.entryView()).rejects.toThrow("preserved");
  await expect(repo.createCharacter(identity())).rejects.toThrow("preserved");
  expect(await transact((records) => records.get("slot:orphan"))).toEqual({
    retained: true,
  });
});
test("blocked or absent city coordinates recover only position", async () => {
  const p = await repo.createCharacter(identity());
  for (const position of [{ x: 370, y: 400 }, { x: -1, y: 5 }, null]) {
    await transact((_records, store) =>
      store.put(
        { ...p, local: { ...p.local, world: { ...p.local.world, position } } },
        "profile",
      ),
    );
    const next = await repo.load(p.local.id);
    expect(next.local.world!.position).toEqual(HAVEN.spawn);
    expect(next.rpg).toEqual(p.rpg);
    expect(next.local.world!.outfit).toBe("tide");
  }
});
test("typed transitions reject a second operation and stale completion", () => {
  let flow = flowReducer(initialFlow, {
    type: "navigate",
    screen: "characters",
  });
  flow = flowReducer(flow, { type: "prepare", target: "haven", id: 1 });
  expect(flowReducer(flow, { type: "prepare", target: "game", id: 2 })).toBe(
    flow,
  );
  expect(flowReducer(flow, { type: "navigate", screen: "lobby" })).toBe(flow);
  expect(flowReducer(flow, { type: "commit", id: 2 })).toBe(flow);
  flow = flowReducer(flow, { type: "fail", id: 1 });
  expect(flow.screen).toBe("characters");
  expect(flowReducer(flow, { type: "prepare", target: "game", id: 1 })).toBe(
    flow,
  );
  flow = flowReducer(flow, { type: "prepare", target: "haven", id: 3 });
  expect(flowReducer(flow, { type: "commit", id: 3 }).screen).toBe("haven");
});
test("legacy city style commands cannot bypass owned inventory equipment", async () => {
  let p = await repo.createCharacter(identity());
  p = await repo.world(p.local.id, { type: "enter", writer: "town-owner" });
  for (const writer of ["town-owner", "stale-owner"]) {
    await expect(
      repo.world(p.local.id, { type: "weapon", writer, weapon: "fire" }),
    ).rejects.toThrow(writer === "town-owner" ? "owned weapon" : "another tab");
  }
  await repo.beginRun(p.local.id);
  await expect(
    repo.world(p.local.id, {
      type: "weapon",
      writer: "town-owner",
      weapon: "frost",
    }),
  ).rejects.toThrow("owned weapon");
  const saved = await repo.load(p.local.id);
  expect(saved.local.weapon).toBe(p.local.weapon);
  expect(saved.rpg).toEqual(p.rpg);
});
test("directory entries resolve to existing real world interactions and complete Thai copy", () => {
  for (const activity of ACTIVITIES) {
    expect(LANDMARKS.some((l) => l.id === activity.landmark)).toBe(true);
    expect(translate("th", "journey", activity.name)).not.toBe(activity.name);
    expect(translate("th", "journey", activity.description)).not.toBe(
      activity.description,
    );
  }
  for (const [key, value] of Object.entries(journeyTh)) {
    expect(value.length).toBeGreaterThan(0);
    expect(value).not.toBe(key);
  }
});
