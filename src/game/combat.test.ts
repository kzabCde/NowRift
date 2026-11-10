import { describe, expect, test } from "vitest";
import {
  advanceGame,
  beginGame,
  chooseUpgrade,
  makeGame,
  snapshot,
  spawnEnemy,
  updateGame,
} from "./engine";
import {
  FOREST,
  UPGRADES,
  type EnemyKind,
  type UpgradeId,
  type WeaponId,
} from "./content/forest";
function fixture(weapon: WeaponId = "arcane") {
  const g = makeGame(1800, 1400, weapon, () => 0.99);
  beginGame(g);
  g.enemies = [];
  g.obstacles = [];
  g.spawnCooldown = 999;
  g.weapon.cooldown = 999;
  return g;
}
function offer(g: ReturnType<typeof fixture>, id: UpgradeId) {
  g.phase = "upgrade";
  g.offers = [id];
  return chooseUpgrade(g, id);
}
describe("weapon behaviors", () => {
  test("starting Wanderer has specified stats", () => {
    const g = makeGame();
    expect(g.player.hp).toBe(100);
    expect(g.player.speed).toBe(180);
    expect(g.weapon.damage).toBe(10);
    expect(g.weapon.delay).toBe(0.8);
    expect(g.weaponId).toBe("arcane");
  });
  test("targets nearest valid enemy, with correct projectile range and lifetime", () => {
    const g = fixture();
    spawnEnemy(g, "slime", 1100, 700);
    spawnEnemy(g, "slime", 900, 800);
    g.weapon.cooldown = 0;
    updateGame(g, 0.01, 0, 0);
    expect(g.bullets).toHaveLength(1);
    expect(g.bullets[0].vy).toBeGreaterThan(400);
    expect(g.bullets[0].vx).toBeCloseTo(0);
    expect(g.bullets[0].life).toBeCloseTo(420 / 430 - 0.01);
  });
  test("daggers fire paired close-range fast blades", () => {
    const g = fixture("daggers");
    spawnEnemy(g, "slime", 1000, 700);
    g.weapon.cooldown = 0;
    updateGame(g, 0.01, 0, 0);
    expect(g.bullets).toHaveLength(2);
    expect(g.weapon.range).toBe(230);
    expect(g.weapon.delay).toBe(0.35);
    expect(g.bullets[0].vy).not.toEqual(g.bullets[1].vy);
  });
  test("Fire Orb damages a cluster on impact", () => {
    const g = fixture("fire");
    const a = spawnEnemy(g, "elite", 1100, 700)!,
      b = spawnEnemy(g, "elite", 1135, 700)!;
    a.speed = b.speed = 0;
    g.bullets.push({
      x: a.x,
      y: a.y,
      vx: 0,
      vy: 0,
      r: 7,
      life: 1,
      damage: 16,
      color: "#fff",
      blast: 64,
    });
    updateGame(g, 0.01, 0, 0);
    expect(a.hp).toBe(164);
    expect(b.hp).toBeCloseTo(168.8);
  });
  test("Frost Pulse damages and slows all nearby enemies without projectiles", () => {
    const g = fixture("frost");
    const a = spawnEnemy(g, "elite", 980, 700)!,
      b = spawnEnemy(g, "elite", 900, 790)!;
    g.weapon.cooldown = 0;
    updateGame(g, 0.01, 0, 0);
    expect(a.hp).toBe(168);
    expect(b.hp).toBe(168);
    expect(a.slow).toBeGreaterThan(1.9);
    expect(g.bullets).toHaveLength(0);
    expect(g.texts.some((t) => t.kind === "pulse")).toBe(true);
  });
  test("critical hits use actual multiplier and visual indicator", () => {
    const g = fixture();
    g.rng = () => 0;
    g.weapon.cooldown = 0;
    const e = spawnEnemy(g, "elite", 940, 700)!;
    e.speed = 0;
    for (let i = 0; i < 10; i++) updateGame(g, 0.02, 0, 0);
    expect(e.hp).toBe(165);
    expect(g.texts.some((t) => t.critical)).toBe(true);
  });
  test("projectile and enemy pool objects are reused after cleanup", () => {
    const g = fixture();
    const e = spawnEnemy(g, "slime", 1100, 700)!;
    g.bullets.push({
      x: e.x,
      y: e.y,
      vx: 0,
      vy: 0,
      r: 8,
      life: 1,
      damage: 100,
      color: "#fff",
    });
    updateGame(g, 0.01, 0, 0);
    expect(g.pools.enemies).toContain(e);
    expect(spawnEnemy(g, "goblin")).toBe(e);
    expect(g.pools.bullets.length).toBe(1);
  });
});
describe("movement, enemies and survival", () => {
  test("edge-clamped spawns remain away from the player", () => {
    const g = fixture();
    g.player.x = 1760;
    g.player.y = 700;
    g.rng = () => 0;
    const e = spawnEnemy(g, "slime")!;
    expect(Math.hypot(e.x - g.player.x, e.y - g.player.y)).toBeGreaterThan(320);
  });
  test("diagonal movement is normalized and obstacles block player", () => {
    const g = fixture();
    const x = g.player.x,
      y = g.player.y;
    advanceGame(g, 0.1, 1, 1);
    expect(Math.hypot(g.player.x - x, g.player.y - y)).toBeCloseTo(18);
    g.player.x = 900;
    g.player.y = 700;
    g.obstacles = [{ x: 940, y: 700, r: 20, type: "rock" }];
    advanceGame(g, 0.1, 1, 0);
    expect(g.player.x).toBeLessThanOrEqual(908);
  });
  test("wolves burst, casters fire and maintain range, elites are durable", () => {
    const g = fixture();
    const wolf = spawnEnemy(g, "wolf", 1100, 700)!,
      slime = spawnEnemy(g, "slime", 1100, 900)!,
      caster = spawnEnemy(g, "caster", 1100, 700)!;
    caster.attack = 0;
    const elite = spawnEnemy(g, "elite", 1300, 700)!;
    const x = wolf.x;
    updateGame(g, 0.02, 0, 0);
    expect(x - wolf.x).toBeGreaterThan(2);
    expect(slime.speed).toBeLessThan(wolf.speed);
    expect(g.bullets.some((b) => b.hostile)).toBe(true);
    expect(elite.hp).toBeGreaterThan(150);
  });
  test("contact invulnerability prevents immediate repeated damage; ranged attacks hurt", () => {
    const g = fixture();
    spawnEnemy(g, "slime", 900, 700);
    updateGame(g, 0.02, 0, 0);
    expect(g.player.hp).toBe(88);
    updateGame(g, 0.02, 0, 0);
    expect(g.player.hp).toBe(88);
    g.enemies = [];
    g.player.invincible = 0;
    g.bullets.push({
      x: g.player.x - 2,
      y: g.player.y,
      vx: 100,
      vy: 0,
      r: 6,
      life: 1,
      damage: 10,
      color: "#fff",
      hostile: true,
    });
    updateGame(g, 0.02, 0, 0);
    expect(g.player.hp).toBe(78);
  });
  test("spawn pressure is time-based, escalates, and respects 180 enemy cap", () => {
    const g = fixture();
    g.time = 400;
    g.spawnCooldown = 0;
    updateGame(g, 0.02, 0, 0);
    expect(g.enemies.length).toBe(2);
    for (let i = 0; i < 250; i++) spawnEnemy(g, "slime");
    expect(g.enemies.length).toBe(FOREST.maxEnemies);
  });
  test("XP pickups and healing have actual effects", () => {
    const g = fixture();
    g.player.hp = 40;
    g.drops.push(
      { x: 900, y: 700, r: 6, value: 18, kind: "heal" },
      { x: 900, y: 700, r: 6, value: 30, kind: "xp" },
    );
    updateGame(g, 0.01, 0, 0);
    expect(g.player.hp).toBe(58);
    expect(g.level).toBe(2);
    expect(g.phase).toBe("upgrade");
  });
  test("dead player enters defeat with death effects", () => {
    const g = fixture();
    g.player.hp = 1;
    spawnEnemy(g, "slime", 900, 700);
    updateGame(g, 0.01, 0, 0);
    expect(g.phase).toBe("gameover");
    expect(
      g.texts.some((t) => t.kind === "death" && t.value === "player"),
    ).toBe(true);
  });
});
describe("bounded blessings", () => {
  test("Frost area and velocity blessings extend actual reach and slow duration", () => {
    const g = fixture("frost");
    offer(g, "area");
    offer(g, "velocity");
    const e = spawnEnemy(g, "elite", 1100, 700)!;
    e.speed = 0;
    g.weapon.cooldown = 0;
    updateGame(g, 0.01, 0, 0);
    expect(e.hp).toBeLessThan(e.maxHp);
    expect(e.slow).toBeGreaterThan(2.3);
  });
  test.each(UPGRADES.map((u) => [u.id] as const))(
    "%s changes its actual statistic",
    (id) => {
      const g = fixture();
      const before = JSON.stringify({
        weapon: g.weapon,
        player: g.player,
        regen: g.regen,
        radius: g.pickupRadius,
      });
      expect(offer(g, id)).toBe(true);
      expect(
        JSON.stringify({
          weapon: g.weapon,
          player: g.player,
          regen: g.regen,
          radius: g.pickupRadius,
        }),
      ).not.toBe(before);
    },
  );
  test("maxed upgrades never reappear; duplicate selections are rejected", () => {
    const g = fixture();
    for (const u of UPGRADES) g.stacks[u.id] = u.max;
    g.stacks.power = 0;
    g.xp = g.xpToNext;
    updateGame(g, 0.01, 0, 0);
    expect(g.offers).toEqual(["power"]);
    expect(chooseUpgrade(g, "power")).toBe(true);
    expect(chooseUpgrade(g, "power")).toBe(false);
  });
  test("surplus experience opens subsequent upgrades without losing XP", () => {
    const g = fixture();
    g.xp = 100;
    updateGame(g, 0.01, 0, 0);
    expect(g.level).toBe(2);
    chooseUpgrade(g, g.offers[0]);
    expect(g.level).toBe(3);
    expect(g.phase).toBe("upgrade");
  });
  test("regen heals over real simulation time and critical chance is capped", () => {
    const g = fixture();
    offer(g, "regen");
    g.player.hp = 50;
    advanceGame(g, 0.1, 0, 0);
    expect(g.player.hp).toBeCloseTo(50.05);
    for (let i = 0; i < 9; i++) expect(offer(g, "critical")).toBe(true);
    expect(g.weapon.crit).toBeCloseTo(0.5);
    expect(offer(g, "critical")).toBe(false);
  });
});
describe("Forest Guardian", () => {
  test("boss cannot be blocked by the normal enemy population cap", () => {
    const g = fixture();
    for (let i = 0; i < FOREST.maxEnemies; i++) spawnEnemy(g, "slime", 40, 40);
    g.time = 479.99;
    advanceGame(g, 0.02, 0, 0);
    expect(g.enemies).toHaveLength(FOREST.maxEnemies);
    expect(g.enemies.filter((e) => e.kind === "boss")).toHaveLength(1);
  });
  test("lethal ranged damage cannot be reversed by a healing drop", () => {
    const g = fixture();
    g.player.hp = 1;
    g.drops.push({ x: 900, y: 700, r: 6, value: 20, kind: "heal" });
    g.bullets.push({
      x: 900,
      y: 700,
      vx: 0,
      vy: 0,
      r: 8,
      life: 1,
      damage: 10,
      color: "#fff",
      hostile: true,
    });
    updateGame(g, 0.01, 0, 0);
    expect(g.phase).toBe("gameover");
    expect(g.player.hp).toBe(0);
  });
  test("spawns exactly once at 08:00 and stops normal spawns", () => {
    const g = fixture();
    g.time = 479.99;
    advanceGame(g, 0.02, 0, 0);
    expect(g.enemies.filter((e) => e.kind === "boss")).toHaveLength(1);
    g.spawnCooldown = 0;
    advanceGame(g, 0.1, 0, 0);
    expect(g.enemies).toHaveLength(1);
    expect(snapshot(g).boss?.phase).toBe(1);
  });
  test("telegraphs roots, fires ring projectiles, and enrages at half HP", () => {
    const g = fixture();
    g.bossSpawned = true;
    const b = spawnEnemy(g, "boss", 1100, 700)!;
    b.attack = 0;
    updateGame(g, 0.01, 0, 0);
    expect(g.hazards).toHaveLength(1);
    expect(g.bullets.filter((b) => b.hostile)).toHaveLength(8);
    expect(g.hazards[0].age).toBeLessThan(g.hazards[0].delay);
    g.hazards = [];
    g.bullets = [];
    b.hp = b.maxHp * 0.5;
    b.attack = 0;
    updateGame(g, 0.01, 0, 0);
    expect(snapshot(g).boss?.phase).toBe(2);
    expect(g.hazards).toHaveLength(3);
    expect(g.bullets).toHaveLength(12);
  });
  test("root strike is avoidable and damages only when its telegraph completes", () => {
    const g = fixture();
    g.hazards.push({ x: 900, y: 700, r: 55, age: 0, delay: 1, damage: 25 });
    advanceGame(g, 0.1, 0, 0);
    expect(g.player.hp).toBe(100);
    for (let i = 0; i < 12; i++) advanceGame(g, 0.1, 1, 0);
    expect(g.player.hp).toBe(100);
    g.hazards.push({
      x: g.player.x,
      y: g.player.y,
      r: 55,
      age: 0.99,
      delay: 1,
      damage: 25,
    });
    advanceGame(g, 0.02, 0, 0);
    expect(g.player.hp).toBe(75);
  });
  test("lethal real projectile collision wins and awards boss + victory gold once", () => {
    const g = fixture();
    const boss = spawnEnemy(g, "boss", 1100, 700)!;
    g.bullets.push({
      x: boss.x,
      y: boss.y,
      vx: 0,
      vy: 0,
      r: 8,
      life: 1,
      damage: 3000,
      color: "#fff",
    });
    updateGame(g, 0.01, 0, 0);
    expect(g.phase).toBe("victory");
    expect(g.gold).toBe(250);
    expect(g.kills).toBe(1);
    advanceGame(g, 0.1, 0, 0);
    expect(g.gold).toBe(250);
  });
  test("all enemy archetypes have valid combat definitions", () => {
    for (const kind of [
      "slime",
      "goblin",
      "wolf",
      "caster",
      "elite",
      "boss",
    ] as EnemyKind[]) {
      const g = fixture();
      const e = spawnEnemy(g, kind)!;
      expect(e.hp).toBeGreaterThan(0);
      expect(e.r).toBeGreaterThan(0);
    }
  });
});
