import { performance } from "node:perf_hooks";
import {
  advanceGame,
  makeGame,
  spawnEnemy,
  chooseUpgrade,
  beginGame,
} from "../src/game/engine";
const g = makeGame();
beginGame(g);
g.enemies = [];
g.player.invincible = 1e6;
g.spawnCooldown = 1e6;
for (let i = 0; i < 180; i++) {
  const a = (i / 180) * Math.PI * 2;
  spawnEnemy(
    g,
    i % 5 === 0 ? "caster" : "elite",
    900 + Math.cos(a) * 300,
    700 + Math.sin(a) * 300,
  );
}
const times: number[] = [];
for (let frame = 0; frame < 3600; frame++) {
  if (g.phase === "upgrade") chooseUpgrade(g, g.offers[0]);
  while (g.enemies.length < 150) spawnEnemy(g, "elite");
  const start = performance.now();
  advanceGame(g, 1 / 60, Math.cos(frame / 90), Math.sin(frame / 90));
  times.push(performance.now() - start);
}
times.sort((a, b) => a - b);
console.log(
  JSON.stringify(
    {
      frames: times.length,
      enemies: g.enemies.length,
      meanMs: times.reduce((a, b) => a + b, 0) / times.length,
      p95Ms: times[Math.floor(times.length * 0.95)],
      maxMs: times[times.length - 1],
      bullets: g.bullets.length,
      particles: g.sparks.length,
      scope: "Node simulation only, not rendering or mobile hardware",
    },
    null,
    2,
  ),
);
