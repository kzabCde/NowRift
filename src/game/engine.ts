export type GamePhase = "menu" | "playing" | "paused" | "upgrade" | "gameover";
export type UpgradeId = "rapid" | "power" | "stride" | "vitality" | "multishot" | "magnet";

export type Upgrade = {
  id: UpgradeId;
  name: string;
  description: string;
  symbol: string;
  accent: string;
};

export const UPGRADES: Upgrade[] = [
  { id: "rapid", name: "Overclock", description: "Fire 20% faster", symbol: "⚡", accent: "#65e4fa" },
  { id: "power", name: "Core Surge", description: "+10 projectile damage", symbol: "✦", accent: "#ffb168" },
  { id: "stride", name: "Phase Step", description: "+12% movement speed", symbol: "➤", accent: "#a6a0ff" },
  { id: "vitality", name: "Reinforce", description: "+25 max HP and heal 25 HP", symbol: "♥", accent: "#fc7b9b" },
  { id: "multishot", name: "Split Shot", description: "Fire one additional projectile", symbol: "✳", accent: "#a8ec86" },
  { id: "magnet", name: "Gravitation", description: "Increase pickup radius by 38", symbol: "◎", accent: "#f0cb78" },
];

type EnemyKind = "drone" | "stalker" | "brute";
type Enemy = { id: number; x: number; y: number; r: number; hp: number; maxHp: number; speed: number; contact: number; kind: EnemyKind };
type Bullet = { x: number; y: number; vx: number; vy: number; r: number; life: number; damage: number; color: string };
type Drop = { x: number; y: number; r: number; value: number; kind: "xp" | "heal" };
type Spark = { x: number; y: number; vx: number; vy: number; age: number; life: number; color: string; size: number };

export type Joystick = { x: number; y: number; dx: number; dy: number } | null;
export type Game = {
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
  player: { x: number; y: number; r: number; hp: number; maxHp: number; speed: number; angle: number; invincible: number };
  weapon: { damage: number; delay: number; projectiles: number; cooldown: number; range: number };
  pickupRadius: number;
  enemies: Enemy[];
  bullets: Bullet[];
  drops: Drop[];
  sparks: Spark[];
  spawnCooldown: number;
  nextId: number;
  offers: UpgradeId[];
};

export type Snapshot = {
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
};

const random = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const distance = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

/**
 * Keep every world-space entity aligned with the resized arena.
 * Used when rotating a device and entering/leaving immersive mode.
 */
export function resizeGame(game: Game, width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 40 || height < 40) return;
  if (Math.abs(width - game.width) < 0.5 && Math.abs(height - game.height) < 0.5) return;

  const scaleX = width / Math.max(1, game.width);
  const scaleY = height / Math.max(1, game.height);
  game.width = width;
  game.height = height;

  const position = (entity: { x: number; y: number }) => {
    entity.x *= scaleX;
    entity.y *= scaleY;
  };

  position(game.player);
  game.player.x = clamp(game.player.x, game.player.r + 9, Math.max(game.player.r + 9, width - game.player.r - 9));
  game.player.y = clamp(game.player.y, game.player.r + 9, Math.max(game.player.r + 9, height - game.player.r - 9));
  game.enemies.forEach(position);
  game.bullets.forEach(position);
  game.drops.forEach(position);
  game.sparks.forEach(position);
}

/**
 * Advance using bounded substeps so low-FPS devices don't run in slow motion.
 * Cap large pauses to avoid sudden jumps after a suspended browser frame.
 */
export function advanceGame(game: Game, deltaSeconds: number, inputX: number, inputY: number) {
  let remaining = Math.min(0.12, Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0));
  while (remaining > 0.00001 && game.phase === "playing") {
    const step = Math.min(0.02, remaining);
    updateGame(game, step, inputX, inputY);
    remaining -= step;
  }
}

