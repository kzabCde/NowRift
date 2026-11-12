import { temporaryStats, incomingDamage } from "./rpg/stats";
import { enemyScale } from "./campaign/scaling";
import type { CharacterStats, Rarity, WeaponSnapshot } from "./rpg/model";
import { facingFromAngle, type Facing } from "./presentation/character";
import type { CharacterId } from "./loadout";
import { feedback, type FeedbackQueue } from "./feedback";
import {
  environmentStep,
  campaignBossAttack,
  type StageRuntime,
} from "./campaign/runtime";
import {
  ENEMIES,
  FOREST,
  OBSTACLES,
  UPGRADES,
  WEAPONS,
  attackRange,
  type EnemyKind,
  type UpgradeId,
  type WeaponId,
  type Obstacle,
} from "./content/forest";
export { UPGRADES } from "./content/forest";
export type { UpgradeId } from "./content/forest";
export type GamePhase =
  | "menu"
  | "playing"
  | "paused"
  | "upgrade"
  | "gameover"
  | "victory";
export type Enemy = {
  damageScale?: number;
  level?: number;
  enraged?: boolean;
  pattern?: number;
  charge?: { delay: number; left: number; vx: number; vy: number };
  id: number;
  x: number;
  y: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  contact: number;
  kind: EnemyKind;
  attack?: number;
  slow?: number;
  hit?: number;
  age?: number;
};
export type Bullet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  damage: number;
  color: string;
  hostile?: boolean;
  blast?: number;
  critical?: boolean;
  sprite?: number;
};
export type Drop = {
  x: number;
  y: number;
  r: number;
  value: number;
  kind: "xp" | "heal";
};
export type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  color: string;
  size: number;
};
export type CombatText = {
  x: number;
  y: number;
  value: string;
  critical: boolean;
  age: number;
  life: number;
  kind: "damage" | "death" | "pulse";
  color?: string;
};
export type Hazard = {
  slow?: number;
  burn?: number;
  color?: number;
  x: number;
  y: number;
  r: number;
  age: number;
  delay: number;
  damage: number;
};
export type Game = FeedbackQueue & {
  equippedWeapon?: WeaponSnapshot;
  character: CharacterId;
  id?: string;
  build?: CharacterStats;
  focus: number;
  appearance?: { rarity: Rarity; icon: number };
  campaign?: StageRuntime;
  phase: GamePhase;
  width: number;
  height: number;
  time: number;
  wave: number;
  kills: number;
  gold: number;
  level: number;
  xp: number;
  xpToNext: number;
  weaponId: WeaponId;
  rng: () => number;
  player: {
    facing?: Facing;
    attackUntil?: number;
    attackAngle?: number;
    x: number;
    y: number;
    r: number;
    hp: number;
    maxHp: number;
    speed: number;
    angle: number;
    invincible: number;
    armor?: number;
    moving: boolean;
    hit: number;
  };
  weapon: {
    damage: number;
    delay: number;
    projectiles: number;
    cooldown: number;
    range: number;
    speed: number;
    area: number;
    crit: number;
    critDamage: number;
  };
  regen: number;
  pickupRadius: number;
  enemies: Enemy[];
  bullets: Bullet[];
  drops: Drop[];
  sparks: Spark[];
  texts: CombatText[];
  hazards: Hazard[];
  obstacles: Obstacle[];
  spawnCooldown: number;
  nextId: number;
  offers: UpgradeId[];
  stacks: Partial<Record<UpgradeId, number>>;
  bossSpawned: boolean;
  pools: {
    enemies: Enemy[];
    bullets: Bullet[];
    sparks: Spark[];
    drops: Drop[];
    texts: CombatText[];
  };
};
export type Snapshot = {
  equippedWeapon?: WeaponSnapshot;
  runId?: string;
  statuses: string[];
  phase: GamePhase;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
  kills: number;
  wave: number;
  time: number;
  enemies: number;
  offers: UpgradeId[];
  weaponId: WeaponId;
  damage: number;
  interval: number;
  range: number;
  crit: number;
  boss: { hp: number; maxHp: number; phase: number } | null;
  stacks: Partial<Record<UpgradeId, number>>;
};
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
const dist2 = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
export function makeGame(
  width = FOREST.width,
  height = FOREST.height,
  weaponId: WeaponId = "arcane",
  rng: () => number = Math.random,
): Game {
  const w = WEAPONS[weaponId];
  return {
    character: "wanderer",
    feedback: [],
    feedbackPool: [],
    phase: "menu",
    focus: 0,
    width,
    height,
    time: 0,
    wave: 1,
    kills: 0,
    gold: 0,
    level: 1,
    xp: 0,
    xpToNext: 25,
    weaponId,
    rng,
    player: {
      x: width / 2,
      y: height / 2,
      r: 12,
      hp: 100,
      maxHp: 100,
      speed: 180,
      angle: 0,
      facing: "down",
      attackUntil: 0,
      invincible: 0,
      moving: false,
      hit: 0,
    },
    weapon: {
      damage: w.damage,
      delay: w.interval,
      projectiles: w.projectiles ?? 1,
      cooldown: 0.3,
      range: w.range,
      speed: w.speed,
      area: 1,
      crit: 0.05,
      critDamage: 1.5,
    },
    regen: 0,
    pickupRadius: 72,
    enemies: [],
    bullets: [],
    drops: [],
    sparks: [],
    texts: [],
    hazards: [],
    obstacles:
      width === FOREST.width && height === FOREST.height
        ? OBSTACLES.map((o) => ({ ...o }))
        : [],
    spawnCooldown: 0.8,
    nextId: 1,
    offers: [],
    stacks: {},
    bossSpawned: false,
    pools: { enemies: [], bullets: [], sparks: [], drops: [], texts: [] },
  };
}
export function beginGame(g: Game) {
  if (g.phase !== "menu") return;
  g.phase = "playing";
  for (let i = 0; i < 4; i++) spawnEnemy(g, "slime");
}
export function togglePause(g: Game) {
  if (g.phase === "playing") g.phase = "paused";
  else if (g.phase === "paused") g.phase = "playing";
}
export function snapshot(g: Game): Snapshot {
  const boss = g.enemies.find((e) => e.kind === "boss");
  return {
    equippedWeapon: g.equippedWeapon,
    runId: g.id,
    statuses: g.campaign
      ? [
          ...(g.campaign.slow > 0
            ? [g.campaign.world.hazard.kind === "ice" ? "CHILLED" : "HINDERED"]
            : []),
          ...(g.campaign.burn > 0 ? ["BURNING"] : []),
          ...(g.focus > 0 ? ["FOCUSED"] : []),
          ...(g.campaign.exposure > 0 && g.campaign.exposure < 0.8
            ? [
                g.campaign.world.id === "infernal"
                  ? "MOLTEN FLOOR · MOVE"
                  : "THIN ICE · MOVE",
              ]
            : []),
        ]
      : [],
    phase: g.phase,
    hp: Math.ceil(g.player.hp),
    maxHp: g.player.maxHp,
    level: g.level,
    xp: Math.floor(g.xp),
    xpToNext: g.xpToNext,
    gold: g.gold,
    kills: g.kills,
    wave: g.wave,
    time: Math.floor(g.time),
    enemies: g.enemies.length,
    offers: [...g.offers],
    weaponId: g.weaponId,
    damage: g.weapon.damage,
    interval: g.weapon.delay,
    range: attackRange(attackDefinition(g), g.weapon.range, g.weapon.area),
    crit: g.weapon.crit,
    stacks: { ...g.stacks },
    boss: boss
      ? {
          hp: Math.ceil(boss.hp),
          maxHp: boss.maxHp,
          phase: boss.hp <= boss.maxHp / 2 ? 2 : 1,
        }
      : null,
  };
}
// Retained utility for small simulation fixtures. Browser resizing changes camera, never world coordinates.
export function resizeGame(g: Game, width: number, height: number) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 40 ||
    height < 40
  )
    return;
  const sx = width / g.width,
    sy = height / g.height;
  for (const list of [
    [g.player],
    g.enemies,
    g.bullets,
    g.drops,
    g.sparks,
    g.obstacles,
    g.hazards,
    g.texts,
  ])
    for (const e of list) {
      e.x *= sx;
      e.y *= sy;
    }
  g.width = width;
  g.height = height;
}
export function advanceGame(g: Game, seconds: number, x: number, y: number) {
  let remaining = Math.min(
    0.12,
    Math.max(0, Number.isFinite(seconds) ? seconds : 0),
  );
  while (remaining > 0.00001 && g.phase === "playing") {
    const dt = Math.min(0.02, remaining);
    updateGame(g, dt, x, y);
    remaining -= dt;
  }
}
export function chooseUpgrade(g: Game, id: UpgradeId) {
  const def = UPGRADES.find((u) => u.id === id);
  if (
    g.phase !== "upgrade" ||
    !g.offers.includes(id) ||
    !def ||
    (g.stacks[id] ?? 0) >= def.max
  )
    return false;
  g.stacks[id] = (g.stacks[id] ?? 0) + 1;
  const w = g.weapon;
  switch (id) {
    case "power":
      w.damage += attackDefinition(g).damage * 0.25;
      break;
    case "rapid":
      w.delay *= 0.88;
      break;
    case "stride":
      g.player.speed += 18;
      break;
    case "vitality":
      g.player.maxHp += 25;
      g.player.hp = Math.min(g.player.maxHp, g.player.hp + 25);
      break;
    case "critical":
      w.crit = Math.min(0.5, w.crit + 0.05);
      break;
    case "fury":
      w.critDamage += 0.25;
      break;
    case "multishot":
      w.projectiles++;
      break;
    case "velocity":
      if (["slash", "sweep"].includes(attackDefinition(g).kind ?? ""))
        w.range += attackDefinition(g).range * 0.08;
      else w.speed += attackDefinition(g).speed * 0.2;
      break;
    case "area":
      w.area += 0.2;
      w.range += attackDefinition(g).range * 0.08;
      break;
    case "regen":
      g.regen += 0.5;
      break;
    case "magnet":
      g.pickupRadius += 30;
      break;
  }
  if (g.build) applyBuild(g, g.build);
  g.offers = [];
  g.phase = "playing";
  emit(g, g.player.x, g.player.y, "#e9cf82", 30);
  feedback(g, "level", g.player.x, g.player.y, 0xe9cf82, 64, 0, true);
  checkLevel(g);
  return true;
}
function checkLevel(g: Game) {
  if (g.xp < g.xpToNext) return;
  const available = UPGRADES.filter(
    (u) =>
      (g.stacks[u.id] ?? 0) < u.max &&
      !(
        u.id === "critical" && g.weapon.crit >= (g.build ? 0.75 : 0.5) - 0.00001
      ) &&
      !(u.id === "multishot" && g.weapon.projectiles >= 8) &&
      !(u.id === "power" && g.weapon.damage >= 10000) &&
      !(u.id === "rapid" && g.weapon.delay <= 0.120001) &&
      !(u.id === "fury" && g.weapon.critDamage >= 4) &&
      !(u.id === "stride" && g.player.speed >= 360) &&
      !(u.id === "vitality" && g.player.maxHp >= 5000) &&
      !(u.id === "regen" && g.regen >= 20) &&
      !(u.id === "area" && g.weapon.area >= 4),
  );
  if (!available.length) return;
  g.xp -= g.xpToNext;
  g.level++;
  g.xpToNext = Math.floor(g.xpToNext * 1.19 + 6);
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(g.rng() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  g.offers = available.slice(0, 3).map((u) => u.id);
  g.phase = "upgrade";
  feedback(g, "level", g.player.x, g.player.y, 0xe9cf82, 80, 0, true);
}
export function spawnEnemy(g: Game, kind: EnemyKind, x?: number, y?: number) {
  if (g.enemies.length >= FOREST.maxEnemies) {
    if (kind !== "boss") return;
    // The scripted encounter must still spawn when lesser enemies fill the cap.
    const lesser = g.enemies.findIndex((e) => e.kind !== "boss");
    if (lesser < 0) return;
    g.pools.enemies.push(g.enemies.splice(lesser, 1)[0]);
  }
  const d = ENEMIES[kind],
    angle = g.rng() * Math.PI * 2,
    radius = 520;
  let ex = clamp(x ?? g.player.x + Math.cos(angle) * radius, 30, g.width - 30),
    ey = clamp(y ?? g.player.y + Math.sin(angle) * radius, 30, g.height - 30);
  // Clamping an outward spawn near a world edge must not put it on the player.
  if (
    x === undefined &&
    y === undefined &&
    (ex - g.player.x) ** 2 + (ey - g.player.y) ** 2 < 320 ** 2
  ) {
    ex = clamp(g.player.x - Math.cos(angle) * radius, 30, g.width - 30);
    ey = clamp(g.player.y - Math.sin(angle) * radius, 30, g.height - 30);
  }
  const scale = kind === "boss" ? 1 : 1 + g.time / 960;
  const e = g.pools.enemies.pop() ?? ({} as Enemy);
  Object.assign(e, {
    id: g.nextId++,
    x: ex,
    y: ey,
    r: d.radius,
    hp: d.hp * scale,
    maxHp: d.hp * scale,
    speed: d.speed,
    contact: 0,
    kind,
    attack: kind === "boss" ? 2 : 1 + g.rng() * 2,
    slow: 0,
    hit: 0,
    age: 0,
    enraged: false,
    pattern: 0,
    charge: undefined,
  });
  if (g.campaign) {
    const c = g.campaign,
      def = c.world.enemies.find((d) => d.kind === kind);
    const scaling = enemyScale(g.level, c.world.id, c.definition.number, kind);
    e.level = scaling.level;
    e.damageScale = scaling.damage;
    e.hp = e.maxHp =
      (kind === "boss" ? c.world.boss.hp : def!.hp) *
      c.definition.modifiers.health *
      c.difficulty.hp * scaling.hp;
    e.speed = (def?.speed ?? d.speed) * c.difficulty.speed * scaling.speed;
    e.pattern = 0;
    e.charge = undefined;
  }
  g.enemies.push(e);
  if (kind === "boss")
    feedback(g, "bossSpawn", e.x, e.y, 0xe2b781, 125, 0, true);
  return e;
}
function emit(g: Game, x: number, y: number, color: string, count: number) {
  for (let i = 0; i < count && g.sparks.length < FOREST.maxParticles; i++) {
    const a = g.rng() * Math.PI * 2,
      s = 30 + g.rng() * 100;
    const p = g.pools.sparks.pop() ?? ({} as Spark);
    Object.assign(p, {
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      age: 0,
      life: 0.25 + g.rng() * 0.35,
      color,
      size: 2 + g.rng() * 2,
    });
    g.sparks.push(p);
  }
}
function text(
  g: Game,
  x: number,
  y: number,
  value: string,
  critical = false,
  kind: CombatText["kind"] = "damage",
  color = "#dbbf8b",
) {
  if (g.texts.length >= 60) return;
  const entry = g.pools.texts.pop() ?? ({} as CombatText);
  Object.assign(entry, {
    x,
    y,
    value,
    critical,
    color,
    kind,
    age: 0,
    life: kind === "death" ? 0.5 : 0.65,
  });
  g.texts.push(entry);
}
function damage(g: Game, e: Enemy, amount: number, critical: boolean) {
  if (e.hp <= 0) return;
  e.hp -= amount;
  e.hit = 0.14;
  const angle = Math.atan2(e.y - g.player.y, e.x - g.player.x);
  if (g.weaponId === "daggers" && e.kind !== "boss") {
    e.x += Math.cos(angle) * (critical ? 7 : 3);
    e.y += Math.sin(angle) * (critical ? 7 : 3);
  }
  feedback(
    g,
    "spark",
    e.x,
    e.y,
    critical ? 0xffdf9b : 0xb7edcb,
    critical ? 28 : 15,
    angle,
    critical,
  );
  text(g, e.x, e.y - e.r, String(Math.round(amount)), critical);
  emit(g, e.x, e.y, critical ? "#ffe09b" : "#b7edcb", 4);
}
function hurt(g: Game, amount: number, from: { x: number; y: number }) {
  const p = g.player;
  if (g.phase !== "playing") return;
  if (p.invincible > 0) {
    feedback(g, "shield", p.x, p.y, 0x9bbdcc, 22);
    return;
  }
  amount = incomingDamage(amount, p.armor ?? 0);
  p.hp = Math.max(0, p.hp - amount);
  p.invincible = 0.7;
  p.hit = 0.2;
  const dx = p.x - from.x,
    dy = p.y - from.y,
    d = Math.max(1, Math.hypot(dx, dy));
  p.x += (dx / d) * 16;
  p.y += (dy / d) * 16;
  resolveObstacles(g, p);
  text(g, p.x, p.y - 20, "−" + Math.round(amount), false, "damage", "#ffab98");
  feedback(g, "damage", p.x, p.y, 0xf19a8b, 42, 0, true);
  emit(g, p.x, p.y, "#f19a8b", 14);
  if (p.hp <= 0) {
    g.phase = "gameover";
    feedback(g, "death", p.x, p.y, 0x9aaec2, 70, 0, true);
    text(g, p.x, p.y, "player", false, "death");
    emit(g, p.x, p.y, "#a2bcd3", 30);
  }
}
function addBullet(g: Game, b: Bullet) {
  if (g.bullets.length >= FOREST.maxBullets) return;
  const pooled = g.pools.bullets.pop() ?? ({} as Bullet);
  Object.assign(
    pooled,
    { hostile: false, blast: 0, critical: false, sprite: 0 },
    b,
  );
  if (b.hostile && g.campaign) pooled.damage *= g.campaign.difficulty.damage;
  g.bullets.push(pooled);
}
function shoot(g: Game) {
  const w = g.weapon,
    p = g.player,
    attack = attackDefinition(g);
  let target: Enemy | undefined,
    min =
      (w.range *
        (attack.kind === "pulse" ||
        attack.kind === "slash" ||
        attack.kind === "sweep"
          ? w.area
          : 1)) **
      2;
  for (const e of g.enemies) {
    const d = dist2(e, p);
    if (e.hp > 0 && d < min) {
      min = d;
      target = e;
    }
  }
  if (!target) return;
  p.angle = Math.atan2(target.y - p.y, target.x - p.x);
  p.facing = facingFromAngle(p.angle);
  p.attackUntil = g.time + 0.22;
  p.attackAngle = p.angle;
  const color = Number.parseInt(attack.color.slice(1), 16);
  if (attack.kind === "slash" || attack.kind === "sweep") {
    const radius = w.range * w.area,
      arc = Math.min(Math.PI * 2, (attack.arc ?? 1.8) * Math.sqrt(w.area));
    feedback(
      g,
      "slash",
      p.x,
      p.y,
      color,
      radius,
      p.angle,
      false,
      p.x,
      p.y,
      arc,
    );
    for (const enemy of g.enemies) {
      if (enemy.hp <= 0 || dist2(enemy, p) > (radius + enemy.r) ** 2) continue;
      const angle = Math.atan2(enemy.y - p.y, enemy.x - p.x),
        difference = Math.atan2(
          Math.sin(angle - p.angle),
          Math.cos(angle - p.angle),
        );
      if (Math.abs(difference) > arc / 2) continue;
      const critical = g.rng() < w.crit;
      damage(
        g,
        enemy,
        w.damage *
          (1 + (w.projectiles - 1) * 0.15) *
          (critical ? w.critDamage : 1),
        critical,
      );
      if (attack.kind === "sweep")
        feedback(g, "burn", enemy.x, enemy.y, color, 14);
    }
    emit(
      g,
      p.x + Math.cos(p.angle) * radius * 0.6,
      p.y + Math.sin(p.angle) * radius * 0.6,
      attack.color,
      7,
    );
    return;
  }
  feedback(
    g,
    g.weaponId === "daggers"
      ? "slash"
      : g.weaponId === "fire"
        ? "burn"
        : g.weaponId === "frost"
          ? "freeze"
          : "magic",
    p.x,
    p.y,
    color,
    g.weaponId === "frost" ? w.range * w.area : 36,
    p.angle,
  );
  if (attack.kind === "pulse" || g.weaponId === "frost") {
    const radius = w.range * w.area;
    text(g, p.x, p.y, String(radius), false, "pulse", "#b5f1ec");
    for (const e of g.enemies)
      if (dist2(e, p) < radius * radius) {
        const crit = g.rng() < w.crit;
        damage(
          g,
          e,
          w.damage *
            (1 + (w.projectiles - 1) * 0.15) *
            (crit ? w.critDamage : 1),
          crit,
        );
        e.slow = 2 + (g.stacks.velocity ?? 0) * 0.4;
      }
    emit(g, p.x, p.y, "#b5f1ec", 20);
    return;
  }
  for (let i = 0; i < w.projectiles; i++) {
    const a = p.angle + (i - (w.projectiles - 1) / 2) * 0.12,
      crit = g.rng() < w.crit;
    addBullet(g, {
      x: p.x + Math.cos(a) * 16,
      y: p.y + Math.sin(a) * 16,
      vx: Math.cos(a) * w.speed,
      vy: Math.sin(a) * w.speed,
      r: g.weaponId === "fire" ? 7 : 4,
      life: w.range / w.speed,
      damage: w.damage * (crit ? w.critDamage : 1),
      color: attack.color,
      blast: (attack.blast ?? 0) * w.area,
      critical: crit,
      sprite: attack.icon,
    });
  }
  emit(
    g,
    p.x + Math.cos(p.angle) * 16,
    p.y + Math.sin(p.angle) * 16,
    attack.color,
    3,
  );
}
function resolveObstacles(g: Game, e: { x: number; y: number; r: number }) {
  e.x = clamp(e.x, e.r + 9, g.width - e.r - 9);
  e.y = clamp(e.y, e.r + 9, g.height - e.r - 9);
  for (const o of g.obstacles) {
    const dx = e.x - o.x,
      dy = e.y - o.y,
      d = Math.hypot(dx, dy),
      r = e.r + o.r;
    if (d < r && d > 0.001) {
      e.x = o.x + (dx / d) * r;
      e.y = o.y + (dy / d) * r;
    }
  }
}
// Reused spatial buckets avoid all-pairs projectile and separation work.
class SpatialGrid {
  buckets = new Map<number, Enemy[]>();
  used: Enemy[][] = [];
  cell = 80;
  key(x: number, y: number) {
    return Math.floor(x / this.cell) + Math.floor(y / this.cell) * 65536;
  }
  build(enemies: Enemy[]) {
    for (const b of this.used) b.length = 0;
    this.used.length = 0;
    for (const e of enemies) {
      const key = this.key(e.x, e.y);
      let b = this.buckets.get(key);
      if (!b) {
        b = [];
        this.buckets.set(key, b);
      }
      if (!b.length) this.used.push(b);
      b.push(e);
    }
  }
  each(x: number, y: number, r: number, fn: (e: Enemy) => void) {
    for (
      let cy = Math.floor((y - r) / this.cell);
      cy <= Math.floor((y + r) / this.cell);
      cy++
    )
      for (
        let cx = Math.floor((x - r) / this.cell);
        cx <= Math.floor((x + r) / this.cell);
        cx++
      ) {
        const b = this.buckets.get(cx + cy * 65536);
        if (b) for (const e of b) fn(e);
      }
  }
}
// Each run has its own index; no cross-run mutable simulation state.
const grids = new WeakMap<Game, SpatialGrid>();
function enemyAttacks(g: Game, e: Enemy, dt: number) {
  if (e.kind === "boss" && e.hp <= e.maxHp / 2 && !e.enraged) {
    e.enraged = true;
    feedback(g, "phase", e.x, e.y, 0xefb689, 100, 0, true);
  }
  e.attack = (e.attack ?? 2) - dt;
  if (e.attack > 0) return;
  const angle = Math.atan2(g.player.y - e.y, g.player.x - e.x);
  if (e.kind === "boss")
    feedback(g, "telegraph", e.x, e.y, 0xf1c795, 50, 0, true);
  if (e.kind === "boss" && g.campaign) {
    campaignBossAttack(g, e, {
      hurt: (amount, from) => hurt(g, amount, from),
      spawn: (kind, x, y) => spawnEnemy(g, kind, x, y),
      bullet: (b) => addBullet(g, b),
    });
    return;
  }
  const behavior = g.campaign?.world.enemies.find(
    (d) => d.kind === e.kind,
  )?.behavior;
  if (g.campaign && behavior === "denial") {
    g.hazards.push({
      x: g.player.x,
      y: g.player.y,
      r: 40,
      age: 0,
      delay: 1.5,
      damage: 12,
      slow: g.campaign.world.hazard.slow,
      color: g.campaign.world.hazard.color,
    });
    e.attack = 5;
    return;
  }
  if (behavior === "ranged" || (!g.campaign && e.kind === "caster")) {
    addBullet(g, {
      x: e.x,
      y: e.y,
      vx: Math.cos(angle) * 155,
      vy: Math.sin(angle) * 155,
      r: 6,
      life: 4,
      damage: 10,
      color: "#cd90e2",
      hostile: true,
      sprite: 4,
    });
    if (g.campaign && g.campaign.difficulty.projectiles > 1) {
      for (let i = 1; i < g.campaign.difficulty.projectiles; i++) {
        const a = angle + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.17;
        addBullet(g, {
          x: e.x,
          y: e.y,
          vx: Math.cos(a) * 155,
          vy: Math.sin(a) * 155,
          r: 6,
          life: 4,
          damage: 10,
          color: g.campaign.world.colors[2],
          hostile: true,
          sprite: 4,
        });
      }
    }
    e.attack = 2.8;
  }
  if (e.kind === "boss") {
    const enraged = e.hp <= e.maxHp * 0.5;
    // Root eruptions lock the player's current position, leaving time to move away.
    for (let i = 0; i < (enraged ? 3 : 1); i++)
      g.hazards.push({
        x: clamp(
          g.player.x + (i ? Math.cos(angle + i * 2) * 95 : 0),
          40,
          g.width - 40,
        ),
        y: clamp(
          g.player.y + (i ? Math.sin(angle + i * 2) * 95 : 0),
          40,
          g.height - 40,
        ),
        r: enraged ? 65 : 55,
        age: 0,
        delay: 1.3,
        damage: 25,
      });
    const n = enraged ? 12 : 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (e.age ?? 0) * 0.25;
      addBullet(g, {
        x: e.x,
        y: e.y,
        vx: Math.cos(a) * (enraged ? 150 : 115),
        vy: Math.sin(a) * (enraged ? 150 : 115),
        r: 7,
        life: 5,
        damage: 18,
        color: "#e4b97a",
        hostile: true,
        sprite: 4,
      });
    }
    e.attack = enraged ? 2.5 : 3.8;
  }
}
export function updateGame(
  g: Game,
  dt: number,
  inputX: number,
  inputY: number,
) {
  if (g.phase !== "playing") return;
  const step = Math.min(0.05, Math.max(0, dt));
  if (!step) return;
  const p = g.player;
  if (g.focus > 0) {
    g.focus = Math.max(0, g.focus - step);
    if (g.focus === 0 && g.build) applyBuild(g, g.build);
  }
  g.time += step;
  g.wave = 1 + Math.floor(g.time / 60);
  p.invincible = Math.max(0, p.invincible - step);
  p.hit = Math.max(0, p.hit - step);
  p.hp = Math.min(p.maxHp, p.hp + g.regen * step);
  const mag = Math.max(1, Math.hypot(inputX, inputY));
  const movement =
    g.campaign && g.campaign.slow > 0 ? g.campaign.world.hazard.slow : 1;
  const mx = (inputX / mag) * movement,
    my = (inputY / mag) * movement;
  p.moving = Math.abs(mx) + Math.abs(my) > 0.01;
  p.x += mx * p.speed * step;
  p.y += my * p.speed * step;
  if (p.moving) {
    p.angle = Math.atan2(my, mx);
    if ((p.attackUntil ?? 0) <= g.time) p.facing = facingFromAngle(p.angle);
  }
  resolveObstacles(g, p);
  environmentStep(g, step, {
    hurt: (amount, from) => hurt(g, amount, from),
    spawn: (kind, x, y) => spawnEnemy(g, kind, x, y),
    bullet: (b) => addBullet(g, b),
  });
  if (p.hp <= 0) return;
  const duration =
    g.campaign?.activity === "farming"
      ? Infinity
      : g.campaign
        ? g.campaign.definition.clear.seconds * g.campaign.difficulty.duration
        : FOREST.duration;
  if (
    g.campaign &&
    g.time >= duration &&
    g.campaign.definition.clear.kind === "survive"
  ) {
    g.phase = "victory";
    feedback(g, "rare", p.x, p.y, 0xe9cf82, 90, 0, true);
    return;
  }
  if (g.time >= duration && !g.bossSpawned) {
    g.bossSpawned = true;
    spawnEnemy(g, "boss");
  }
  g.spawnCooldown -= step;
  if (g.spawnCooldown <= 0) {
    if (!g.bossSpawned) {
      const kinds = g.campaign
        ? g.campaign.definition.spawn.composition
        : (Object.keys(ENEMIES) as EnemyKind[]).filter(
            (k) => k !== "boss" && ENEMIES[k].from <= g.time,
          );
      const kind =
        g.campaign && g.rng() < g.campaign.difficulty.elites
          ? "elite"
          : kinds[Math.floor(g.rng() * kinds.length)];
      spawnEnemy(g, kind);
      if (g.time > 360)
        spawnEnemy(g, kinds[Math.floor(g.rng() * kinds.length)]);
    }
    g.spawnCooldown += g.campaign
      ? (Math.max(0.18, g.campaign.definition.spawn.interval - g.time * 0.001) *
          g.campaign.difficulty.spawn) /
        g.campaign.definition.modifiers.pressure
      : Math.max(0.22, 1.3 - g.time * 0.0021);
  }
  g.weapon.cooldown -= step;
  if (g.weapon.cooldown <= 0) {
    shoot(g);
    g.weapon.cooldown += g.weapon.delay;
  }
  let grid = grids.get(g);
  if (!grid) {
    grid = new SpatialGrid();
    grids.set(g, grid);
  }
  grid.build(g.enemies);
  for (const e of g.enemies) {
    if (e.hp <= 0) continue;
    e.age = (e.age ?? 0) + step;
    e.hit = Math.max(0, (e.hit ?? 0) - step);
    e.slow = Math.max(0, (e.slow ?? 0) - step);
    const dx = p.x - e.x,
      dy = p.y - e.y,
      d = Math.max(0.001, Math.hypot(dx, dy));
    const behavior = g.campaign?.world.enemies.find(
      (d) => d.kind === e.kind,
    )?.behavior;
    const ranged =
      behavior === "ranged" || (!g.campaign && e.kind === "caster");
    const stop = ranged ? 225 : e.r + p.r - 2;
    const burst =
      (behavior === "charge" || (!g.campaign && e.kind === "wolf")) &&
      e.age % 3 < 0.65
        ? 2.1
        : 1;
    const speed = e.speed * burst * ((e.slow ?? 0) > 0 ? 0.45 : 1);
    if (e.charge) {
      e.charge.delay -= step;
      if (e.charge.delay <= 0) {
        e.x += e.charge.vx * step;
        e.y += e.charge.vy * step;
        e.charge.left -= step;
        if (e.charge.left <= 0) e.charge = undefined;
      }
    } else if (d > stop) {
      e.x += (dx / d) * speed * step;
      e.y += (dy / d) * speed * step;
    } else if (ranged && d < 150) {
      e.x -= (dx / d) * speed * 0.6 * step;
      e.y -= (dy / d) * speed * 0.6 * step;
    }
    grid.each(e.x, e.y, 60, (other) => {
      if (other.id >= e.id) return;
      const ax = e.x - other.x,
        ay = e.y - other.y,
        dd = Math.hypot(ax, ay),
        r = e.r + other.r;
      if (dd < r && dd > 0.01) {
        const push = Math.min(1.5, (r - dd) * 0.12);
        e.x += (ax / dd) * push;
        e.y += (ay / dd) * push;
        other.x -= (ax / dd) * push;
        other.y -= (ay / dd) * push;
      }
    });
    resolveObstacles(g, e);
    e.contact -= step;
    if (dist2(e, p) < (e.r + p.r) ** 2 && e.contact <= 0) {
      hurt(
        g,
        g.campaign
          ? Math.round(
              (g.campaign.world.enemies.find((d) => d.kind === e.kind)
                ?.damage ?? 25) * g.campaign.difficulty.damage,
            ) * (e.damageScale ?? 1)
          : ENEMIES[e.kind].damage,
        e,
      );
      e.contact = 0.7;
    }
    enemyAttacks(g, e, step);
    if (g.player.hp <= 0) return;
  }
  grid.build(g.enemies);
  for (let i = g.bullets.length - 1; i >= 0; i--) {
    const b = g.bullets[i],
      fx = b.x,
      fy = b.y,
      dx = b.vx * step,
      dy = b.vy * step;
    b.x += dx;
    b.y += dy;
    b.life -= step;
    let hit: Enemy | undefined,
      hitT = Infinity;
    const len = dx * dx + dy * dy;
    if (b.hostile) {
      const t = len
        ? clamp(((p.x - fx) * dx + (p.y - fy) * dy) / len, 0, 1)
        : 0;
      if (
        (fx + dx * t - p.x) ** 2 + (fy + dy * t - p.y) ** 2 <
        (p.r + b.r) ** 2
      ) {
        hurt(g, b.damage, b);
        if (g.campaign?.world.id === "frozen") g.campaign.slow = 1.5;
        if (g.campaign?.world.id === "infernal") g.campaign.burn = 2;
        b.life = 0;
      }
    } else {
      grid.each(
        (fx + b.x) / 2,
        (fy + b.y) / 2,
        Math.hypot(dx, dy) / 2 + 45,
        (e) => {
          if (e.hp <= 0) return;
          const t = len
            ? clamp(((e.x - fx) * dx + (e.y - fy) * dy) / len, 0, 1)
            : 0;
          if (
            (fx + dx * t - e.x) ** 2 + (fy + dy * t - e.y) ** 2 <=
              (e.r + b.r) ** 2 &&
            t < hitT
          ) {
            hit = e;
            hitT = t;
          }
        },
      );
      if (hit) {
        const target = hit as Enemy;
        damage(g, target, b.damage, b.critical ?? false);
        if (b.blast) {
          feedback(g, "explosion", target.x, target.y, 0xffb369, b.blast);
          emit(g, target.x, target.y, "#ffb369", 20);
          text(g, target.x, target.y, String(b.blast), false, "pulse");
          grid.each(target.x, target.y, b.blast + 40, (e) => {
            if (e !== target && dist2(e, target) < (b.blast ?? 0) ** 2)
              damage(g, e, b.damage * 0.7, b.critical ?? false);
          });
        }
        b.life = 0;
      }
    }
    if (b.life <= 0 || b.x < 0 || b.x > g.width || b.y < 0 || b.y > g.height) {
      g.pools.bullets.push(b);
      g.bullets.splice(i, 1);
    }
  }
  for (let i = g.hazards.length - 1; i >= 0; i--) {
    const h = g.hazards[i];
    h.age += step;
    if (h.age >= h.delay) {
      if (dist2(h, p) < (h.r + p.r) ** 2) {
        if (h.damage > 0) hurt(g, h.damage, h);
        if (g.campaign) {
          if ((h.slow ?? 1) < 1) g.campaign.slow = 3;
          if (h.burn) g.campaign.burn = h.burn;
        }
      }
      feedback(g, "shockwave", h.x, h.y, h.color ?? 0xe7b28c, h.r);
      emit(g, h.x, h.y, "#d2b47b", 20);
      text(g, h.x, h.y, String(h.r), false, "pulse");
      g.hazards.splice(i, 1);
    }
  }
  // Defeat takes precedence over a simultaneous boss kill; dead players cannot heal.
  if (g.player.hp <= 0) return;
  for (let i = g.enemies.length - 1; i >= 0; i--) {
    const e = g.enemies[i];
    if (e.hp > 0) continue;
    g.kills++;
    if (g.campaign) {
      if (e.kind === "boss") g.campaign.bosses++;
      else if (e.kind === "elite") g.campaign.elites++;
      else g.campaign.enemies++;
    }
    // Legacy practice score only. Campaign currency is settled by the economy service.
    if (!g.campaign) g.gold += ENEMIES[e.kind].gold;
    const drop = g.pools.drops.pop() ?? ({} as Drop);
    Object.assign(drop, {
      x: e.x,
      y: e.y,
      r: 6,
      value: ENEMIES[e.kind].xp,
      kind: "xp",
    });
    g.drops.push(drop);
    if (g.rng() < 0.06)
      g.drops.push({ x: e.x + 8, y: e.y, r: 7, value: 18, kind: "heal" });
    emit(g, e.x, e.y, "#bbd397", 12);
    text(g, e.x, e.y, e.kind, false, "death");
    g.pools.enemies.push(e);
    g.enemies.splice(i, 1);
    feedback(
      g,
      e.kind === "boss" ? "bossDeath" : "death",
      e.x,
      e.y,
      0xc5d3a0,
      e.kind === "boss" ? 150 : 28,
      0,
      e.kind === "boss",
    );
    if (e.kind === "boss" && g.campaign?.activity !== "farming") {
      g.phase = "victory";
      if (!g.campaign) g.gold += 150;
    }
  }
  while (g.drops.length > FOREST.maxDrops) {
    const d = g.drops.shift();
    if (d) g.pools.drops.push(d);
  }
  for (let i = g.drops.length - 1; i >= 0; i--) {
    const d = g.drops[i],
      dx = p.x - d.x,
      dy = p.y - d.y,
      dist = Math.hypot(dx, dy);
    if (dist < g.pickupRadius && dist > 1) {
      const travel = Math.min(dist, (150 + (g.pickupRadius - dist) * 8) * step);
      d.x += (dx / dist) * travel;
      d.y += (dy / dist) * travel;
    }
    if (dist2(d, p) < (p.r + d.r + 7) ** 2) {
      g.pools.drops.push(d);
      g.drops.splice(i, 1);
      if (d.kind === "heal") {
        const healed = Math.min(p.maxHp - p.hp, d.value);
        p.hp += healed;
        text(
          g,
          p.x,
          p.y - 25,
          "+" + Math.round(healed),
          false,
          "damage",
          "#a8e3bb",
        );
        feedback(g, "heal", p.x, p.y, 0xa8e3bb, 30, 0, true);
      } else {
        g.xp += d.value;
        feedback(g, "pickup", d.x, d.y, 0xb5dfc6, 12);
      }
      emit(g, d.x, d.y, "#bbefd4", 3);
    }
  }
  if (g.phase === "playing") checkLevel(g);
  advanceEffects(g, step);
}
export function advanceEffects(g: Game, step: number) {
  for (let i = g.sparks.length - 1; i >= 0; i--) {
    const s = g.sparks[i];
    s.age += step;
    s.x += s.vx * step;
    s.y += s.vy * step;
    if (s.age > s.life) {
      g.pools.sparks.push(s);
      g.sparks.splice(i, 1);
    }
  }
  for (let i = g.texts.length - 1; i >= 0; i--) {
    const t = g.texts[i];
    t.age += step;
    if (t.age > t.life) {
      g.pools.texts.push(t);
      g.texts.splice(i, 1);
    }
  }
}

/** The same derived build used by the character screen feeds the simulation once per change. */
export function applyBuild(g: Game, base: CharacterStats, fullHealth = false) {
  g.build = base;
  if (fullHealth && g.equippedWeapon) {
    g.weapon.range = g.equippedWeapon.attack.range;
    g.weapon.speed = g.equippedWeapon.attack.speed;
  }
  const s = temporaryStats(
    base,
    g.weaponId,
    g.stacks,
    g.focus > 0,
    attackDefinition(g),
  );
  Object.assign(g.player, { maxHp: s.maxHp, speed: s.speed, armor: s.armor });
  g.player.hp = fullHealth ? s.maxHp : Math.min(g.player.hp, s.maxHp);
  Object.assign(g.weapon, {
    damage: s.damage,
    delay: s.interval,
    crit: s.critChance,
    critDamage: s.critDamage,
    projectiles: s.projectiles,
    area: s.area,
  });
  g.regen = s.regen;
}
export function attackDefinition(g: Game) {
  return g.equippedWeapon?.attack ?? WEAPONS[g.weaponId];
}
