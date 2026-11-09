import assert from "node:assert/strict";
import test from "node:test";
import { beginGame, chooseUpgrade, makeGame, snapshot, togglePause, updateGame } from "./engine";

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