export function makeGame(width: number, height: number): Game {
  return {
    phase: "menu",
    width,
    height,
    time: 0,
    wave: 1,
    kills: 0,
    gold: 0,
    level: 1,
    xp: 0,
    xpToNext: 35,
    player: { x: width / 2, y: height / 2, r: 16, hp: 100, maxHp: 100, speed: 225, angle: 0, invincible: 0 },
    weapon: { damage: 30, delay: 0.5, projectiles: 1, cooldown: 0.3, range: 470 },
    pickupRadius: 72,
    enemies: [],
    bullets: [],
    drops: [],
    sparks: [],
    spawnCooldown: 0.8,
    nextId: 1,
    offers: [],
  };
}

export function beginGame(game: Game) {
  game.phase = "playing";
  for (let i = 0; i < 4; i++) spawnEnemy(game);
}

export function togglePause(game: Game) {
  if (game.phase === "playing") game.phase = "paused";
  else if (game.phase === "paused") game.phase = "playing";
}

export function chooseUpgrade(game: Game, id: UpgradeId): boolean {
  if (game.phase !== "upgrade" || !game.offers.includes(id)) return false;
  switch (id) {
    case "rapid": game.weapon.delay = Math.max(0.13, game.weapon.delay * 0.8); break;
    case "power": game.weapon.damage += 10; break;
    case "stride": game.player.speed *= 1.12; break;
    case "vitality":
      game.player.maxHp += 25;
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + 25);
      break;
    case "multishot": game.weapon.projectiles = Math.min(6, game.weapon.projectiles + 1); break;
    case "magnet": game.pickupRadius += 38; break;
  }
  game.offers = [];
  game.phase = "playing";
  return true;
}

export function snapshot(game: Game): Snapshot {
  return {
    phase: game.phase,
    hp: Math.ceil(game.player.hp),
    maxHp: game.player.maxHp,
    level: game.level,
    xp: Math.round(game.xp),
    xpToNext: game.xpToNext,
    gold: game.gold,
    kills: game.kills,
    wave: game.wave,
    time: Math.floor(game.time),
    enemies: game.enemies.length,
    offers: [...game.offers],
  };
}

function spawnEnemy(game: Game) {
  const side = Math.floor(random(0, 4));
  const inset = 22;
  const x = side === 0 ? -inset : side === 1 ? game.width + inset : random(0, game.width);
  const y = side === 2 ? -inset : side === 3 ? game.height + inset : random(0, game.height);
  const roll = Math.random();
  const kind: EnemyKind = game.wave > 1 && roll > 0.88 ? "brute" : roll > 0.72 ? "stalker" : "drone";
  const healthMultiplier = 1 + (game.wave - 1) * 0.19;
  const baseHp = kind === "brute" ? 145 : kind === "stalker" ? 36 : 58;
  const speed = kind === "brute" ? 44 : kind === "stalker" ? 111 : 67;
  game.enemies.push({
    id: game.nextId++, x, y, r: kind === "brute" ? 23 : kind === "stalker" ? 11 : 15,
    hp: baseHp * healthMultiplier, maxHp: baseHp * healthMultiplier,
    speed: speed + (game.wave - 1) * 4, contact: 0, kind,
  });
}

function emit(game: Game, x: number, y: number, color: string, count: number) {
  for (let i = 0; i < count; i++) {
    const angle = random(0, Math.PI * 2);
    const speed = random(28, 165);
    game.sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, life: random(0.19, 0.6), color, size: random(1.4, 3.8) });
  }
  if (game.sparks.length > 240) game.sparks.splice(0, game.sparks.length - 240);
}

function shoot(game: Game) {
  const player = game.player;
  let closest: Enemy | undefined;
  let closestDistance = game.weapon.range;
  for (const enemy of game.enemies) {
    const d = distance(enemy.x, enemy.y, player.x, player.y);
    if (d < closestDistance) { closest = enemy; closestDistance = d; }
  }
  if (!closest) return;
  const base = Math.atan2(closest.y - player.y, closest.x - player.x);
  player.angle = base;
  const shots = game.weapon.projectiles;
  for (let i = 0; i < shots; i++) {
    const angle = base + (i - (shots - 1) / 2) * 0.16;
    const speed = 565;
    game.bullets.push({
      x: player.x + Math.cos(angle) * 19,
      y: player.y + Math.sin(angle) * 19,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 5, life: 1.05, damage: game.weapon.damage, color: "#72e7ff",
    });
  }
  emit(game, player.x + Math.cos(base) * 21, player.y + Math.sin(base) * 21, "#79e5ff", 3);
}

