import { queueAppearance } from "./appearance-loader";
import Phaser from "phaser";
import type { CharacterId } from "../loadout";
import type { Outfit } from "../world/save";
import type { WeaponSnapshot } from "../rpg/model";
import type { WeaponId } from "../content/forest";
import { RARITIES } from "../rpg/content";
import {
  defaultAppearance,
  layerDepth,
  weaponVisualFrame,
  type AppearanceLayer,
  type CharacterAppearance,
} from "../presentation/appearance";
import {
  advanceAnimation,
  animationDuration,
  createAnimationState,
  requestAnimation,
  sampleAnimation,
  type AnimationPose,
} from "../presentation/animation";
import {
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
  appearance?: CharacterAppearance;
  practice?: WeaponId;
  facing: Facing;
  time: number;
  moving?: boolean;
  attack?: number;
  attackId?: number;
  anticipation?: boolean;
  angle?: number;
  pose?: AnimationPose;
  poseAge?: number;
  hit?: boolean;
  dead?: boolean;
  invincible?: boolean;
  reduced?: boolean;
  deathComplete?: boolean;
};
/** A single scene-clock controls independent anatomy, appearance, owned gear and tools. */
export class CharacterRig {
  root: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  weapon: Phaser.GameObjects.Image;
  equipmentEffects: Phaser.GameObjects.Graphics;
  hitEffects: Phaser.GameObjects.Graphics;
  private layers = new Map<
    string,
    { image: Phaser.GameObjects.Image; definition: AppearanceLayer }
  >();
  private look: CharacterAppearance | null = null;
  private selected: WeaponSnapshot | null = null;
  private state = createAnimationState();
  private previousTime: number | null = null;
  private previousAttack = 0;
  private wasHit = false;
  private wasDead = false;
  private lastPoseAge = 0;
  private poseToken = 0;
  constructor(
    private scene: Phaser.Scene,
    scale = 2,
  ) {
    const shadow = scene.add.ellipse(0, 11, 29, 8, 0x071923, 0.4).setDepth(-20);
    this.body = scene.add
      .image(0, 0, "player")
      .setOrigin(0.5, 0.75)
      .setDepth(0);
    this.weapon = scene.add
      .image(10, -9, "equipment-weapons", 0)
      .setOrigin(0.5, 0.75)
      .setDepth(13);
    this.equipmentEffects = scene.add.graphics().setDepth(15);
    this.hitEffects = scene.add.graphics().setDepth(16);
    this.root = scene.add
      .container(0, 0, [
        shadow,
        this.body,
        this.weapon,
        this.equipmentEffects,
        this.hitEffects,
      ])
      .setScale((scale * 32) / 48);
  }
  update(p: RigPose) {
    this.selected = p.weapon;
    const look =
      p.appearance ??
      (this.look?.character === p.character && this.look.outfit === p.outfit
        ? this.look
        : defaultAppearance(p.character, p.outfit));
    if (this.look?.appearanceKey !== look.appearanceKey) this.applyLook(look);
    const loaded = queueAppearance(this.scene, look);
    let changed = false;
    for (const part of this.layers.values()) {
      const available = this.scene.textures.exists(part.definition.key);
      if (available && part.image.texture.key !== part.definition.key) {
        part.image.setTexture(part.definition.key);
        changed = true;
      }
      part.image.setVisible(available);
      part.image.setDepth(
        layerDepth(part.definition.slot, p.facing, part.definition.z),
      );
    }
    if (changed || loaded)
      this.body.setVisible(!this.layers.get("body")?.image.visible);
    const delta =
      this.previousTime === null
        ? 0
        : Math.max(0, Math.min(160, p.time - this.previousTime));
    this.previousTime = p.time;
    advanceAnimation(this.state, delta);
    const token =
      p.attackId ??
      (p.attack && p.attack > this.previousAttack
        ? p.time
        : this.state.eventId);
    const attackPose: AnimationPose = ["slash", "sweep"].includes(
      p.weapon?.attack.kind ?? "",
    )
      ? "melee"
      : p.practice === "daggers"
        ? "ranged"
        : "cast";
    if (p.dead)
      requestAnimation(this.state, {
        pose: "death",
        facing: p.facing,
        eventId: "death",
      });
    else if (this.wasDead)
      requestAnimation(this.state, {
        pose: "respawn",
        facing: p.facing,
        eventId: p.time,
      });
    else if (p.hit && !this.wasHit)
      requestAnimation(this.state, {
        pose: "hit",
        facing: p.facing,
        eventId: p.time,
      });
    else if ((p.attack ?? 0) > 0) {
      const started = requestAnimation(this.state, {
        pose: attackPose,
        facing: p.facing,
        eventId: token,
      });
      if (started) this.state.elapsed = animationDuration(attackPose) * 0.25;
    } else if (p.pose) {
      if (p.poseAge !== undefined && p.poseAge < this.lastPoseAge)
        this.poseToken++;
      const accepted = requestAnimation(this.state, {
        pose: p.pose,
        facing: p.facing,
        eventId: `action-${p.pose}-${this.poseToken}`,
      });
      if ((accepted || this.state.pose === p.pose) && p.poseAge !== undefined)
        this.state.elapsed = Math.min(animationDuration(p.pose), p.poseAge);
    } else
      requestAnimation(this.state, {
        pose: p.moving ? "walk" : "idle",
        facing: p.facing,
      });
    this.previousAttack = p.attack ?? 0;
    this.wasHit = !!p.hit;
    this.wasDead = !!p.dead;
    this.lastPoseAge = p.poseAge ?? 0;
    if (p.deathComplete && p.dead)
      this.state.elapsed = animationDuration("death");
    // A locked action keeps its pose, while locomotion/aim can still turn the
    // entire rig. Keep every layer on the same row as its hand and weapon.
    this.state.facing = p.facing;
    const frame = sampleAnimation(this.state),
      column = frame % 26;
    for (const { image } of this.layers.values())
      if (image.visible) image.setFrame(frame);
    if (this.body.visible)
      this.body
        .setFrame(
          p.dead
            ? 7
            : p.hit
              ? 5
              : p.moving
                ? 1 + (Math.floor(p.time / 125) % 3)
                : 0,
        )
        .setScale(1.5);
    this.root
      .setPosition(Math.round(p.x), Math.round(p.y))
      .setDepth(p.y + 2)
      .setAlpha(
        p.invincible && !p.reduced && Math.floor(p.time / 70) % 2 === 0
          ? 0.55
          : 1,
      );
    const tool =
      this.state.pose === "mine"
        ? 15
        : this.state.pose === "craft"
          ? 16
          : this.state.pose === "gather"
            ? 17
            : null;
    const hand = handPoint(p.character, p.facing, !!p.attack, column);
    const weaponFrame =
      tool ??
      (p.weapon
        ? weaponVisualFrame(p.weapon)
        : practiceFrame[p.practice ?? "arcane"]);
    this.weapon
      .setVisible(
        !p.dead &&
          (tool !== null || !!p.weapon || !!p.practice) &&
          this.scene.textures.exists("equipment-weapons"),
      )
      .setTexture("equipment-weapons", weaponFrame)
      .setPosition(hand.x, hand.y)
      .setFlipX(p.facing === "left")
      .setDepth(p.facing === "up" ? -2 : 13);
    const attacking = (p.attack ?? 0) > 0;
    const melee = ["slash", "sweep"].includes(p.weapon?.attack.kind ?? "");
    this.weapon.setRotation(
      tool !== null
        ? Math.sin((p.poseAge ?? 0) / 85) * 0.7
        : attacking
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
    this.root.sort("depth");
    this.equipmentEffects.clear();
    this.hitEffects.clear();
    if (p.weapon && !p.dead) {
      const color = parseInt(RARITIES[p.weapon.rarity].color.slice(1), 16);
      this.equipmentEffects
        .lineStyle(1, color, 0.45)
        .strokeEllipse(0, 11, 29, 8);
      if (p.weapon.enhancement > 0 && !p.reduced)
        this.equipmentEffects
          .fillStyle(color, 0.8)
          .fillRect(
            Math.round(hand.x + Math.sin(p.time / 500) * 5),
            Math.round(hand.y - 12 + Math.cos(p.time / 500) * 3),
            1,
            1,
          );
    }
    if (p.hit)
      this.hitEffects.lineStyle(1, 0xffd5ad, 0.7).strokeEllipse(0, -8, 23, 32);
  }
  private applyLook(look: CharacterAppearance) {
    this.look = look;
    for (const [slot, part] of this.layers)
      if (!look.layers.some((layer) => layer.slot === slot)) {
        part.image.destroy();
        this.layers.delete(slot);
      }
    for (const definition of look.layers) {
      let part = this.layers.get(definition.slot);
      if (!part) {
        const image = this.scene.add
          .image(
            0,
            0,
            this.scene.textures.exists(definition.key)
              ? definition.key
              : "player",
          )
          .setOrigin(0.5, 0.75)
          .setVisible(false);
        this.root.add(image);
        part = { image, definition };
        this.layers.set(definition.slot, part);
      }
      part.definition = definition;
    }
  }
  describe() {
    const base = this.layers.get("body")?.image;
    return {
      body: base?.visible ? base.texture.key : this.body.texture.key,
      frame: base?.visible
        ? Number(base.frame.name)
        : Number(this.body.frame.name),
      weaponAsset: this.weapon.texture.key,
      weaponFrame: Number(this.weapon.frame.name),
      weaponVisible: this.weapon.visible,
      instanceId: this.selected?.instanceId ?? null,
      behindBody: this.weapon.depth < 0,
      appearanceKey: this.look?.appearanceKey ?? null,
      pose: this.state.pose,
      layers: [...this.layers.values()]
        .filter((p) => p.image.visible)
        .map(({ image, definition }) => ({
          slot: definition.slot,
          key: image.texture.key,
          frame: Number(image.frame.name),
          depth: image.depth,
          visible: image.visible,
          instanceId: definition.instanceId ?? null,
          definitionId: definition.definitionId ?? null,
        })),
    };
  }
}
