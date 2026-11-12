import type { EffectKind, Feedback } from "../feedback";
import type { WeaponId } from "../content/forest";
import type { Preferences } from "../../state/settings";

export const VFX_FAMILIES = [
  "fire",
  "frost",
  "lightning",
  "physical",
  "nature",
  "arcane",
  "impact",
] as const;
export type VfxFamily = (typeof VFX_FAMILIES)[number];
export const VFX_SHEETS = VFX_FAMILIES.map((family) => ({
  id: `pixel-vfx-${family}`,
  key: `pixel-vfx-${family}`,
  path: `/assets/pixel/skills/${family}.png`,
  frameWidth: 48,
  frameHeight: 48,
  frames: 16,
  width: 384,
  height: 96,
}));
export type VfxDefinition = {
  id: string;
  family: VfxFamily;
  frameStart: number;
  frameCount: number;
  fps: number;
  loop: boolean;
  origin: readonly [number, number];
  depth: number;
  priority: number;
  motion: "radial" | "rise" | "directional" | "link";
  scale: number;
  particles: { count: number; speed: number; size: number };
  tint: boolean;
  shake?: number;
  audio?: string;
};
function define(
  id: EffectKind,
  family: VfxFamily,
  row: number,
  fps: number,
  priority = 1,
  motion: VfxDefinition["motion"] = "radial",
  scale = 1,
  count = 3,
): VfxDefinition {
  return {
    id: `effect-${id}`,
    family,
    frameStart: row * 8,
    frameCount: 8,
    fps,
    priority,
    motion,
    scale,
    loop: false,
    origin: [0.5, 0.5],
    depth: 6200,
    particles: { count, speed: 18, size: 2 },
    tint: family === "impact" || family === "physical",
  };
}
/** These are existing simulation events. A visual definition never schedules damage. */
export const VFX: Record<EffectKind, VfxDefinition> = {
  slash: {
    ...define("slash", "physical", 0, 32, 2, "directional", 1, 2),
    audio: "attack",
  },
  trail: define("trail", "impact", 1, 24, 0, "rise", 0.6, 1),
  spark: {
    ...define("spark", "impact", 0, 32, 1, "radial", 1, 4),
    audio: "enemyHit",
  },
  magic: { ...define("magic", "arcane", 1, 20, 1), audio: "magic" },
  shockwave: { ...define("shockwave", "physical", 1, 18, 2), audio: "heavy" },
  explosion: {
    ...define("explosion", "fire", 0, 16, 2, "radial", 1.1, 5),
    shake: 0.003,
    audio: "explosion",
  },
  burn: { ...define("burn", "fire", 1, 16, 1, "rise", 1, 3), audio: "fire" },
  freeze: {
    ...define("freeze", "frost", 0, 14, 2, "radial", 1, 3),
    audio: "ice",
  },
  poison: define("poison", "nature", 0, 14, 1, "rise", 1, 3),
  lightning: {
    ...define("lightning", "lightning", 0, 24, 2, "link", 1, 2),
    audio: "lightning",
  },
  shield: { ...define("shield", "frost", 1, 16, 2), audio: "shield" },
  heal: { ...define("heal", "nature", 1, 12, 2, "rise", 1, 4), audio: "heal" },
  level: {
    ...define("level", "arcane", 0, 10, 3, "radial", 1, 5),
    audio: "level",
  },
  rare: {
    ...define("rare", "arcane", 0, 12, 3, "rise", 1, 4),
    audio: "unlock",
  },
  bossSpawn: { ...define("bossSpawn", "arcane", 0, 8, 3), audio: "bossIntro" },
  telegraph: {
    ...define("telegraph", "arcane", 0, 12, 3),
    audio: "anticipation",
  },
  bossDeath: {
    ...define("bossDeath", "arcane", 1, 6, 3, "radial", 1.2, 6),
    shake: 0.004,
    audio: "bossDeath",
  },
  damage: {
    ...define("damage", "impact", 0, 24, 2, "radial", 0.8, 3),
    audio: "damage",
  },
  death: {
    ...define("death", "impact", 1, 12, 2, "rise", 0.9, 3),
    audio: "enemyDeath",
  },
  pickup: {
    ...define("pickup", "nature", 1, 24, 0, "rise", 0.55, 2),
    audio: "pickup",
  },
  phase: {
    ...define("phase", "lightning", 1, 10, 3, "radial", 1.1, 5),
    audio: "phase",
  },
  step: define("step", "impact", 1, 24, 0, "rise", 0.4, 1),
};
export const skillVisuals: Record<
  WeaponId,
  { release: VfxDefinition; impact: VfxDefinition; projectileFrame: number }