function grantExperience(game: Game, amount: number) {
  game.xp += amount;
  if (game.xp < game.xpToNext) return;
  game.xp -= game.xpToNext;
  game.level += 1;
  game.xpToNext = Math.floor(game.xpToNext * 1.28 + 9);
  game.offers = [...UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3).map((u) => u.id);
  game.phase = "upgrade";
}

export function updateGame(game: Game, dt: number, inputX: number, inputY: number) {
  if (game.phase !== "playing") return;
  const step = Math.min(0.05, Math.max(0, dt));
  const p = game.player;
  game.time += step;
  game.wave = 1 + Math.floor(game.time / 35);
  p.invincible = Math.max(0, p.invincible - step);

  const magnitude = Math.hypot(inputX, inputY);
  const moveX = magnitude > 1 ? inputX / magnitude : inputX;
  const moveY = magnitude > 1 ? inputY / magnitude : inputY;
  p.x = clamp(p.x + moveX * p.speed * step, p.r + 9, Math.max(p.r + 9, game.width - p.r - 9));
  p.y = clamp(p.y + moveY * p.speed * step, p.r + 9, Math.max(p.r + 9, game.height - p.r - 9));

  game.spawnCooldown -= step;
  if (game.spawnCooldown <= 0 && game.enemies.length < 90) {
    spawnEnemy(game);
    if (game.wave > 2 && Math.random() > 0.7) spawnEnemy(game);
    game.spawnCooldown += Math.max(0.3, 1.13 - (game.wave - 1) * 0.075) * random(0.75, 1.15);
  }

  game.weapon.cooldown -= step;
  if (game.weapon.cooldown <= 0) {
    shoot(game);
    game.weapon.cooldown += game.weapon.delay;
  }

  for (const enemy of game.enemies) {
    const dx = p.x - enemy.x;
    const dy = p.y - enemy.y;
    const d = Math.max(0.001, Math.hypot(dx, dy));
    if (d > enemy.r + p.r - 2) {
      enemy.x += dx / d * enemy.speed * step;
      enemy.y += dy / d * enemy.speed * step;
    }
    enemy.contact -= step;
    // Recheck after the enemy's movement, not its previous-frame position.
    if (distance(enemy.x, enemy.y, p.x, p.y) < enemy.r + p.r && enemy.contact <= 0 && p.invincible <= 0) {
      p.hp -= enemy.kind === "brute" ? 21 : 12;
      p.invincible = 0.6;
      enemy.contact = 0.7;
      emit(game, p.x, p.y, "#ff667e", 11);
      if (p.hp <= 0) {
        p.hp = 0;
        game.phase = "gameover";
        emit(game, p.x, p.y, "#86e7ff", 24);
        return;
      }
    }
  }

  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const bullet = game.bullets[i];
    const fromX = bullet.x;
    const fromY = bullet.y;
    const dx = bullet.vx * step;
    const dy = bullet.vy * step;
    bullet.x += dx;
    bullet.y += dy;
    bullet.life -= step;

    // Swept segment/circle collision prevents fast projectiles passing
    // through small enemies between frames. Resolve nearest hit first.
    let hit: Enemy | undefined;
    let hitTime = Infinity;
    const lengthSquared = dx * dx + dy * dy;
    for (const enemy of game.enemies) {
      if (enemy.hp <= 0) continue;
      const t = lengthSquared > 0
        ? clamp(((enemy.x - fromX) * dx + (enemy.y - fromY) * dy) / lengthSquared, 0, 1)
        : 0;
      const checkX = fromX + dx * t;
      const checkY = fromY + dy * t;
      const radius = enemy.r + bullet.r;
      const offsetX = checkX - enemy.x;
      const offsetY = checkY - enemy.y;
      if (offsetX * offsetX + offsetY * offsetY <= radius * radius && t < hitTime) {
        hit = enemy;
        hitTime = t;
      }
    }
    if (hit) {
      hit.hp -= bullet.damage;
      emit(game, fromX + dx * hitTime, fromY + dy * hitTime, hit.kind === "brute" ? "#ffa66b" : "#fb77a8", 5);
      game.bullets.splice(i, 1);
      continue;
    }
    if (bullet.life <= 0 || bullet.x < -30 || bullet.x > game.width + 30 || bullet.y < -30 || bullet.y > game.height + 30) {
      game.bullets.splice(i, 1);
    }
  }

  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const enemy = game.enemies[i];
    if (enemy.hp > 0) continue;
    game.kills++;
    game.gold += enemy.kind === "brute" ? 5 : 1;
    game.drops.push({ x: enemy.x, y: enemy.y, r: 7, value: enemy.kind === "brute" ? 20 : 12, kind: "xp" });
    if (Math.random() < 0.035) game.drops.push({ x: enemy.x + 10, y: enemy.y + 8, r: 8, value: 20, kind: "heal" });
    emit(game, enemy.x, enemy.y, "#a4e2ff", 12);
    game.enemies.splice(i, 1);
  }

  // Keep long survival runs bounded even when old XP crystals are never collected.
  // Preserve the newest drops (including occasional healing) for the player.
  const maxDrops = 240;
  if (game.drops.length > maxDrops) {
    game.drops.splice(0, game.drops.length - maxDrops);
  }

  for (let i = game.drops.length - 1; i >= 0; i--) {
    const item = game.drops[i];
    const d = distance(item.x, item.y, p.x, p.y);
    if (d < game.pickupRadius && d > 5) {
      const speed = Math.min(680, 175 + (game.pickupRadius - d) * 8);
      const travel = Math.min(d, speed * step);
      item.x += (p.x - item.x) / d * travel;
      item.y += (p.y - item.y) / d * travel;
    }
    if (distance(item.x, item.y, p.x, p.y) < p.r + item.r + 7) {
      game.drops.splice(i, 1);
      if (item.kind === "heal") p.hp = Math.min(p.maxHp, p.hp + item.value);
      else grantExperience(game, item.value);
      emit(game, item.x, item.y, item.kind === "heal" ? "#ff829e" : "#9df9df", 5);
      if (game.phase !== "playing") break;
    }
  }

  for (let i = game.sparks.length - 1; i >= 0; i--) {
    const spark = game.sparks[i];
    spark.x += spark.vx * step;
    spark.y += spark.vy * step;
    spark.vx *= 0.95;
    spark.vy *= 0.95;
    spark.age += step;
    if (spark.age >= spark.life) game.sparks.splice(i, 1);
  }
}

