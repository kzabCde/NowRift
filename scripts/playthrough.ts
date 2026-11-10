import {
  makeGame,
  beginGame,
  advanceGame,
  chooseUpgrade,
} from "../src/game/engine";
import type { UpgradeId, WeaponId } from "../src/game/content/forest";
const initialSeed = Number(process.argv[2] ?? 1);
let seed = initialSeed;
const rng = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const g = makeGame(1800, 1400, (process.argv[3] ?? "fire") as WeaponId, rng);
beginGame(g);
const order: UpgradeId[] = [
  "multishot",
  "rapid",
  "power",
  "regen",
  "vitality",
  "area",
  "critical",
  "stride",
  "fury",
  "velocity",
  "magnet",
];
for (
  let i = 0;
  i < 60 * 720 && g.phase !== "gameover" && g.phase !== "victory";
  i++
) {
  if (g.phase === "upgrade") {
    const priorities = [...order];
    if ((g.stacks.stride ?? 0) < 1) priorities.unshift("stride");
    if ((g.stacks.regen ?? 0) < 2) priorities.unshift("regen");
    if (g.player.hp < g.player.maxHp * 0.65) priorities.unshift("vitality");
    const id = priorities.find((id) => g.offers.includes(id))!;
    chooseUpgrade(g, id);
  }
  const p = g.player;
  let target = {
    x: 900 + Math.cos(g.time / 14) * 260,
    y: 700 + Math.sin(g.time / 14) * 260,
  };
  let nearest = Infinity;
  for (const d of g.drops) {
    const dist =
      Math.hypot(d.x - p.x, d.y - p.y) *
      (d.kind === "heal" && p.hp < p.maxHp * 0.75 ? 0.25 : 1);
    if (dist < nearest) {
      nearest = dist;
      target = d;
    }
  }
  const boss = g.enemies.find((e) => e.kind === "boss");
  if (boss && Math.hypot(boss.x - p.x, boss.y - p.y) > 240) target = boss;
  let dx = target.x - p.x,
    dy = target.y - p.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  dx /= len;
  dy /= len;
  for (const e of g.enemies) {
    const ax = p.x - e.x,
      ay = p.y - e.y,
      d = Math.max(1, Math.hypot(ax, ay));
    if (d < 95) {
      const weight = (95 - d) / 18;
      dx += (ax / d) * weight;
      dy += (ay / d) * weight;
    }
  }
  for (const b of g.bullets) {
    if (!b.hostile) continue;
    const ax = p.x - b.x,
      ay = p.y - b.y,
      d = Math.max(1, Math.hypot(ax, ay));
    if (d < 65) {
      dx += (ax / d) * 2;
      dy += (ay / d) * 2;
    }
  }
  for (const h of g.hazards) {
    const ax = p.x - h.x,
      ay = p.y - h.y,
      d = Math.max(1, Math.hypot(ax, ay));
    if (d < h.r + 35) {
      dx += (ax / d) * 8;
      dy += (ay / d) * 8;
    }
  }
  // Steer around collision footprints instead of walking into a trunk indefinitely.
  for (const o of g.obstacles) {
    const ax = p.x - o.x,
      ay = p.y - o.y,
      d = Math.max(1, Math.hypot(ax, ay));
    const clearance = o.r + p.r + 32;
    if (d < clearance) {
      const strength = (clearance - d) / 24;
      dx += (ax / d) * strength - (ay / d) * 0.65;
      dy += (ay / d) * strength + (ax / d) * 0.65;
    }
  }
  // A digital movement driver uses full speed, just like a held keyboard direction.
  const movement = Math.max(0.001, Math.hypot(dx, dy));
  advanceGame(g, 1 / 60, dx / movement, dy / movement);
}
console.log(
  JSON.stringify({
    phase: g.phase,
    seconds: g.time,
    hp: g.player.hp,
    level: g.level,
    kills: g.kills,
    gold: g.gold,
    stacks: g.stacks,
    boss: g.enemies.find((e) => e.kind === "boss")?.hp,
  }),
);

if (g.phase !== "victory")
  throw new Error("Seeded playthrough did not defeat the Guardian");
