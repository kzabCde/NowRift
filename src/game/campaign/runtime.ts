import type { Game, Enemy, Bullet } from "../engine";
import {
  DIFFICULTIES,
  worldById,
  type StageDefinition,
  type DifficultyDefinition,
  type WorldDefinition,
} from "./content";
import { constructMap, type MapLayout } from "./maps";
export type StageRuntime = {
  mode?: "story" | "free";
  activity?: "farming";
  harvested?: string[];
  definition: StageDefinition;
  difficulty: DifficultyDefinition;
  world: WorldDefinition;
  map: MapLayout;
  timer: number;
  slow: number;
  burn: number;
  burnTick: number;
  enemies: number;
  elites: number;
  bosses: number;
  exposure: number;
  seed: number;
};
export function stageRuntime(
  definition: StageDefinition,
  difficulty: keyof typeof DIFFICULTIES,
  seed: number,
): StageRuntime {
  return {
    definition,
    difficulty: DIFFICULTIES[difficulty],
    world: worldById(definition.worldId),
    map: constructMap(definition, seed),
    timer: 3,
    slow: 0,
    burn: 0,
    burnTick: 0,
    enemies: 0,
    elites: 0,
    bosses: 0,
    exposure: 0,
    seed,
  };
}
export type Hooks = {
  hurt: (amount: number, from: { x: number; y: number }) => void;
  spawn: (kind: Enemy["kind"], x?: number, y?: number) => Enemy | undefined;
  bullet: (b: Bullet) => void;
};
export function environmentStep(g: Game, dt: number, h: Hooks) {
  const c = g.campaign;
  if (!c) return;
  c.slow = Math.max(0, c.slow - dt);
  c.burn = Math.max(0, c.burn - dt);
  c.burnTick -= dt;
  if (c.burn > 0 && c.burnTick <= 0) {
    h.hurt(3, g.player);
    c.burnTick = 1;
  }
  const tile =
    c.map.tiles[Math.floor(g.player.y / 32)]?.[Math.floor(g.player.x / 32)];
  if (tile === 2 && ["infernal", "frozen"].includes(c.world.id)) {
    c.exposure += dt;
    if (c.exposure > 0.8) {
      if (c.world.id === "infernal") {
        h.hurt(8, g.player);
        c.burn = 3;
      } else c.slow = 3;
    }
  } else c.exposure = 0;
  c.timer -= dt;
  if (c.timer <= 0) {
    const def = c.world.hazard;
    const zones = c.map.zones;
    for (
      let i = 0;
      i < (c.difficulty.id === "nightmare" ? 3 : 2) && zones.length;
      i++
    ) {
      const z = zones[Math.floor(g.rng() * zones.length)];
      g.hazards.push({
        ...z,
        age: 0,
        delay: def.delay,
        damage: Math.round(def.damage * c.difficulty.damage),
        slow: def.slow,
        burn: def.burn,
        color: def.color,
      });
    }
    c.timer = def.period;
  }
}
export function campaignBossAttack(g: Game, e: Enemy, h: Hooks) {
  const c = g.campaign!;
  const angry = e.hp <= e.maxHp / 2,
    pattern = (e.pattern ?? 0) % 3;
  e.pattern = (e.pattern ?? 0) + 1;
  const w = c.world,
    a = Math.atan2(g.player.y - e.y, g.player.x - e.x),
    n = c.difficulty.projectiles;
  if (pattern === 0) {
    for (let i = 0; i < (angry ? 5 : 3); i++)
      g.hazards.push({
        x: g.player.x + (i ? Math.cos(i * 2) * 100 : 0),
        y: g.player.y + (i ? Math.sin(i * 2) * 100 : 0),
        r: w.hazard.radius,
        age: 0,
        delay: w.hazard.delay,
        damage: 25,
        slow: w.hazard.slow,
        burn: w.hazard.burn,
        color: w.hazard.color,
      });
  }
  if (pattern === 1) {
    const count = (angry ? 14 : 10) + n;
    for (let i = 0; i < count; i++) {
      const angle =
        w.id === "desert"
          ? a + (i - (count - 1) / 2) * 0.13
          : (i / count) * Math.PI * 2 + (e.age ?? 0) * 0.3;
      h.bullet({
        x: e.x,
        y: e.y,
        vx: Math.cos(angle) * w.boss.projectileSpeed,
        vy: Math.sin(angle) * w.boss.projectileSpeed,
        r: 7,
        life: 5,
        damage: 18,
        color: w.colors[2],
        hostile: true,
        sprite: 4,
      });
    }
  }
  if (pattern === 2) {
    if (w.id === "desert") {
      e.charge = {
        delay: 1.3,
        left: 0.85,
        vx: Math.cos(a) * 360,
        vy: Math.sin(a) * 360,
      };
      g.hazards.push({
        x: e.x + Math.cos(a) * 120,
        y: e.y + Math.sin(a) * 120,
        r: 65,
        age: 0,
        delay: 1.3,
        damage: 0,
        color: 0xe8c28b,
      });
    } else {
      for (let i = 0; i < (angry ? 5 : 3); i++) {
        const angle = i * 2.399;
        h.spawn(
          w.id === "frozen"
            ? "caster"
            : w.id === "infernal"
              ? "elite"
              : "goblin",
          e.x + Math.cos(angle) * 85,
          e.y + Math.sin(angle) * 85,
        );
      }
    }
  }
  e.attack = (angry ? 2.7 : 4) / Math.sqrt(c.difficulty.projectiles);
}
