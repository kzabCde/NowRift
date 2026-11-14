import { expect, test } from "vitest";
import {
  CombatClock,
  COMBAT_SPEEDS,
  FIXED_STEP,
  MAX_FRAME_STEPS,
  nextCombatSpeed,
  type CombatSpeed,
} from "./simulation-clock";
import { advanceGame, chooseUpgrade, spawnEnemy } from "./engine";
import { loadStage } from "./campaign/loader";
import {
  captureCheckpoint,
  restoreCheckpoint,
  validCheckpoint,
} from "./persistence/checkpoint";

function run(speed: CombatSpeed, fps: number, real: number) {
  const g = loadStage({
      stageId: "forest-1",
      difficulty: "normal",
      seed: 109,
      clears: [],
      mode: "free",
      activity: "farming",
    }),
    clock = new CombatClock();
  g.player.invincible = 9999;
  for (let i = 0; i < real * fps; i++)
    clock.advance(1 / fps, speed, true, (dt) => {
      advanceGame(g, dt, 1, 0);
      if (g.phase === "upgrade") chooseUpgrade(g, g.offers[0]);
      return g.phase === "playing";
    });
  return g;
}
test.each(COMBAT_SPEEDS)(
  "%ix combat consumes simulation budgets at 30/60/120 FPS with deterministic physics",
  (speed) => {
    const frames = [30, 60, 120].map((fps) => run(speed, fps, 5));
    for (const g of frames) {
      expect(g.time).toBeCloseTo(5 * speed, 7);
      expect(g.player.x).toBe(frames[0].player.x);
      expect(g.enemies).toEqual(frames[0].enemies);
      expect(g.bullets).toEqual(frames[0].bullets);
      expect(g.kills).toBe(frames[0].kills);
    }
  },
);
test("equal simulated duration produces the same RNG, movement and combat at all selected speeds", () => {
  const states = COMBAT_SPEEDS.map((speed) => run(speed, 60, 8 / speed));
  for (const g of states) {
    expect(g.time).toBeCloseTo(8, 8);
    expect(g.enemies).toEqual(states[0].enemies);
    expect(g.player).toEqual(states[0].player);
    expect(g.campaign!.enemyKills).toEqual(states[0].campaign!.enemyKills);
  }
});
test("pause, scene locks and stalled frames discard budgets instead of catching up", () => {
  const c = new CombatClock();
  let time = 0;
  const step = (dt: number) => {
    time += dt;
    return true;
  };
  c.advance(FIXED_STEP / 2, 1, true, step);
  c.advance(10, 4, false, step);
  expect(time).toBe(0);
  expect(c.advance(20, 4, true, step)).toMatchObject({
    steps: 0,
    realSeconds: 0,
    limited: true,
  });
  expect(c.advance(FIXED_STEP, 1, true, step).steps).toBe(1);
  expect(time).toBeCloseTo(FIXED_STEP);
  const bounded = c.advance(0.2, 4, true, step);
  expect(bounded.steps).toBe(MAX_FRAME_STEPS);
  expect(bounded.limited).toBe(true);
  expect(c.advance(FIXED_STEP, 1, true, step).steps).toBe(1);
});
test("a modal/outcome reached during one accelerated frame stops its remaining steps", () => {
  const c = new CombatClock();
  let ticks = 0;
  const frame = c.advance(1 / 30, 4, true, () => ++ticks < 2);
  expect(frame.steps).toBe(2);
  expect(ticks).toBe(2);
  expect(c.advance(FIXED_STEP, 1, true, () => true).steps).toBe(1);
  expect([nextCombatSpeed(1), nextCombatSpeed(2), nextCombatSpeed(4)]).toEqual([
    2, 4, 1,
  ]);
});
test("the fixed clock does not alter the real calendar or timers", () => {
  const c = new CombatClock(),
    before = Date.now();
  for (let i = 0; i < 60; i++) c.advance(1 / 60, 4, true, () => true);
  expect(Date.now() - before).toBeLessThan(1000);
});
test("real active time restores through checkpoints while speed safely resets to 1x; legacy snapshots remain valid", () => {
  const g = run(4, 60, 2);
  g.realTime = 2;
  g.battleSpeed = 4;
  const owner = {
    id: "clock-run",
    slotId: "slot-clock",
    writer: "clock-tab",
    sequence: 1,
  };
  const cp = captureCheckpoint(g, owner, 109);
  expect(validCheckpoint(cp)).toBe(true);
  const restored = restoreCheckpoint(cp);
  expect(restored.time).toBe(g.time);
  expect(restored.realTime).toBe(2);
  expect(restored.battleSpeed).toBe(1);
  const legacy = structuredClone(cp);
  delete legacy.state.realTime;
  expect(validCheckpoint(legacy)).toBe(true);
  expect(restoreCheckpoint(legacy).realTime).toBeCloseTo(g.time);
  const invalid = structuredClone(cp);
  invalid.state.realTime = -1;
  expect(validCheckpoint(invalid)).toBe(false);
});

test("boss enrage, projectiles, cooldowns and status timers agree at the same simulated time", () => {
  const samples = COMBAT_SPEEDS.map((speed) => {
    const g = loadStage({
        stageId: "forest-5",
        difficulty: "normal",
        seed: 239,
        clears: [
          "forest-1:normal",
          "forest-2:normal",
          "forest-3:normal",
          "forest-4:normal",
        ],
        mode: "free",
      }),
      clock = new CombatClock();
    g.player.invincible = 9999;
    g.weapon.damage = 0;
    g.spawnCooldown = 9999;
    g.focus = 20;
    g.campaign!.slow = 15;
    g.campaign!.burn = 5;
    spawnEnemy(g, "boss", g.player.x + 120, g.player.y);
    const boss = g.enemies.find((e) => e.kind === "boss")!;
    boss.hp = boss.maxHp * 0.4;
    for (let i = 0; i < (60 * 12) / speed; i++)
      clock.advance(1 / 60, speed, true, (dt) => {
        advanceGame(g, dt, 0, 0);
        return g.phase === "playing";
      });
    expect(boss.enraged).toBe(true);
    expect(boss.age).toBeCloseTo(12, 6);
    expect(g.focus).toBeCloseTo(8, 6);
    return {
      player: g.player,
      enemies: g.enemies,
      bullets: g.bullets,
      hazards: g.hazards,
      weapon: g.weapon,
      status: {
        slow: g.campaign!.slow,
        burn: g.campaign!.burn,
        timer: g.campaign!.timer,
      },
    };
  });
  expect(samples[1]).toEqual(samples[0]);
  expect(samples[2]).toEqual(samples[0]);
});
