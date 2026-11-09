import assert from "node:assert/strict";
import test from "node:test";
import { advanceGame, beginGame, chooseUpgrade, makeGame, resizeGame, snapshot, togglePause, updateGame } from "./engine";

test("a new run starts with local-only, in-memory defaults", () => {
  const game = makeGame(800, 500);
  assert.equal(game.phase, "menu");
  assert.equal(game.level, 1);
  assert.equal(game.gold, 0);
  assert.equal(game.player.hp, 100);
  beginGame(game);
  assert.equal(game.phase, "playing");
  assert.equal(game.enemies.length, 4);
});

test("pause and resume only affect active runs", () => {
  const game = makeGame(800, 500);
  togglePause(game);
  assert.equal(game.phase, "menu");
  beginGame(game);
  togglePause(game);
  assert.equal(game.phase, "paused");
  const before = game.time;
  updateGame(game, 0.05, 1, 0);
  assert.equal(game.time, before);
  togglePause(game);
  assert.equal(game.phase, "playing");
});

test("movement is clamped inside the arena", () => {
  const game = makeGame(600, 400);
  game.phase = "playing";
  game.spawnCooldown = 999;
  for (let i = 0; i < 150; i++) updateGame(game, 0.05, 1, 1);
  assert.ok(game.player.x <= game.width - game.player.r - 9);
  assert.ok(game.player.y <= game.height - game.player.r - 9);
});

test("auto-fire targets enemies without pressing an attack key", () => {
  const game = makeGame(800, 500);
  game.phase = "playing";
  game.spawnCooldown = 999;
  game.enemies.push({
    id: 1, x: game.player.x + 120, y: game.player.y, r: 15,
    hp: 58, maxHp: 58, speed: 0, contact: 0, kind: "drone",
  });
  game.weapon.cooldown = 0;
  updateGame(game, 0.016, 0, 0);
  assert.equal(game.bullets.length, 1);
});

test("upgrades require an offered option and change player stats", () => {
  const game = makeGame(800, 500);
  assert.equal(chooseUpgrade(game, "power"), false);
  game.phase = "upgrade";
  game.offers = ["power", "rapid", "vitality"];
  assert.equal(chooseUpgrade(game, "magnet"), false);
  assert.equal(chooseUpgrade(game, "power"), true);
  assert.equal(game.weapon.damage, 40);
  assert.equal(game.phase, "playing");
  assert.deepEqual(game.offers, []);
  assert.equal(snapshot(game).level, 1);
});

test("resize preserves every world entity's relative position", () => {
  const game = makeGame(600, 400);
  game.player.x = 150;
  game.player.y = 100;
  game.enemies.push({ id: 1, x: 420, y: 200, r: 15, hp: 25, maxHp: 25, speed: 0, contact: 0, kind: "drone" });
  game.bullets.push({ x: 90, y: 300, vx: 200, vy: 0, r: 5, life: 1, damage: 1, color: "#fff" });
  game.drops.push({ x: 200, y: 300, r: 7, value: 12, kind: "xp" });
  game.sparks.push({ x: 500, y: 100, vx: 0, vy: 0, age: 0, life: 1, color: "#fff", size: 2 });

  resizeGame(game, 300, 800);
  assert.equal(game.width, 300);
  assert.equal(game.height, 800);
  assert.deepEqual([game.player.x, game.player.y], [75, 200]);
  assert.deepEqual([game.enemies[0].x, game.enemies[0].y], [210, 400]);
  assert.deepEqual([game.bullets[0].x, game.bullets[0].y], [45, 600]);
  assert.deepEqual([game.drops[0].x, game.drops[0].y], [100, 600]);
  assert.deepEqual([game.sparks[0].x, game.sparks[0].y], [250, 200]);

  resizeGame(game, 1, 1);
  assert.deepEqual([game.width, game.height], [300, 800]);
});