function polygon(ctx: CanvasRenderingContext2D, sides: number, radius: number, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i * Math.PI * 2) / sides;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function drawGame(ctx: CanvasRenderingContext2D, game: Game, joystick: Joystick = null) {
  const { width: w, height: h, time } = game;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#08111f";
  ctx.fillRect(0, 0, w, h);

  const light = ctx.createRadialGradient(w * 0.54, h * 0.42, 20, w * 0.54, h * 0.42, Math.max(w, h) * 0.72);
  light.addColorStop(0, "#13263b");
  light.addColorStop(0.52, "#0b1929");
  light.addColorStop(1, "#07101d");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, w, h);

  const grid = 48;
  const drift = (time * 4) % grid;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(127,175,208,.075)";
  for (let x = drift; x < w; x += grid) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = drift; y < h; y += grid) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.32);
  ctx.shadowColor = "#4c9cb9";
  ctx.shadowBlur = 24;
  ctx.strokeStyle = "rgba(83,174,206,.19)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.min(w * 0.38, 325) + i * 36, Math.min(h * 0.29, 170) + i * 26, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.fillStyle = "rgba(191,226,255,.14)";
  ctx.font = "600 10px monospace";
  ctx.fillText("RIFT / SECTOR 01", 22, 29);
  ctx.textAlign = "right";
  ctx.fillText("SIMULATION // LOCAL", w - 22, 29);
  ctx.textAlign = "left";

  for (const drop of game.drops) {
    const isHeal = drop.kind === "heal";
    ctx.save();
    ctx.translate(drop.x, drop.y);
    ctx.rotate(time * 1.8);
    ctx.shadowColor = isHeal ? "#ff6b9b" : "#75eec9";
    ctx.shadowBlur = 18;
    ctx.fillStyle = isHeal ? "#ff87a3" : "#98f5d7";
    polygon(ctx, 4, drop.r, Math.PI / 4);
    ctx.fill();
    ctx.restore();
  }

  for (const bullet of game.bullets) {
    ctx.save();
    ctx.strokeStyle = "rgba(107,218,255,.35)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);
    ctx.lineTo(bullet.x - bullet.vx * 0.028, bullet.y - bullet.vy * 0.028);
    ctx.stroke();
    ctx.fillStyle = bullet.color;
    ctx.shadowColor = bullet.color;
    ctx.shadowBlur = 19;
    ctx.beginPath(); ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  for (const enemy of game.enemies) {
    const color = enemy.kind === "brute" ? "#ffab65" : enemy.kind === "stalker" ? "#d5a1ff" : "#f17d9d";
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x));
    ctx.shadowColor = color;
    ctx.shadowBlur = enemy.kind === "brute" ? 23 : 13;
    ctx.fillStyle = enemy.kind === "brute" ? "#653c36" : "#442d47";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    polygon(ctx, enemy.kind === "brute" ? 6 : 4, enemy.r, Math.PI / 4);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.fillRect(-2, -4, 9, 8);
    ctx.restore();
    if (enemy.hp < enemy.maxHp) {
      ctx.fillStyle = "rgba(0,0,0,.6)";
      ctx.fillRect(enemy.x - enemy.r, enemy.y - enemy.r - 13, enemy.r * 2, 3);
      ctx.fillStyle = color;
      ctx.fillRect(enemy.x - enemy.r, enemy.y - enemy.r - 13, enemy.r * 2 * Math.max(0, enemy.hp / enemy.maxHp), 3);
    }
  }

  const p = game.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.invincible > 0 && Math.floor(time * 20) % 2 === 0) ctx.globalAlpha = 0.55;
  ctx.strokeStyle = "rgba(105,221,254,.22)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, 29 + Math.sin(time * 4) * 2, 0, Math.PI * 2); ctx.stroke();
  ctx.rotate(p.angle);
  ctx.shadowBlur = 26;
  ctx.shadowColor = "#64daff";
  ctx.fillStyle = "#0d405b";
  ctx.strokeStyle = "#9ff1ff";
  ctx.lineWidth = 2.5;
  polygon(ctx, 6, 16, Math.PI / 6);
  ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#c5f8ff";
  ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#72e7ff";
  ctx.fillRect(13, -3, 11, 6);
  ctx.restore();

  for (const spark of game.sparks) {
    ctx.globalAlpha = 1 - spark.age / spark.life;
    ctx.fillStyle = spark.color;
    ctx.fillRect(spark.x, spark.y, spark.size, spark.size);
  }
  ctx.globalAlpha = 1;

  if (joystick) {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(160,230,255,.44)";
    ctx.fillStyle = "rgba(56,157,198,.12)";
    ctx.beginPath(); ctx.arc(joystick.x, joystick.y, 49, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(120,227,255,.6)";
    ctx.beginPath(); ctx.arc(joystick.x + joystick.dx * 40, joystick.y + joystick.dy * 40, 19, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.18, w / 2, h / 2, Math.max(w, h) * 0.78);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,.48)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}
