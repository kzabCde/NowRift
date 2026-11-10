import Phaser from "phaser";
import type { Feedback } from "../feedback";
import type { Preferences } from "../../state/settings";
type Effect = Feedback & { age: number; life: number };
/** Bounded, recycled semantic shapes, batched into one Phaser Graphics object. */
export class CombatVfx {
  private active: Effect[] = [];
  private pool: Effect[] = [];
  private graphics: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(6200);
  }
  emit(event: Feedback, prefs: Preferences) {
    const cap = prefs.reducedEffects
      ? 20
      : prefs.quality === "low"
        ? 32
        : prefs.quality === "high"
          ? 96
          : 64;
    if (this.active.length >= cap) {
      if (!event.important) return;
      this.pool.push(this.active.shift()!);
    }
    const item = this.pool.pop() ?? ({} as Effect);
    Object.assign(item, event, {
      age: 0,
      life:
        event.kind === "bossDeath"
          ? 1.4
          : event.kind === "bossSpawn" || event.kind === "level"
            ? 0.9
            : event.kind === "slash"
              ? 0.16
              : 0.4,
    });
    this.active.push(item);
  }
  draw(dt: number, prefs: Preferences) {
    const g = this.graphics.clear();
    for (let i = this.active.length - 1; i >= 0; i--) {
      const e = this.active[i];
      e.age += dt;
      if (e.age >= e.life) {
        this.pool.push(e);
        this.active.splice(i, 1);
        continue;
      }
      const t = e.age / e.life,
        alpha = (1 - t) * (prefs.reducedEffects ? 0.6 : 1),
        r = e.radius;
      g.lineStyle(e.important ? 3 : 2, e.color, alpha);
      switch (e.kind) {
        case "slash": {
          g.beginPath();
          g.arc(
            e.x,
            e.y,
            r * (0.7 + t * 0.4),
            e.angle - 1.1 + t,
            e.angle + 0.7 + t,
          );
          g.strokePath();
          g.lineStyle(1, 0xf0ebca, alpha);
          g.beginPath();
          g.arc(e.x, e.y, r * 0.7, e.angle - 0.9 + t, e.angle + 0.5 + t);
          g.strokePath();
          break;
        }
        case "lightning": {
          g.beginPath();
          g.moveTo(e.x, e.y);
          for (let j = 1; j < 6; j++) {
            const f = j / 6;
            g.lineTo(
              e.x + (e.tx - e.x) * f + (j % 2 ? 9 : -9),
              e.y + (e.ty - e.y) * f,
            );
          }
          g.lineTo(e.tx, e.ty);
          g.strokePath();
          break;
        }
        case "heal":
          for (let j = 0; j < 4; j++) {
            const x = e.x + (j - 1.5) * 12,
              y = e.y - t * 45 + (j % 2) * 12;
            g.lineBetween(x - 3, y, x + 3, y);
            g.lineBetween(x, y - 3, x, y + 3);
          }
          break;
        case "spark":
        case "magic":
        case "burn":
        case "trail":
        case "poison":
          for (let j = 0; j < (prefs.reducedEffects ? 3 : 6); j++) {
            const a = e.angle + (j * Math.PI) / 3;
            const x = e.x + Math.cos(a) * r * t,
              y = e.y + Math.sin(a) * r * t;
            g.lineBetween(
              x,
              y,
              x + Math.cos(a) * 5 * (1 - t),
              y + Math.sin(a) * 5 * (1 - t),
            );
          }
          break;
        case "step":
        case "pickup":
          g.fillStyle(e.color, alpha * 0.4);
          g.fillRect(e.x - 2, e.y - t * 14, 4, 4);
          break;
        case "shield":
          g.beginPath();
          g.arc(e.x, e.y, r, e.angle - 1, e.angle + 1);
          g.strokePath();
          break;
        case "freeze":
          for (let j = 0; j < 6; j++) {
            const a = (j * Math.PI) / 3;
            g.lineBetween(
              e.x + Math.cos(a) * r * t,
              e.y + Math.sin(a) * r * t,
              e.x + Math.cos(a) * (r * t + 7),
              e.y + Math.sin(a) * (r * t + 7),
            );
          }
          g.strokeCircle(e.x, e.y, r * t);
          break;
        default:
          g.strokeCircle(e.x, e.y, r * (0.2 + 0.8 * t));
          if (e.important || e.kind === "explosion") {
            g.lineStyle(1, e.color, alpha * 0.45);
            g.strokeCircle(e.x, e.y, r * (0.1 + 0.6 * t));
            for (let j = 0; j < 8; j++) {
              const a = (j * Math.PI) / 4;
              g.lineBetween(
                e.x + Math.cos(a) * r * t,
                e.y + Math.sin(a) * r * t,
                e.x + Math.cos(a) * r * t * 1.12,
                e.y + Math.sin(a) * r * t * 1.12,
              );
            }
          }
      }
      if (
        prefs.glow > 0 &&
        !prefs.reducedEffects &&
        (e.important || e.kind === "explosion")
      ) {
        g.fillStyle(e.color, alpha * prefs.glow * 0.08);
        g.fillCircle(e.x, e.y, r * 0.6);
      }
    }
  }
  get count() {
    return this.active.length;
  }
}