test("low frame rate advances time and movement without slow-motion", () => {
  const game = makeGame(900, 500);
  game.phase = "playing";
  game.spawnCooldown = 999;
  game.weapon.cooldown = 999;
  const startX = game.player.x;
  advanceGame(game, 0.10, 1, 0);
  assert.ok(Math.abs(game.player.x - startX - 22.5) < 0.001);
  assert.ok(Math.abs(game.time - 0.10) < 0.001);
  advanceGame(game, 10, 0, 0);
  assert.ok(game.time <= 0.221, "large tab resume must not simulate ten seconds at once");
});

test("swept collisions hit enemies between bullet endpoints", () => {
  const game = makeGame(800, 500);
  game.phase = "playing";
  game.spawnCooldown = 999;
  game.weapon.cooldown = 999;
  game.enemies.push({ id: 1, x: 116, y: 100, r: 3, hp: 10, maxHp: 10, speed: 0, contact: 0, kind: "stalker" });
  game.bullets.push({ x: 100, y: 100, vx: 1600, vy: 0, r: 2, life: 1, damage: 15, color: "#fff" });

  updateGame(game, 0.02, 0, 0);
  assert.equal(game.kills, 1);
  assert.equal(game.bullets.length, 0);
  assert.ok(game.drops.some((drop) => drop.kind === "xp"));
});

test("swept collision picks the nearest enemy, regardless of array order", () => {
  const game = makeGame(800, 500);
  game.phase = "playing";
  game.spawnCooldown = 999;
  game.weapon.cooldown = 999;
  game.enemies.push(
    { id: 1, x: 145, y: 100, r: 3, hp: 20, maxHp: 20, speed: 0, contact: 0, kind: "stalker" },
    { id: 2, x: 115, y: 100, r: 3, hp: 20, maxHp: 20, speed: 0, contact: 0, kind: "stalker" },
  );
  game.bullets.push({ x: 100, y: 100, vx: 3000, vy: 0, r: 2, life: 1, damage: 10, color: "#fff" });

  updateGame(game, 0.02, 0, 0);
  assert.equal(game.enemies.find((e) => e.id === 1)?.hp, 20);
  assert.equal(game.enemies.find((e) => e.id === 2)?.hp, 10);
});

test("contact damage checks enemy position after movement", () => {
  const game = makeGame(800, 500);
  game.phase = "playing";
  game.spawnCooldown = 999;
  game.weapon.cooldown = 999;
  const p = game.player;
  game.enemies.push({ id: 1, x: p.x + 48, y: p.y, r: 15, hp: 100, maxHp: 100, speed: 1400, contact: 0, kind: "drone" });
  updateGame(game, 0.02, 0, 0);
  assert.equal(game.player.hp, 88);
  assert.ok(game.player.invincible > 0);
});

test("level-up freezes gameplay until selecting one of three upgrades", () => {
  const game = makeGame(800, 500);
  game.phase = "playing";
  game.spawnCooldown = 999;
  game.weapon.cooldown = 999;
  game.xp = game.xpToNext - 2;
  game.drops.push({ x: game.player.x + 5, y: game.player.y, r: 7, value: 12, kind: "xp" });
  updateGame(game, 0.02, 0, 0);
  assert.equal(game.phase, "upgrade");
  assert.equal(game.offers.length, 3);
  assert.equal(new Set(game.offers).size, 3);
  const frozenTime = game.time;
  advanceGame(game, 0.1, 1, 0);
  assert.equal(game.time, frozenTime);
  assert.equal(chooseUpgrade(game, game.offers[0]), true);
  assert.equal(game.phase, "playing");
});

test("uncollected XP drops do not grow without limit", () => {
  const game = makeGame(800, 500);
  game.phase = "playing";
  game.spawnCooldown = 999;
  game.weapon.cooldown = 999;
  for (let i = 0; i < 350; i++) {
    game.drops.push({ x: 10, y: 10, r: 7, value: 12, kind: "xp" });
  }
  updateGame(game, 0.02, 0, 0);
  assert.equal(game.drops.length, 240);
});
