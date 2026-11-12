import Phaser from "phaser";
import type { Feedback } from "../feedback";
import type { Preferences } from "../../state/settings";
import {
  VfxTimeline,
  effectDefinition,
  inEffectView,
  vfxFrame,
  type ActiveVfx,
} from "../presentation/vfx";
import { onSceneEnd } from "./lifecycle";

/** Recycled pixel sprites consume authoritative simulation events; the update clock owns all animation. */
export class CombatVfx {
  private readonly timeline = new VfxTimeline();
  private readonly sprites: Phaser.GameObjects.Image[] = [];
  private readonly graphics: Phaser.GameObjects.Graphics;
  private visibleSprites = 0;
  private disposed = false;
  constructor(private readonly scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(6199);
    onSceneEnd(scene, () => this.destroy());
  }
  emit(event: Feedback, prefs: Preferences) {
    if (!this.disposed) this.timeline.emit(event, prefs);
  }
  draw(dt: number, prefs: Preferences) {
    if (this.disposed) return;
    this.timeline.update(dt, prefs);
    const graphics = this.graphics.clear(),
      view = this.scene.cameras.main.worldView;
    let spriteIndex = 0;
    for (const event of this.timeline.active) {
      if (!inEffectView(event, view)) continue;
      const def = effectDefinition(event),
        t = event.age / event.life;
      const alpha =
        (1 - t * 0.75) *
        (prefs.reducedEffects ? 0.45 : event.important ? 0.8 : 0.7);
      const key = `pixel-vfx-${def.family}`;
      if (this.scene.textures.exists(key)) {
        let image = this.sprites[spriteIndex];
        if (!image)
          image = this.sprites[spriteIndex] = this.scene.add.image(
            0,
            0,
            key,
            def.frameStart,
          );
        const rise = def.motion === "rise" ? -t * 16 : 0;
        image
          .setTexture(key, vfxFrame(event))
          .setVisible(true)
          .setAlpha(alpha)
          .setOrigin(def.origin[0], def.origin[1]);
        image
          .setPosition(Math.round(event.x), Math.round(event.y + rise))
          .setDepth(def.depth);
        if (def.motion === "link") {
          const distance = Math.hypot(event.tx - event.x, event.ty - event.y);
          image.setPosition(
            Math.round((event.x + event.tx) / 2),
            Math.round((event.y + event.ty) / 2),
          );
          image
            .setDisplaySize(Math.max(48, Math.round(distance)), 24)
            .setRotation(Math.atan2(event.ty - event.y, event.tx - event.x));
        } else {
          const size = Math.max(
            24,
            Math.min(event.important ? 288 : 240, event.radius * 2 * def.scale),
          );
          const scale = Math.max(1, Math.round(size / 48));
          image
            .setScale(scale)
            .setRotation(def.motion === "directional" ? event.angle : 0);
        }
        if (def.tint) image.setTint(event.color);
        else image.clearTint();
        spriteIndex++;
      }
      this.drawReadability(event, t, prefs);
      if (!prefs.reducedEffects) {
        const count = Math.min(
          prefs.quality === "low" ? 2 : 6,
          Math.ceil(def.particles.count * prefs.particles),
        );
        graphics.fillStyle(event.color, alpha * 0.75);
        for (let i = 0; i < count; i++) {
          const angle = event.angle + (i / Math.max(1, count)) * Math.PI * 2;
          const distance =
            Math.min(event.radius, 50) * t + def.particles.speed * event.age;
          graphics.fillRect(
            Math.round(event.x + Math.cos(angle) * distance),
            Math.round(event.y + Math.sin(angle) * distance - t * 8),
            def.particles.size,
            def.particles.size,
          );
        }
      }
    }
    for (let i = spriteIndex; i < this.sprites.length; i++)
      this.sprites[i].setVisible(false);
    this.visibleSprites = spriteIndex;
  }
  /** Exact gameplay radii stay legible even with reduced motion, missing art or a full effect pool. */
  private drawReadability(event: ActiveVfx, t: number, prefs: Preferences) {
    const g = this.graphics,
      alpha = (1 - t) * (prefs.reducedEffects ? 0.8 : 0.55);
    const ring = [
      "telegraph",
      "bossSpawn",
      "bossDeath",
      "shockwave",
      "freeze",
      "phase",
    ].includes(event.kind);
    if (ring) {
      g.lineStyle(event.kind === "telegraph" ? 3 : 2, event.color, alpha);
      g.strokeCircle(Math.round(event.x), Math.round(event.y), event.radius);
      if (event.kind === "telegraph") {
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          g.fillStyle(event.color, alpha).fillRect(
            Math.round(event.x + Math.cos(a) * event.radius - 2),
            Math.round(event.y + Math.sin(a) * event.radius - 2),
            4,
            4,
          );
        }
      }
    }
    if (event.kind === "slash") {
      const half = (event.arc ?? 1.8) / 2;
      g.lineStyle(2, event.color, alpha).beginPath();
      g.arc(
        event.x,
        event.y,
        event.radius,
        event.angle - half,
        event.angle + half,
      );
      g.strokePath();
    }
  }
  clear() {
    this.timeline.clear();
    this.sprites.forEach((image) => image.setVisible(false));
    this.visibleSprites = 0;
    if (!this.disposed) this.graphics.clear();
  }
  destroy() {
    if (this.disposed) return;
    this.clear();
    this.disposed = true;
    this.sprites.forEach((image) => image.destroy());
    this.sprites.length = 0;
    this.graphics.destroy();
  }
  get count() {
    return this.timeline.active.length;
  }
  describe() {
    return {
      active: this.count,
      spriteCount: this.visibleSprites,
      atlasKeys: [
        ...new Set(
          this.sprites
            .filter((image) => image.visible)
            .map((image) => image.texture.key),
        ),
      ],
      frames: this.sprites
        .filter((image) => image.visible)
        .map((image) => Number(image.frame.name)),
      pooled: this.timeline.recycled,
    };
  }
}