> = {
  arcane: {
    release: VFX.magic,
    impact: { ...VFX.spark, family: "arcane", frameStart: 8, tint: false },
    projectileFrame: 0,
  },
  daggers: { release: VFX.slash, impact: VFX.spark, projectileFrame: 1 },
  fire: { release: VFX.burn, impact: VFX.explosion, projectileFrame: 2 },
  frost: {
    release: VFX.freeze,
    impact: { ...VFX.freeze, frameStart: 8, scale: 0.5 },
    projectileFrame: 3,
  },
  slash: { release: VFX.slash, impact: VFX.spark, projectileFrame: 1 },
  sweep: {
    release: { ...VFX.slash, family: "fire", frameStart: 8, tint: false },
    impact: VFX.burn,
    projectileFrame: 2,
  },
};
export const effectDefinition = (event: Feedback) =>
  event.skill && event.stage
    ? skillVisuals[event.skill][event.stage]
    : VFX[event.kind];
export type VfxPreferences = Pick<
  Preferences,
  "quality" | "reducedEffects" | "particles"
>;
export type ActiveVfx = Feedback & {
  age: number;
  life: number;
  priority: number;
};
export const effectBudget = (prefs: VfxPreferences) =>
  prefs.reducedEffects
    ? 20
    : prefs.quality === "low"
      ? 32
      : prefs.quality === "high"
        ? 96
        : 64;
export const vfxFrame = (effect: ActiveVfx) => {
  const def = effectDefinition(effect);
  return (
    def.frameStart +
    Math.min(def.frameCount - 1, Math.max(0, Math.floor(effect.age * def.fps)))
  );
};
export function inEffectView(
  effect: Feedback,
  view: { left: number; right: number; top: number; bottom: number },
) {
  const r = Math.max(24, effect.radius * 1.3);
  return (
    Math.max(effect.x, effect.tx) + r >= view.left &&
    Math.min(effect.x, effect.tx) - r <= view.right &&
    Math.max(effect.y, effect.ty) + r >= view.top &&
    Math.min(effect.y, effect.ty) - r <= view.bottom
  );
}
/** One deterministic clock and bounded recycled event pool; no entity timers. */
export class VfxTimeline {
  readonly active: ActiveVfx[] = [];
  private readonly pool: ActiveVfx[] = [];
  emit(event: Feedback, prefs: VfxPreferences) {
    const def = effectDefinition(event),
      priority = event.important ? 4 : def.priority;
    if (this.active.length >= effectBudget(prefs)) {
      let candidate = -1,
        lowest = priority;
      for (let i = 0; i < this.active.length; i++) {
        if (this.active[i].priority < lowest) {
          candidate = i;
          lowest = this.active[i].priority;
        }
      }
      if (candidate < 0) return false;
      this.pool.push(this.active.splice(candidate, 1)[0]);
    }
    const item = this.pool.pop() ?? ({} as ActiveVfx);
    Object.assign(
      item,
      { skill: undefined, stage: undefined, arc: undefined },
      event,
      {
        age: 0,
        life: def.frameCount / def.fps,
        priority,
      },
    );
    this.active.push(item);
    return true;
  }
  update(delta: number, prefs: VfxPreferences) {
    const dt = Number.isFinite(delta) ? Math.max(0, delta) : 0;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const item = this.active[i];
      item.age += dt;
      if (item.age >= item.life) this.pool.push(this.active.splice(i, 1)[0]);
    }
    const cap = effectBudget(prefs);
    while (this.active.length > cap) {
      let candidate = 0;
      for (let i = 1; i < this.active.length; i++)
        if (this.active[i].priority < this.active[candidate].priority)
          candidate = i;
      this.pool.push(this.active.splice(candidate, 1)[0]);
    }
  }
  clear() {
    this.pool.push(...this.active);
    this.active.length = 0;
  }
  get recycled() {
    return this.pool.length;
  }
}
