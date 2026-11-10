import { describe, test, expect } from "vitest";
import "fake-indexeddb/auto";
import { STAGES, WORLDS, DIFFICULTIES, ITEM_IDS } from "./content";
import { emptyProgress, lockedReason, clearKey } from "./progression";
import { applyResult, campaignRepository } from "./persistence";
import { loadStage } from "./loader";
import { constructMap } from "./maps";
import { resolveRewards, type CampaignResult } from "./rewards";
import { advanceGame, spawnEnemy } from "../engine";
const all = STAGES.flatMap((s) =>
  Object.keys(DIFFICULTIES).map((d) => `${s.id}:${d}`),
);
function result(
  stageId: string,
  difficulty: "normal" | "hard" | "nightmare" = "normal",
): CampaignResult {
  const stage = STAGES.find((s) => s.id === stageId)!;
  return {
    id: stageId + difficulty,
    stageId,
    difficulty,
    seed: 42,
    victory: true,
    enemies: 10,
    elites: 2,
    bosses: stage.number === 5 ? 1 : 0,
    seconds: stage.clear.seconds * DIFFICULTIES[difficulty].duration,
  };
}
describe("campaign definitions and actual simulation", () => {
  test("20 unique stages, valid references, all loot IDs and five enemies per world", () => {
    expect(STAGES).toHaveLength(20);
    expect(new Set(STAGES.map((s) => s.id)).size).toBe(20);
    for (const w of WORLDS) {
      expect(w.enemies).toHaveLength(5);
      expect(w.boss.patterns).toHaveLength(3);
    }
    for (const s of STAGES) {
      expect(WORLDS.some((w) => w.id === s.worldId)).toBe(true);
      for (const t of Object.values(s.rewards)) {
        for (const m of t.materials) expect(ITEM_IDS).toContain(m.id);
        for (const id of t.candidates) expect(ITEM_IDS).toContain(id);
      }
    }
  });
  for (const s of STAGES)
    for (const difficulty of ["normal", "hard", "nightmare"] as const)
      test(`${s.id} / ${difficulty}: enters, fights, hazards, clears`, () => {
        const g = loadStage({
          stageId: s.id,
          difficulty,
          seed: 123,
          clears: all,
        });
        expect(g.phase).toBe("playing");
        expect(g.enemies).toHaveLength(4);
        g.player.invincible = 999;
        g.campaign!.timer = 0;
        advanceGame(g, 0.1, 1, 0);
        expect(g.time).toBeGreaterThan(0);
        expect(g.hazards.length).toBeGreaterThan(0);
        const target = g.enemies[0];
        target.x = g.player.x + 45;
        target.y = g.player.y;
        g.weapon.cooldown = 0;
        for (let i = 0; i < 30; i++) advanceGame(g, 0.02, 0, 0);
        expect(g.bullets.length + g.texts.length).toBeGreaterThan(0);
        g.time = s.clear.seconds * DIFFICULTIES[difficulty].duration;
        g.phase = "playing";
        advanceGame(g, 0.02, 0, 0);
        if (s.clear.kind === "boss") {
          const b = g.enemies.find((e) => e.kind === "boss")!;
          expect(b).toBeDefined();
          b.attack = 0;
          advanceGame(g, 0.02, 0, 0);
          expect(g.hazards.length).toBeGreaterThan(0);
          for (let i = 0; i < 3; i++) {
            b.attack = 0;
            advanceGame(g, 0.02, 0, 0);
          }
          expect(b.pattern).toBeGreaterThanOrEqual(3);
          b.hp = 0;
          advanceGame(g, 0.02, 0, 0);
        }
        expect(g.phase).toBe("victory");
      });
  test("maps are seeded, distinct, and keep central spawn and grid corridors safe", () => {
    const hashes = new Set<string>();
    for (const s of STAGES) {
      const map = constructMap(s);
      expect(map).toEqual(constructMap(s));
      for (const o of map.props)
        expect(Math.hypot(o.x - 900, o.y - 700)).toBeGreaterThan(110);
      for (let i = 0; i < map.props.length; i++)
        for (let j = i + 1; j < map.props.length; j++)
          expect(
            Math.hypot(
              map.props[i].x - map.props[j].x,
              map.props[i].y - map.props[j].y,
            ),
          ).toBeGreaterThan(90);
      hashes.add(JSON.stringify(map));
    }
    expect(hashes.size).toBe(20);
  });
  test("difficulty changes composition pressure, movement and projectile counts", () => {
    const normal = loadStage({
        stageId: "desert-3",
        difficulty: "normal",
        seed: 4,
        clears: all,
      }),
      hard = loadStage({
        stageId: "desert-3",
        difficulty: "nightmare",
        seed: 4,
        clears: all,
      });
    for (const g of [normal, hard]) {
      g.enemies = [];
      const e = spawnEnemy(g, "caster", 1100, 700)!;
      e.attack = 0;
      advanceGame(g, 0.02, 0, 0);
    }
    expect(hard.bullets.filter((b) => b.hostile).length).toBeGreaterThan(
      normal.bullets.filter((b) => b.hostile).length,
    );
    expect(hard.campaign!.difficulty.spawn).toBeLessThan(
      normal.campaign!.difficulty.spawn,
    );
  });
});
describe("unlocks and atomic farming rewards", () => {
  test("lava and ice terrain allow escape before activating their status", () => {
    for (const world of ["infernal", "frozen"]) {
      const g = loadStage({
        stageId: world + "-1",
        difficulty: "normal",
        seed: 123,
        clears: all,
      });
      g.enemies = [];
      g.spawnCooldown = 999;
      g.weapon.cooldown = 999;
      const map = g.campaign!.map;
      let found = false;
      for (let y = 0; y < map.tiles.length && !found; y++)
        for (let x = 0; x < map.tiles[y].length && !found; x++)
          if (map.tiles[y][x] === 2) {
            g.player.x = x * 32 + 16;
            g.player.y = y * 32 + 16;
            found = true;
          }
      g.obstacles = [];
      for (let i = 0; i < 6; i++) advanceGame(g, 0.1, 0, 0);
      expect(g.player.hp).toBe(100);
      for (let i = 0; i < 4; i++) advanceGame(g, 0.1, 0, 0);
      if (world === "infernal") {
        expect(g.player.hp).toBeLessThan(100);
        expect(g.campaign!.burn).toBeGreaterThan(0);
      } else {
        expect(g.campaign!.slow).toBeGreaterThan(0);
        expect(g.player.hp).toBe(100);
      }
    }
  });
  test("invalid entry is blocked in loader, not merely by disabled buttons", () => {
    expect(lockedReason("forest-1", "normal", [])).toBeNull();
    for (const s of STAGES.slice(1))
      expect(() =>
        loadStage({ stageId: s.id, difficulty: "normal", seed: 1, clears: [] }),
      ).toThrow();
    expect(() =>
      loadStage({
        stageId: "forest-1",
        difficulty: "hard",
        seed: 1,
        clears: [],
      }),
    ).toThrow();
  });
  test("complete normal then hard unlocks next world and Nightmare, sequentially", () => {
    let p = emptyProgress();
    for (const d of ["normal", "hard", "nightmare"] as const) {
      for (const s of STAGES.filter((s) => s.worldId === "forest")) {
        expect(lockedReason(s.id, d, p.clears)).toBeNull();
        p = applyResult(p, result(s.id, d)).progress;
      }
    }
    expect(lockedReason("desert-1", "normal", p.clears)).toBeNull();
    expect(p.clears).toHaveLength(15);
    expect(lockedReason("desert-2", "normal", p.clears)).not.toBeNull();
  });
  test("defeat never unlocks, first clear once, repeat farming, duplicate receipts", () => {
    let p = emptyProgress();
    p = applyResult(p, {
      ...result("forest-1"),
      id: "defeat",
      victory: false,
      seconds: 5,
    }).progress;
    expect(p.clears).toHaveLength(0);
    const first = applyResult(p, result("forest-1"));
    expect(first.reward!.firstClear).toBe(true);
    expect(first.progress.materials.wood).toBeGreaterThan(0);
    expect(applyResult(first.progress, result("forest-1")).reward).toBeNull();
    const replay = applyResult(first.progress, {
      ...result("forest-1"),
      id: "repeat",
    });
    expect(replay.reward!.firstClear).toBe(false);
    expect(replay.progress.gold).toBeGreaterThan(first.progress.gold);
    expect(() => applyResult(p, { ...result("forest-1"), seconds: 1 })).toThrow(
      "Clear condition",
    );
  });
  test("deterministic rewards and difficulty multipliers", () => {
    const a = resolveRewards(result("forest-1"), true);
    expect(a).toEqual(resolveRewards(result("forest-1"), true));
    expect(
      resolveRewards(result("forest-1", "nightmare"), true).gold,
    ).toBeGreaterThan(a.gold);
  });
  test("IndexedDB settles concurrently without duplicate first-clear grants", async () => {
    const [a, b] = await Promise.all([
      campaignRepository.settle({ ...result("forest-1"), id: "atomic-1" }),
      campaignRepository.settle({ ...result("forest-1"), id: "atomic-2" }),
    ]);
    expect(
      [a.reward!.firstClear, b.reward!.firstClear].filter(Boolean),
    ).toHaveLength(1);
    const p = await campaignRepository.load();
    expect(p.receipts).toHaveLength(2);
    expect(p.clears).toEqual([clearKey("forest-1", "normal")]);
  });
});
