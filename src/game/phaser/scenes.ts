import { applyBuild } from "../engine";
import { RARITIES } from "../rpg/content";
import { WORLDS } from "../campaign/content";
import { loadStage, type StageSelection } from "../campaign/loader";
import { buildWorld } from "./world-renderer";
import Phaser from "phaser";
import {
  advanceGame,
  advanceEffects,
  beginGame,
  chooseUpgrade,
  makeGame,
  snapshot,
  spawnEnemy,
  togglePause,
  type Game as Simulation,
} from "../engine";
import { FOREST, OBSTACLES, type WeaponId } from "../content/forest";
import { GameBridge, type Command } from "../bridge";
import { useSettings } from "../../state/settings";

const ASSETS = "/assets/forest/";
const PARTICLE_COLORS = [
  "#b7edcb",
  "#ffb369",
  "#b5f1ec",
  "#f19a8b",
  "#ffe09b",
  "#a2bcd3",
  "#bbd397",
  "#e9cf82",
];
const SHEETS = ["player", "slime", "goblin", "wolf", "caster", "elite", "boss"];
export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }
  create() {
    this.scene.start("PreloadScene");
  }
}
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }
  preload() {
    const bridge = this.registry.get("bridge") as GameBridge;
    this.load.on("progress", (value: number) => bridge.emit("loading", value));
    this.load.on("loaderror", (file: Phaser.Loader.File) =>
      bridge.emit(
        "error",
        "Missing art: " + file.key + ". A fallback is in use; reload to retry.",
      ),
    );
    this.load.spritesheet("items", "/assets/items/atlas.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    for (const w of WORLDS) {
      this.load.spritesheet(
        w.id + "-projectiles",
        "/assets/worlds/" + w.id + "/projectiles.png",
        { frameWidth: 16, frameHeight: 16 },
      );
      for (const kind of [...SHEETS.filter((k) => k !== "player")]) {
        const n = kind === "boss" ? 64 : 32;
        this.load.spritesheet(
          w.id + "-" + kind,
          "/assets/worlds/" + w.id + "/" + kind + ".png",
          { frameWidth: n, frameHeight: n },
        );
      }
      for (const name of ["tiles", "tree", "rock"])
        this.load.image(
          w.id + "-" + name,
          "/assets/worlds/" + w.id + "/" + name + ".png",
        );
    }
    for (const key of SHEETS) {
      const size = key === "boss" ? 64 : 32;
      this.load.spritesheet(key, ASSETS + key + ".png", {
        frameWidth: size,
        frameHeight: size,
      });
    }
    this.load.spritesheet("particles", ASSETS + "particles.png", {
      frameWidth: 4,
      frameHeight: 4,
    });
    this.load.spritesheet("projectiles", ASSETS + "projectiles.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet("icons", ASSETS + "icons.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    for (const key of ["ground", "tree", "rock"])
      this.load.image(key, ASSETS + key + ".png");
  }
  create() {
    // Procedural fallback uses a readable miniature sprite, never a broken-image dependency.
    for (const key of [
      ...SHEETS,
      "icons",
      "projectiles",
      "particles",
      "ground",
      "tree",
      "rock",
    ])
      if (!this.textures.exists(key)) {
        const texture = this.textures.createCanvas(key, 32, 32);
        if (!texture) continue;
        const c = texture.context;
        c.fillStyle = "#738569";
        c.fillRect(10, 9, 12, 17);
        c.fillStyle = "#c6c8a2";
        c.fillRect(12, 4, 8, 9);
        c.fillStyle = "#192c30";
        c.fillRect(13, 9, 6, 2);
        texture.refresh();
        for (let i = 0; i < 10; i++) texture.add(i, 0, 0, 0, 32, 32);
      }
    this.scene.start("MainMenuScene");
  }
}
/** Recycled Phaser images/texts: no GameObject allocation in the update loop after warmup. */
class ForestRenderer {
  player: Phaser.GameObjects.Image;
  enemies: Phaser.GameObjects.Image[] = [];
  bullets: Phaser.GameObjects.Image[] = [];
  drops: Phaser.GameObjects.Image[] = [];
  sparks: Phaser.GameObjects.Image[] = [];
  texts: Phaser.GameObjects.Text[] = [];
  deaths: Phaser.GameObjects.Image[] = [];
  health: Phaser.GameObjects.Graphics;
  telegraphs: Phaser.GameObjects.Graphics;
  joystick: Phaser.GameObjects.Graphics;
  light: Phaser.GameObjects.Image;
  tick = 0;
  lastHp = 100;
  aura: Phaser.GameObjects.Graphics;
  gear: Phaser.GameObjects.Image;
  skin = "";
  constructor(
    private scene: Phaser.Scene,
    g?: Simulation,
  ) {
    this.skin = g?.campaign ? g.campaign.world.id + "-" : "";
    if (g?.campaign) buildWorld(scene, g.campaign);
    else {
      scene.add
        .tileSprite(
          FOREST.width / 2,
          FOREST.height / 2,
          FOREST.width,
          FOREST.height,
          "ground",
        )
        .setDepth(-100);
      const paths = scene.add.graphics().setDepth(-99);
      paths.fillStyle(0x6c6550, 0.32);
      // Worn, irregular stepping-stone path through the central clearing.
      for (let i = 0; i < 95; i++) {
        const y = i * 16,
          x = 900 + Math.sin(i * 0.09) * 86;
        paths.fillRect(x - 36 + (i % 3) * 5, y, 72, 18);
        if (i % 3 === 0) {
          paths.fillStyle(0x9c9980, 0.14);
          paths.fillRect(x - 15, y, 18, 9);
          paths.fillStyle(0x6c6550, 0.32);
        }
      }
      const ruins = scene.add.graphics().setDepth(-95);
      ruins.lineStyle(3, 0xa3b49a, 0.22);
      ruins.strokeCircle(900, 700, 105);
      ruins.strokeCircle(900, 700, 112);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        ruins.fillStyle(0xa1b9a5, 0.3);
        ruins.fillRect(
          900 + Math.cos(a) * 104 - 3,
          700 + Math.sin(a) * 104 - 3,
          6,
          6,
        );
      }
      for (const o of OBSTACLES) {
        scene.add
          .image(o.x, o.y, o.type)
          .setOrigin(0.5, o.type === "tree" ? 0.87 : 0.75)
          .setScale(o.type === "tree" ? 1.65 : 1.6)
          .setDepth(o.y);
      }
    }
    const border = scene.add.graphics().setDepth(-90);
    border.lineStyle(14, 0x142c26, 0.8);
    border.strokeRect(9, 9, FOREST.width - 18, FOREST.height - 18);
    this.aura = scene.add.graphics();
    this.gear = scene.add.image(0, 0, "items", 0).setVisible(false);
    this.player = scene.add.image(900, 700, "player").setScale(2);
    this.health = scene.add.graphics();
    this.telegraphs = scene.add.graphics().setDepth(8);
    this.joystick = scene.add.graphics().setScrollFactor(0).setDepth(9000);
    if (!scene.textures.exists("shade")) {
      const tex = scene.textures.createCanvas("shade", 256, 256);
      if (tex) {
        const c = tex.context;
        const grad = c.createRadialGradient(128, 128, 30, 128, 128, 180);
        grad.addColorStop(0, "rgba(5,14,15,0)");
        grad.addColorStop(1, "rgba(4,14,18,.65)");
        c.fillStyle = grad;
        c.fillRect(0, 0, 256, 256);
        tex.refresh();
      }
    }
    this.light = scene.add
      .image(0, 0, "shade")
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(8000);
  }
  image(pool: Phaser.GameObjects.Image[], i: number, key: string, frame = 0) {
    let image = pool[i];
    if (!image) {
      image = this.scene.add.image(0, 0, key, frame);
      pool.push(image);
    }
    return image
      .setTexture(key, frame)
      .setVisible(true)
      .setAlpha(1)
      .clearTint();
  }
  trim(pool: { setVisible: (v: boolean) => unknown }[], length: number) {
    for (let i = length; i < pool.length; i++) pool[i].setVisible(false);
  }
  draw(
    g: Simulation,
    delta: number,
    joy: { x: number; y: number; dx: number; dy: number } | null,
  ) {
    if (
      g.phase === "playing" ||
      g.phase === "gameover" ||
      g.phase === "victory"
    )
      this.tick += delta;
    const reduced = useSettings.getState().reducedEffects;
    const camera = this.scene.cameras.main;
    this.light
      .setPosition(
        (camera.width / 2) * (1 - 1 / camera.zoom),
        (camera.height / 2) * (1 - 1 / camera.zoom),
      )
      .setDisplaySize(camera.width / camera.zoom, camera.height / camera.zoom);
    this.player
      .setPosition(g.player.x, g.player.y)
      .setDepth(g.player.y + 2)
      .setFlipX(Math.cos(g.player.angle) < 0)
      .setAlpha(
        g.player.invincible > 0 && Math.floor(this.tick / 70) % 2 === 0
          ? 0.5
          : 1,
      );
    let playerFrame =
      g.player.hp <= 0
        ? 6 + Math.min(1, Math.floor(this.tick / 200) % 2)
        : g.player.hit > 0
          ? 5
          : g.weapon.cooldown > g.weapon.delay - 0.14
            ? 4
            : g.player.moving
              ? 1 + (Math.floor(this.tick / 130) % 3)
              : Math.floor(this.tick / 650) % 2 === 0
                ? 0
                : 8;
    if (!this.scene.textures.get("player").has(String(playerFrame)))
      playerFrame = 0;
    this.player.setFrame(playerFrame);
    if (g.player.hp < this.lastHp && !reduced) camera.shake(110, 0.0025);
    this.lastHp = g.player.hp;
    this.aura.clear();
    this.gear.setVisible(!!g.appearance);
    if (g.appearance) {
      const color = Phaser.Display.Color.HexStringToColor(
        RARITIES[g.appearance.rarity].color,
      ).color;
      this.aura
        .setDepth(g.player.y - 2)
        .lineStyle(1.5, color, 0.65)
        .strokeEllipse(g.player.x, g.player.y + 19, 34, 13);
      this.gear
        .setFrame(g.appearance.icon)
        .setPosition(
          g.player.x + (Math.cos(g.player.angle) < 0 ? -18 : 18),
          g.player.y + 2,
        )
        .setScale(0.65)
        .setDepth(g.player.y + 4)
        .setFlipX(Math.cos(g.player.angle) < 0);
    }

    const hp = this.health;
    hp.clear().setDepth(7000);
    let i = 0;
    for (const e of g.enemies) {
      const frame =
        (e.hit ?? 0) > 0
          ? 5
          : ((e.kind === "caster" || e.kind === "boss") &&
                (e.attack ?? 9) < 0.25) ||
              e.contact > 0.55
            ? 4
            : 1 + (Math.floor((this.tick + e.id * 39) / 160) % 3);
      const image = this.image(this.enemies, i++, this.skin + e.kind, frame);
      image
        .setPosition(e.x, e.y)
        .setScale(2)
        .setDepth(e.y)
        .setFlipX(e.x > g.player.x);
      if ((e.slow ?? 0) > 0) image.setTint(0xa4e2ed);
      if (e.hp < e.maxHp && e.kind !== "boss") {
        hp.fillStyle(0x172b2b, 0.9);
        hp.fillRect(e.x - 15, e.y - e.r - 23, 30, 3);
        hp.fillStyle(0xb9c592);
        hp.fillRect(
          e.x - 15,
          e.y - e.r - 23,
          30 * Math.max(0, e.hp / e.maxHp),
          3,
        );
      }
    }
    this.trim(this.enemies, i);
    i = 0;
    for (const b of g.bullets) {
      const image = this.image(
        this.bullets,
        i++,
        b.hostile && this.skin ? this.skin + "projectiles" : "projectiles",
        b.sprite ?? 0,
      );
      image
        .setPosition(b.x, b.y)
        .setScale(b.hostile ? 1.25 : 1.1)
        .setDepth(b.y + 20)
        .setRotation(Math.atan2(b.vy, b.vx) + Math.PI / 4);
      if (b.hostile) image.setTint(0xf39ebd);
    }
    this.trim(this.bullets, i);
    i = 0;
    for (const d of g.drops) {
      this.image(this.drops, i++, "icons", d.kind === "heal" ? 7 : 0)
        .setPosition(d.x, d.y + Math.sin(this.tick / 260 + d.x) * 1.5)
        .setScale(0.8)
        .setDepth(d.y - 1)
        .setTint(d.kind === "heal" ? 0xffbeb1 : 0xa9e8cf);
    }
    this.trim(this.drops, i);
    i = 0;
    for (const p of g.sparks) {
      if (reduced && i > 32) break;
      this.image(
        this.sparks,
        i++,
        "particles",
        Math.max(0, PARTICLE_COLORS.indexOf(p.color)),
      )
        .setPosition(p.x, p.y)
        .setScale(p.size / 4)
        .setDepth(6000)
        .setAlpha(1 - p.age / p.life);
    }
    this.trim(this.sparks, i);
    this.telegraphs.clear();
    i = 0;
    let deaths = 0;
    for (const t of g.texts) {
      if (t.kind === "pulse") {
        this.telegraphs.lineStyle(
          3,
          Phaser.Display.Color.HexStringToColor(t.color ?? "#dbbf8b").color,
          1 - t.age / t.life,
        );
        this.telegraphs.strokeCircle(
          t.x,
          t.y,
          Number(t.value) * (t.age / t.life),
        );
        continue;
      }
      if (t.kind === "death") {
        const key = t.value === "player" ? "player" : this.skin + t.value;
        this.image(
          this.deaths,
          deaths++,
          key,
          6 + Math.min(1, Math.floor(t.age / 0.23)),
        )
          .setPosition(t.x, t.y)
          .setDepth(t.y + 3)
          .setScale(2)
          .setAlpha(1 - t.age / t.life);
        continue;
      }
      let label = this.texts[i];
      if (!label) {
        label = this.scene.add
          .text(0, 0, "", {
            fontFamily: "monospace",
            fontSize: "14px",
            fontStyle: "bold",
            stroke: "#1d2928",
            strokeThickness: 3,
          })
          .setOrigin(0.5);
        this.texts.push(label);
      }
      i++;
      label
        .setVisible(true)
        .setText(t.value + (t.critical ? "!" : ""))
        .setColor(t.critical ? "#ffe0a2" : "#e8e8c9")
        .setPosition(t.x, t.y - t.age * 34)
        .setDepth(7100)
        .setAlpha(1 - t.age / t.life);
    }
    this.trim(this.texts, i);
    this.trim(this.deaths, deaths);
    for (const h of g.hazards) {
      const ratio = h.age / h.delay;
      this.telegraphs.fillStyle(0xe68b74, 0.08 + ratio * 0.18);
      this.telegraphs.fillCircle(h.x, h.y, h.r);
      this.telegraphs.lineStyle(2, h.color ?? 0xf2bd86, 0.8);
      this.telegraphs.strokeCircle(h.x, h.y, h.r);
      this.telegraphs.strokeCircle(h.x, h.y, h.r * ratio);
    }
    this.joystick.clear();
    if (joy) {
      const z = camera.zoom;
      const cx = camera.width / 2,
        cy = camera.height / 2;
      const x = cx + (joy.x - cx) / z,
        y = cy + (joy.y - cy) / z;
      this.joystick.lineStyle(2 / z, 0xd5d7af, 0.6);
      this.joystick.fillStyle(0xa3b49c, 0.12);
      this.joystick.fillCircle(x, y, 44 / z);
      this.joystick.strokeCircle(x, y, 44 / z);
      this.joystick.fillStyle(0xe5d6a9, 0.7);
      this.joystick.fillCircle(
        x + (joy.dx * 28) / z,
        y + (joy.dy * 28) / z,
        16 / z,
      );
    }
  }
}
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }
  create() {
    const bridge = this.registry.get("bridge") as GameBridge;
    const renderer = new ForestRenderer(this);
    renderer.draw(makeGame(), 0, null);
    this.cameras.main.centerOn(900, 700);
    const off = bridge.on("command", (command) => {
      if (command.type === "start")
        this.scene.start("GameScene", {
          weapon: command.weapon,
          stage: command.stage,
        });
    });
    this.events.once("shutdown", off);
    bridge.emit("ready", true);
  }
}
export class GameScene extends Phaser.Scene {
  simulation!: Simulation;
  visuals!: ForestRenderer;
  bridge!: GameBridge;
  keys?: Record<string, Phaser.Input.Keyboard.Key>;
  joystick: { x: number; y: number; dx: number; dy: number } | null = null;
  pointer: number | null = null;
  lastHud = 0;
  lastPhase = "";
  terminalTime = 0;
  reported = false;
  runId = "";
  tonicPending = false;
  tonicReceipts = new Set<string>();
  constructor() {
    super("GameScene");
  }
  init(data: { weapon: WeaponId; stage?: StageSelection }) {
    this.simulation = data.stage
      ? loadStage(data.stage, data.weapon)
      : makeGame(FOREST.width, FOREST.height, data.weapon);
    this.lastHud = 0;
    this.lastPhase = "";
    this.terminalTime = 0;
    this.reported = false;
    this.runId = crypto.randomUUID();
    this.simulation.id = this.runId;
    this.tonicPending = false;
    this.tonicReceipts.clear();
    this.joystick = null;
    this.pointer = null;
  }
  create() {
    this.bridge = this.registry.get("bridge");
    const g = this.simulation;
    this.visuals = new ForestRenderer(this, g);
    if (g.phase === "menu") beginGame(g);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, FOREST.width, FOREST.height);
    cam.startFollow(this.visuals.player, true, 0.12, 0.12);
    this.resize();
    this.keys = this.input.keyboard?.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,ESC",
      false,
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    const escape = () => {
      if (this.tonicPending) return;
      togglePause(g);
      this.clearInput();
      this.publish();
    };
    this.keys?.ESC.on("down", escape);
    const interrupt = () => {
      if (g.phase === "playing") togglePause(g);
      this.clearInput();
      this.publish();
    };
    const visibility = () => {
      if (document.hidden) interrupt();
    };
    const preventScroll = (event: KeyboardEvent) => {
      if (
        g.phase === "playing" &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(
          event.key,
        ) &&
        !event.ctrlKey &&
        !event.metaKey
      )
        event.preventDefault();
    };
    window.addEventListener("keydown", preventScroll);
    window.addEventListener("blur", interrupt);
    document.addEventListener("visibilitychange", visibility);
    const off = this.bridge.on("command", (command) => this.command(command));
    const canvas = this.game.canvas;
    canvas.className = "game-canvas";
    canvas.setAttribute(
      "aria-label",
      "Forest arena. WASD, arrow keys, or touch drag to move. Weapons attack automatically.",
    );
    canvas.setAttribute("data-touch-active", "false");
    const point = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) * this.scale.width) / r.width,
        y: ((e.clientY - r.top) * this.scale.height) / r.height,
      };
    };
    const down = (e: PointerEvent) => {
      if (g.phase !== "playing" || this.pointer !== null) return;
      e.preventDefault();
      this.pointer = e.pointerId;
      this.joystick = { ...point(e), dx: 0, dy: 0 };
      canvas.setPointerCapture(e.pointerId);
      canvas.dataset.touchActive = "true";
      this.bridge.emit("touch", true);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== this.pointer || !this.joystick) return;
      const p = point(e),
        dx = p.x - this.joystick.x,
        dy = p.y - this.joystick.y,
        d = Math.max(42, Math.hypot(dx, dy));
      this.joystick.dx = dx / d;
      this.joystick.dy = dy / d;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === this.pointer) this.clearInput();
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("lostpointercapture", up);
    this.scale.on("resize", this.resize, this);
    const unsubSettings = useSettings.subscribe(() => this.resize());
    this.events.once("shutdown", () => {
      off();
      unsubSettings();
      this.clearInput();
      this.keys?.ESC.off("down", escape);
      window.removeEventListener("keydown", preventScroll);
      window.removeEventListener("blur", interrupt);
      document.removeEventListener("visibilitychange", visibility);
      this.scale.off("resize", this.resize, this);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
    });
    this.publish();
    // Test-only fixture control is excluded unless explicitly enabled at build time.
    if (process.env.NEXT_PUBLIC_E2E === "1") {
      window.__NOWRIFT_TEST__ = {
        state: () => this.simulation,
        scenario: (name) => {
          if (name === "boss") {
            g.time =
              (g.campaign
                ? g.campaign.definition.clear.seconds *
                  g.campaign.difficulty.duration
                : FOREST.duration) - 0.01;
            g.enemies.length = 0;
            g.bullets.length = 0;
            g.player.hp = g.player.maxHp;
            g.phase = "playing";
            advanceGame(g, 0.02, 0, 0);
          }
          if (name === "upgrade") {
            g.phase = "playing";
            g.xp = g.xpToNext;
            advanceGame(g, 0.02, 0, 0);
          }
          if (name === "defeat") {
            g.player.hp = 1;
            g.player.invincible = 0;
            g.phase = "playing";
            spawnEnemy(g, "slime", g.player.x, g.player.y);
            advanceGame(g, 0.02, 0, 0);
          }
          if (name === "stress") {
            g.enemies.length = 0;
            for (let i = 0; i < 150; i++) {
              const a = (i / 150) * Math.PI * 2;
              spawnEnemy(
                g,
                i % 5 === 0 ? "caster" : "slime",
                900 + Math.cos(a) * (100 + i * 2),
                700 + Math.sin(a) * (100 + i * 2),
              );
            }
            g.player.invincible = 999;
            g.spawnCooldown = 999;
          }
          this.publish();
        },
        strikeBoss: () => {
          const boss = g.enemies.find((e) => e.kind === "boss");
          if (!boss) return;
          g.bullets.push({
            x: boss.x,
            y: boss.y,
            vx: 0,
            vy: 0,
            r: 8,
            life: 1,
            damage: boss.hp,
            color: "#fff",
          });
          advanceGame(g, 0.02, 0, 0);
          this.publish();
        },
      };
      this.events.once("shutdown", () => {
        delete window.__NOWRIFT_TEST__;
      });
    }
  }
  resize() {
    const base = Math.min(this.scale.width / 780, this.scale.height / 510);
    this.cameras.main.setZoom(
      Phaser.Math.Clamp(base, 0.65, 1.55) * useSettings.getState().zoom,
    );
  }
  clearInput() {
    const id = this.pointer;
    this.pointer = null;
    this.joystick = null;
    const canvas = this.game.canvas;
    if (id !== null && canvas.hasPointerCapture(id))
      canvas.releasePointerCapture(id);
    canvas.dataset.touchActive = "false";
    this.bridge?.emit("touch", false);
    this.input.keyboard?.resetKeys();
  }
  command(command: Command) {
    if (command.type === "tonic-lock") {
      if (command.runId === this.runId && this.simulation.phase === "paused")
        this.tonicPending = true;
      return;
    }
    if (command.type === "tonic-unlock") {
      if (command.runId === this.runId) this.tonicPending = false;
      return;
    }
    if (command.type === "tonic") {
      if (
        command.runId === this.runId &&
        this.simulation.phase === "paused" &&
        !this.tonicReceipts.has(command.receiptId)
      ) {
        this.tonicReceipts.add(command.receiptId);
        if (command.definitionId === "health-tonic")
          this.simulation.player.hp = Math.min(
            this.simulation.player.maxHp,
            this.simulation.player.hp + 35,
          );
        else if (this.simulation.build) {
          this.simulation.focus = 20;
          applyBuild(this.simulation, this.simulation.build);
        }
        this.publish();
      }
      this.tonicPending = false;
      return;
    }
    if (this.tonicPending) return;

    switch (command.type) {
      case "start":
        this.scene.restart({ weapon: command.weapon, stage: command.stage });
        break;
      case "pause":
        togglePause(this.simulation);
        this.clearInput();
        this.publish();
        break;
      case "upgrade":
        chooseUpgrade(this.simulation, command.id);
        this.clearInput();
        this.publish();
        break;
      case "exit":
        this.scene.start("MainMenuScene");
        break;
    }
  }
  publish() {
    this.bridge.emit("hud", snapshot(this.simulation));
  }
  update(time: number, delta: number) {
    const g = this.simulation,
      k = this.keys;
    const x =
      Number(k?.D.isDown || k?.RIGHT.isDown) -
      Number(k?.A.isDown || k?.LEFT.isDown) +
      (this.joystick?.dx ?? 0);
    const y =
      Number(k?.S.isDown || k?.DOWN.isDown) -
      Number(k?.W.isDown || k?.UP.isDown) +
      (this.joystick?.dy ?? 0);
    advanceGame(g, delta / 1000, x, y);
    if (g.phase !== "playing" && this.pointer !== null) this.clearInput();
    this.visuals.draw(g, delta, this.joystick);
    if (time - this.lastHud > 100 || g.phase !== this.lastPhase) {
      this.publish();
      this.lastHud = time;
      this.lastPhase = g.phase;
    }
    if (g.phase === "victory" || g.phase === "gameover") {
      advanceEffects(g, Math.min(delta / 1000, 0.05));
      this.terminalTime += delta;
      if (!this.reported) {
        this.reported = true;
        this.bridge.emit("result", {
          id: this.runId,
          at: Date.now(),
          outcome: g.phase,
          kills: g.kills,
          gold: g.gold,
          level: g.level,
          seconds: Math.floor(g.time),
          weapon: g.weaponId,
          campaign: g.campaign
            ? {
                id: this.runId,
                stageId: g.campaign.definition.id,
                difficulty: g.campaign.difficulty.id,
                seed: g.campaign.seed,
                victory: g.phase === "victory",
                enemies: g.campaign.enemies,
                elites: g.campaign.elites,
                bosses: g.campaign.bosses,
                seconds: g.time,
              }
            : undefined,
        });
      }
      if (this.terminalTime > 850)
        this.scene.start("ResultsScene", { simulation: g });
    }
  }
}
export class ResultsScene extends Phaser.Scene {
  constructor() {
    super("ResultsScene");
  }
  create(data: { simulation: Simulation }) {
    const renderer = new ForestRenderer(this, data.simulation);
    renderer.draw(data.simulation, 0, null);
    this.cameras.main.centerOn(
      data.simulation.player.x,
      data.simulation.player.y,
    );
    this.cameras.main.setZoom(0.9);
    const bridge = this.registry.get("bridge") as GameBridge;
    const off = bridge.on("command", (command) => {
      if (command.type === "start")
        this.scene.start("GameScene", {
          weapon: command.weapon,
          stage: command.stage,
        });
      if (command.type === "exit") this.scene.start("MainMenuScene");
    });
    this.events.once("shutdown", off);
  }
}
declare global {
  interface Window {
    __NOWRIFT_TEST__?: {
      state: () => Simulation;
      scenario: (name: "boss" | "upgrade" | "defeat" | "stress") => void;
      strikeBoss: () => void;
    };
  }
}
