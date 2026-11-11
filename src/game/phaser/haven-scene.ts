import Phaser from "phaser";
import { CharacterRig } from "./character-rig";
import { CombatVfx } from "./combat-vfx";
import { drainFeedback } from "../feedback";
import { facingFromAngle, type Facing } from "../presentation/character";
import { GameBridge, type Command } from "../bridge";
import {
  HAVEN,
  LANDMARKS,
  FOLIAGE,
  move,
  nearest,
  validPosition,
  type Point,
} from "../world/content";
import type { HavenStart } from "../world/bridge";
import { translateText } from "../../i18n/translator";
import { useLocale } from "../../state/locale";
import { useSettings } from "../../state/settings";
import { audio } from "../audio/engine";
import { onSceneEnd } from "./lifecycle";
import {
  makeGame,
  applyBuild,
  beginGame,
  spawnEnemy,
  advanceGame,
  type Game,
} from "../engine";
export class HavenScene extends Phaser.Scene {
  bridge!: GameBridge;
  startData!: HavenStart;
  actor!: Phaser.GameObjects.Container;
  rig!: CharacterRig;
  facing: Facing = "down";
  trainingEffects!: Phaser.GameObjects.Graphics;
  trainingVfx!: CombatVfx;
  trainingGame: Game | null = null;
  trainingShots: Phaser.GameObjects.Image[] = [];
  position: Point = { ...HAVEN.spawn };
  locked = false;
  moving = false;
  keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  pointer: number | null = null;
  drag: { x: number; y: number; dx: number; dy: number } | null = null;
  ring!: Phaser.GameObjects.Graphics;
  stick!: Phaser.GameObjects.Graphics;
  nearId: string | null = null;
  lastHud = 0;
  lastFrameAt = 0;
  lastSave = 0;
  lastStep = 0;
  training = 0;
  marker!: Phaser.GameObjects.Image;
  labels: { id: string; text: Phaser.GameObjects.Text }[] = [];
  staticSprites: Phaser.GameObjects.Image[] = [];
  lastCull = 0;
  fpsLimit = 0;
  ambience!: Phaser.GameObjects.Graphics;
  animated: { image: Phaser.GameObjects.Image; kind: string }[] = [];
  lastAmbience = 0;
  constructor() {
    super("HavenScene");
  }
  create() {
    this.bridge = this.registry.get("bridge");
    this.startData = structuredClone(this.registry.get("haven"));
    this.position = validPosition(this.startData.position)
      ? { ...this.startData.position }
      : { ...HAVEN.spawn };
    this.locked = true;
    this.pointer = null;
    this.drag = null;
    this.labels = [];
    this.staticSprites = [];
    this.animated = [];
    this.lastSave = 0;
    this.trainingGame = null;
    this.trainingShots = [];
    this.training = 0;
    this.facing = "down";
    this.lastHud = 0;
    this.lastFrameAt = performance.now();
    this.add
      .image(0, 0, "haven-terrain")
      .setOrigin(0)
      .setScale(2)
      .setDepth(-10000);
    this.add
      .image(900, 690, "haven-fountain")
      .setOrigin(0.5, 1)
      .setScale(2)
      .setDepth(690);
    for (const l of LANDMARKS) {
      const image = this.add
        .image(l.x, l.y, "haven-" + l.art, 0)
        .setOrigin(0.5, 1)
        .setScale(l.kind === "npc" ? 1.6 : 2)
        .setDepth(l.y);
      this.staticSprites.push(image);
      if (l.kind === "portal") image.setAlpha(0.95);
      if (l.kind === "portal" || l.kind === "npc")
        this.animated.push({ image, kind: l.kind });
      if (l.kind !== "treasure")
        this.labels.push({
          id: l.id,
          text: this.add
            .text(l.entrance.x, l.entrance.y + 17, "", {
              fontFamily: "monospace",
              fontSize: "10px",
              color: "#e1d7b3",
              backgroundColor: "#1a2a26cc",
              padding: { x: 5, y: 4 },
            })
            .setOrigin(0.5, 0)
            .setDepth(l.y + 2),
        });
    }
    for (const tree of FOLIAGE)
      this.staticSprites.push(
        this.add
          .image(tree.x, tree.y, "haven-tree")
          .setOrigin(0.5, 0.9)
          .setScale(1.6)
          .setDepth(tree.y),
      );
    this.ring = this.add.graphics().setDepth(1e5);
    this.ambience = this.add.graphics().setDepth(691);
    this.stick = this.add.graphics().setScrollFactor(0).setDepth(1e6);
    this.rig = new CharacterRig(this, 1.6);
    this.actor = this.rig.root.setPosition(this.position.x, this.position.y);
    this.trainingEffects = this.add.graphics().setDepth(1e5);
    this.trainingVfx = new CombatVfx(this);
    this.marker = this.add
      .image(-100, -100, "icons", 0)
      .setScale(1.6)
      .setDepth(1e5);
    const locale = () => {
      this.game.canvas.setAttribute(
        "aria-label",
        translateText(
          useLocale.getState().locale,
          "Rift Heaven. Move with WASD, arrows or touch. E interacts; H opens Sanctuary.",
        ),
      );
      for (const label of this.labels) {
        const l = LANDMARKS.find((l) => l.id === label.id)!;
        label.text.setText(translateText(useLocale.getState().locale, l.name));
      }
    };
    locale();
    const offLocale = useLocale.subscribe(locale);
    this.keys = this.input.keyboard!.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT",
      false,
    ) as typeof this.keys;
    const interact = () => {
      if (this.locked) return;
      const target = nearest(this.position);
      if (target) {
        audio.play("press");
        this.bridge.emit("interaction", {
          id: target.id,
          position: { ...this.position },
        });
      }
    };
    const shortcut = (name: "inventory" | "map" | "quests" | "pause") => () => {
      if (!this.locked) this.bridge.emit("haven-shortcut", name);
    };
    const shortcuts = {
      "keydown-E": interact,
      "keydown-I": shortcut("inventory"),
      "keydown-M": shortcut("map"),
      "keydown-Q": shortcut("quests"),
      "keydown-ESC": shortcut("pause"),
    };
    for (const [key, fn] of Object.entries(shortcuts))
      this.input.keyboard!.on(key, fn);
    const off = this.bridge.on("command", (c) => this.command(c, interact));
    const canvas = this.game.canvas;
    canvas.classList.add("game-canvas");
    canvas.setAttribute(
      "aria-label",
      translateText(
        useLocale.getState().locale,
        "Rift Heaven. Move with WASD, arrows or touch. E interacts; H opens Sanctuary.",
      ),
    );
    const clear = () => {
      this.pointer = null;
      this.drag = null;
      this.input.keyboard?.resetKeys();
      canvas.dataset.touchActive = "false";
      this.stick.clear();
    };
    const point = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - b.left) * this.scale.width) / b.width,
        y: ((e.clientY - b.top) * this.scale.height) / b.height,
      };
    };
    const down = (e: PointerEvent) => {
      if (this.locked || this.pointer !== null) return;
      e.preventDefault();
      const a = useSettings.getState().touchArea,
        b = canvas.getBoundingClientRect();
      if (
        (a === "left" && e.clientX > b.left + b.width / 2) ||
        (a === "right" && e.clientX < b.left + b.width / 2)
      )
        return;
      this.pointer = e.pointerId;
      this.drag = { ...point(e), dx: 0, dy: 0 };
      canvas.setPointerCapture(e.pointerId);
      canvas.dataset.touchActive = "true";
    };
    const drag = (e: PointerEvent) => {
      if (e.pointerId !== this.pointer || !this.drag) return;
      e.preventDefault();
      const p = point(e),
        x = p.x - this.drag.x,
        y = p.y - this.drag.y,
        n = Math.max(35, Math.hypot(x, y));
      this.drag.dx = x / n;
      this.drag.dy = y / n;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === this.pointer) clear();
    };
    const interrupt = () => {
      clear();
      this.bridge.emit("haven-save", { ...this.position });
      if (!this.locked) this.bridge.emit("haven-shortcut", "pause");
    };
    const visibility = () => {
      if (document.hidden) interrupt();
    };
    const scroll = (e: KeyboardEvent) => {
      if (
        !this.locked &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
      )
        e.preventDefault();
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", drag);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("lostpointercapture", up);
    window.addEventListener("keydown", scroll, { passive: false });
    window.addEventListener("blur", interrupt);
    window.addEventListener("pagehide", interrupt);
    document.addEventListener("visibilitychange", visibility);
    this.cameras.main
      .setBounds(0, 0, HAVEN.width, HAVEN.height)
      .startFollow(this.actor, true, 0.1, 0.1);
    const resize = () => {
      this.cameras.main.setZoom(
        Math.max(0.65, Math.min(1.15, this.scale.width / 1050)) *
          useSettings.getState().zoom,
      );
      clear();
    };
    resize();
    this.scale.on("resize", resize);
    onSceneEnd(this, () => {
      off();
      offLocale();
      clear();
      for (const [key, fn] of Object.entries(shortcuts))
        this.input.keyboard?.off(key, fn);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", drag);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
      window.removeEventListener("keydown", scroll);
      window.removeEventListener("blur", interrupt);
      window.removeEventListener("pagehide", interrupt);
      document.removeEventListener("visibilitychange", visibility);
      this.scale.off("resize", resize);
      if (
        process.env.NEXT_PUBLIC_E2E === "1" &&
        window.__NOWRIFT_HAVEN__?.state().session === this.startData.session
      )
        delete window.__NOWRIFT_HAVEN__;
    });
    if (process.env.NEXT_PUBLIC_E2E === "1")
      window.__NOWRIFT_HAVEN__ = {
        state: () => ({
          position: { ...this.position },
          locked: this.locked,
          session: this.startData.session,
        }),
        appearance: () => this.rig.describe(),
        place: (p) => {
          if (!validPosition(p)) throw new Error("Blocked test position");
          this.position = { ...p };
          this.actor.setPosition(p.x, p.y);
          this.publish();
        },
      };
    this.publish();
    this.bridge.emit("ready", true);
  }
  command(c: Command, interact: () => void) {
    if (
      c.type === "haven-test" &&
      this.startData.weapon &&
      nearest(this.position)?.id === "training"
    ) {
      const equipped = this.startData.weapon;
      const g = makeGame(HAVEN.width, HAVEN.height, equipped.attackId);
      g.equippedWeapon = structuredClone(equipped);
      g.character = this.startData.character;
      applyBuild(g, equipped.stats, true);
      beginGame(g);
      g.player.x = this.position.x;
      g.player.y = this.position.y;
      g.player.invincible = 1e6;
      g.enemies = [];
      g.obstacles = [];
      g.spawnCooldown = 1e6;
      const e = spawnEnemy(g, "elite", 310, 1240)!;
      e.hp = e.maxHp = 1e9;
      e.speed = 0;
      e.attack = 1e6;
      this.trainingGame = g;
      this.training = 0;
      audio.play("attack");
    }
    if (c.type === "haven-equipment") {
      this.startData.character = c.character;
      this.startData.weapon = c.weapon ? structuredClone(c.weapon) : null;
      this.trainingGame = null;
      this.trainingShots.forEach((s) => s.setVisible(false));
      this.trainingEffects.clear();
    }
    if (c.type === "haven-lock") {
      this.locked = c.locked;
      this.input.keyboard?.resetKeys();
      if (!c.locked) {
        this.trainingGame = null;
        this.trainingShots.forEach((s) => s.setVisible(false));
        this.trainingEffects.clear();
      }
      if (c.locked) {
        this.drag = null;
        this.pointer = null;
        this.input.keyboard?.resetKeys();
        this.game.canvas.dataset.touchActive = "false";
      }
      this.publish();
    }
    if (c.type === "haven-interact") interact();
    if (c.type === "haven-look") {
      this.startData.outfit = c.outfit;
    }
    if (c.type === "haven-locate") {
      const l = LANDMARKS.find((l) => l.id === c.id);
      if (l) this.marker.setPosition(l.entrance.x, l.entrance.y - 35);
    }
  }
  publish() {
    this.nearId = nearest(this.position)?.id ?? null;
    this.bridge.emit("haven", {
      position: { ...this.position },
      near: this.nearId,
      paused: this.locked,
      moving: this.moving,
      training: this.training,
    });
  }
  update(_time: number, _delta: number) {
    const time = performance.now(),
      delta = Math.max(0, time - this.lastFrameAt);
    this.lastFrameAt = time;
    const prefs = useSettings.getState(),
      targetFps =
        this.locked && !this.trainingGame
          ? 15
          : prefs.quality === "low"
            ? 30
            : 60;
    if (time - this.lastAmbience > (prefs.quality === "low" ? 300 : 100)) {
      this.lastAmbience = time;
      this.ambience.clear();
      if (!prefs.reducedEffects) {
        const ripple = (time % 1800) / 1800;
        this.ambience
          .lineStyle(1, 0xb4ddcd, 0.4 * (1 - ripple))
          .strokeEllipse(900, 652, 45 + ripple * 76, 13 + ripple * 20);
        for (const entry of this.animated) {
          if (entry.kind === "portal")
            entry.image.setAlpha(0.78 + 0.16 * Math.sin(time / 700));
          else entry.image.setFrame(Math.floor(time / 700) % 2);
        }
      }
    }
    if (targetFps !== this.fpsLimit) {
      this.game.loop.setFPSLimit(targetFps);
      this.fpsLimit = targetFps;
    }
    const zoom =
      Math.max(0.65, Math.min(1.15, this.scale.width / 1050)) * prefs.zoom;
    if (this.cameras.main.zoom !== zoom) this.cameras.main.setZoom(zoom);
    if (time - this.lastCull > 250 && this.cameras.main.worldView.width) {
      const v = this.cameras.main.worldView;
      for (const sprite of this.staticSprites)
        sprite.setVisible(
          sprite.x + sprite.displayWidth / 2 > v.left - 80 &&
            sprite.x - sprite.displayWidth / 2 < v.right + 80 &&
            sprite.y > v.top - 80 &&
            sprite.y - sprite.displayHeight < v.bottom + 80,
        );
      for (const label of this.labels)
        label.text.setVisible(
          label.text.x > v.left - 200 &&
            label.text.x < v.right + 200 &&
            label.text.y > v.top - 40 &&
            label.text.y < v.bottom + 40,
        );
      this.lastCull = time;
    }
    if (this.trainingGame) {
      const g = this.trainingGame;
      for (const e of g.enemies) {
        e.x = 310;
        e.y = 1240;
        e.speed = 0;
      }
      advanceGame(g, delta / 1000, 0, 0);
      drainFeedback(g, (event) => this.trainingVfx.emit(event, prefs));
      this.trainingEffects.clear();
      for (const spark of g.sparks)
        this.trainingEffects
          .fillStyle(
            Number.parseInt(spark.color.slice(1), 16),
            Math.max(0, 1 - spark.age / spark.life),
          )
          .fillRect(spark.x, spark.y, 3, 3);
      this.training = 1e9 - (g.enemies[0]?.hp ?? 0);
      for (let i = 0; i < Math.min(64, g.bullets.length); i++) {
        const b = g.bullets[i];
        const image =
          this.trainingShots[i] ??
          (this.trainingShots[i] = this.add
            .image(b.x, b.y, "projectiles", 0)
            .setDepth(1e5)
            .setScale(1.5));
        image
          .setPosition(b.x, b.y)
          .setFrame(b.sprite ?? 0)
          .setRotation(Math.atan2(b.vy, b.vx))
          .setVisible(true);
      }
      for (let i = g.bullets.length; i < this.trainingShots.length; i++)
        this.trainingShots[i].setVisible(false);
    }
    this.trainingVfx.draw(Math.min(0.1, delta / 1000), prefs);
    const k = this.keys,
      preset = useSettings.getState().keyboard,
      w = preset !== "arrows",
      a = preset !== "wasd";
    const x =
        Number((w && k.D?.isDown) || (a && k.RIGHT?.isDown)) -
        Number((w && k.A?.isDown) || (a && k.LEFT?.isDown)) +
        (this.drag?.dx ?? 0),
      y =
        Number((w && k.S?.isDown) || (a && k.DOWN?.isDown)) -
        Number((w && k.W?.isDown) || (a && k.UP?.isDown)) +
        (this.drag?.dy ?? 0);
    this.moving = !this.locked && Math.hypot(x, y) > 0.05;
    if (!this.locked) this.position = move(this.position, x, y, delta / 1000);
    if (this.moving) this.facing = facingFromAngle(Math.atan2(y, x));
    const active = this.trainingGame;
    this.rig.update({
      x: this.position.x,
      y: this.position.y,
      character: this.startData.character,
      outfit: this.startData.outfit,
      weapon: this.startData.weapon,
      facing: active?.player.facing ?? this.facing,
      time,
      moving: this.moving,
      attack: active
        ? Math.max(0, (active.player.attackUntil ?? 0) - active.time)
        : 0,
      angle: active?.player.attackAngle,
      reduced: prefs.reducedEffects,
    });
    if (this.moving && time - this.lastStep > 360) {
      audio.play("step");
      this.lastStep = time;
    }
    this.ring.clear();
    const target = nearest(this.position);
    if (target && !this.locked)
      this.ring
        .lineStyle(1, 0xc9d6a2, 0.6)
        .strokeEllipse(target.entrance.x, target.entrance.y, 42, 18);
    this.stick.clear();
    if (this.drag && !this.locked)
      this.stick
        .lineStyle(2, 0xc9d6a2, 0.5)
        .strokeCircle(this.drag.x, this.drag.y, 35)
        .fillStyle(0xc9d6a2, 0.65)
        .fillCircle(
          this.drag.x + this.drag.dx * 25,
          this.drag.y + this.drag.dy * 25,
          10,
        );
    if (time - this.lastHud > 180) {
      this.publish();
      this.lastHud = time;
    }
    if (this.moving && time - this.lastSave > 10000) {
      this.bridge.emit("haven-save", { ...this.position });
      this.lastSave = time;
    }
  }
}
declare global {
  interface Window {
    __NOWRIFT_HAVEN__?: {
      state: () => { position: Point; locked: boolean; session: string };
      place: (p: Point) => void;
      appearance: () => ReturnType<CharacterRig["describe"]>;
    };
  }
}
