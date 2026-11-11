import Phaser from "phaser";
import type { CharacterId } from "../loadout";
import type { Outfit } from "../world/save";
import type { WeaponSnapshot } from "../rpg/model";
import type { WeaponId } from "../content/forest";
import { RARITIES } from "../rpg/content";
import {
  bodyFrame,
  bodyKey,
  handPoint,
  practiceFrame,
  type Facing,
} from "../presentation/character";
export type RigPose = {
  x: number;
  y: number;
  character: CharacterId;
  outfit: Outfit;
  weapon: WeaponSnapshot | null;
  practice?: WeaponId;
  facing: Facing;
  time: number;
  moving?: boolean;
  attack?: number;
  angle?: number;
  hit?: boolean;
  dead?: boolean;
  invincible?: boolean;
  reduced?: boolean;
  deathComplete?: boolean;
};
/** One reusable body + held equipment rig in both the town and combat renderer. */
export class CharacterRig {
  root: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  weapon: Phaser.GameObjects.Image;
  equipmentEffects: Phaser.GameObjects.Graphics;
  hitEffects: Phaser.GameObjects.Graphics;
  private texture = "";
  private depthFacing: Facing = "down";
  private deathAt: number | null = null;
  private selected: WeaponSnapshot | null = null;
  constructor(scene: Phaser.Scene, scale = 2) {
    const shadow = scene.add.ellipse(0, 7, 21, 7, 0x071923, 0.38).setDepth(-3);
    this.body = scene.add
      .image(0, 0, "player")
      .setOrigin(0.5, 0.75)
      .setDepth(0);
    this.weapon = scene.add
      .image(6, -5, "equipment-weapons", 0)
      .setOrigin(0.5, 0.75)
      .setDepth(1);
    this.equipmentEffects = scene.add.graphics().setDepth(2);
    this.hitEffects = scene.add.graphics().setDepth(3);
    this.root = scene.add
      .container(0, 0, [
        shadow,
        this.body,
        this.weapon,
        this.equipmentEffects,
        this.hitEffects,
      ])
      .setScale(scale);
  }
  update(p: RigPose) {
    this.selected = p.weapon;
    const texture = bodyKey(p.character, p.outfit);
    if (this.texture !== texture) {
      this.body.setTexture(
        this.body.scene.textures.exists(texture) ? texture : "player",
      );
      this.texture = texture;
    }
    if (p.dead && this.deathAt === null) this.deathAt = p.time;
    if (!p.dead) this.deathAt = null;
    const attacking = (p.attack ?? 0) > 0;
    const pose = p.dead
      ? "death"
      : p.hit
        ? "hit"
        : attacking
          ? "attack"
          : p.moving
            ? "walk"
            : "idle";
    const frame = bodyFrame(
      p.facing,
      pose,
      p.time,
      p.deathComplete ? 1000 : p.time - (this.deathAt ?? p.time),
    );
    this.body.setFrame(this.body.texture.has(String(frame)) ? frame : 0);
    this.root
      .setPosition(p.x, p.y)
      .setDepth(p.y + 2)
      .setAlpha(p.invincible && Math.floor(p.time / 70) % 2 === 0 ? 0.55 : 1);
    if (p.facing !== this.depthFacing) {
      this.weapon.setDepth(p.facing === "up" ? -1 : 1);
      this.root.sort("depth");
      this.depthFacing = p.facing;
    }
    const hand = handPoint(p.character, p.facing, attacking, frame % 12),
      equipped = !!p.weapon || !!p.practice;
    this.weapon
      .setVisible(equipped && !p.dead)
      .setFrame(p.weapon?.frame ?? practiceFrame[p.practice ?? "arcane"])
      .setPosition(hand.x, hand.y)
      .setFlipX(p.facing === "left");
    const kind = p.weapon?.attack.kind,
      melee = kind === "slash" || kind === "sweep";
    this.weapon.setRotation(
      attacking
        ? (p.angle ?? 0) +
            Math.PI / 2 +
            (melee
              ? ((0.22 - (p.attack ?? 0)) / 0.22 - 0.5) *
                (p.weapon?.attack.arc ?? 1.8)
              : 0)
        : p.facing === "right"
          ? 0.25
          : p.facing === "left"
            ? -0.25
            : 0,
    );
    this.equipmentEffects.clear();
    this.hitEffects.clear();
    if (p.weapon && !p.dead) {
      const color = Number.parseInt(
        RARITIES[p.weapon.rarity].color.slice(1),
        16,
      );
      this.equipmentEffects
        .lineStyle(0.7, color, 0.5)
        .strokeEllipse(0, 8, 20, 6);
      if (p.weapon.enhancement > 0 && !p.reduced) {
        const n = p.time / 600;
        this.equipmentEffects
          .fillStyle(color, 0.8)
          .fillRect(
            hand.x + Math.sin(n) * 4,
            hand.y - 13 + Math.cos(n) * 2,
            1,
            1,
          );
      }
    }
    if (p.hit)
      this.hitEffects.lineStyle(1, 0xffd5ad, 0.8).strokeEllipse(0, -6, 17, 20);
  }
  describe() {
    return {
      body: this.body.texture.key,
      frame: Number(this.body.frame.name),
      weaponAsset: this.weapon.texture.key,
      weaponFrame: Number(this.weapon.frame.name),
      weaponVisible: this.weapon.visible,
      instanceId: this.selected?.instanceId ?? null,
      behindBody: this.weapon.depth < this.body.depth,
    };
  }
}
