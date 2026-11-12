import {
  captureCheckpoint,
  restoreCheckpoint,
  type RunCheckpoint,
} from "../persistence/checkpoint";
import type { RunOwner } from "../persistence/model";
import { seeded } from "../campaign/content";
import { applyBuild } from "../engine";
import { translateText } from "../../i18n/translator";
import { useLocale } from "../../state/locale";
import { applyLoadout, type Loadout } from "../loadout";
import { CombatVfx } from "./combat-vfx";
import { audio } from "../audio/engine";
import type { SoundId } from "../audio/palette";
import { FARM } from "../world/content";
import { onSceneEnd } from "./lifecycle";
import { CharacterRig } from "./character-rig";
import {
  queueSceneAssets,
  queueAppearanceAssets,
  warmSceneAssets,
} from "./asset-preloader";
import {
  appearanceAssets,
  defaultAppearance,
  type CharacterAppearance,
} from "../presentation/appearance";
import { assetAnimationFrame, type AssetWorld } from "../presentation/assets";
import { animationDuration } from "../presentation/animation";
import { feedback } from "../feedback";
import { facingFromAngle } from "../presentation/character";
import { farmPrompt } from "../world/farming";
import { ITEMS } from "../rpg/content";
import { drainFeedback, type Feedback } from "../feedback";
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
    const selected = this.registry.get("world") ?? "forest";
    const haven = this.registry.get("haven");
    const look =
      haven?.visualAppearance ??
      defaultAppearance(
        haven?.character ?? "wanderer",
        haven?.outfit ?? "moss",
      );
    const queued = queueSceneAssets(
      this,
      selected as AssetWorld,
      appearanceAssets(look).map((asset) => asset.path),
    );
    this.load.once("complete", () => warmSceneAssets(queued));
    // Farming portal uses the hub portal art in a combat world.
    this.load.image("haven-rift", "/assets/haven/portal.png");
    this.load.on("progress", (value: number) => bridge.emit("loading", value));
    this.load.on("loaderror", (file: Phaser.Loader.File) =>
      bridge.emit(
        "error",
        "Missing art: " + file.key + ". A fallback is in use; reload to retry.",
      ),
    );
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
    this.scene.start(
      this.registry.get("world") === "haven" ? "HavenScene" : "MainMenuScene",
    );
  }
}
/** Recycled Phaser images/texts: no GameObject allocation in the update loop after warmup. */
class ForestRenderer {
  player: Phaser.GameObjects.Container;
  rig: CharacterRig;
  enemies: Phaser.GameObjects.Image[] = [];
  bullets: Phaser.GameObjects.Image[] = [];
  drops: Phaser.GameObjects.Image[] = [];
  statuses: Phaser.GameObjects.Image[] = [];
  dropShadows: Phaser.GameObjects.Graphics;
  sparks: Phaser.GameObjects.Image[] = [];
  texts: Phaser.GameObjects.Text[] = [];
  deaths: Phaser.GameObjects.Image[] = [];
  health: Phaser.GameObjects.Graphics;
  telegraphs: Phaser.GameObjects.Graphics;
  joystick: Phaser.GameObjects.Graphics;
  light: Phaser.GameObjects.Image;
  vfx: CombatVfx;
  atmosphere: Phaser.GameObjects.Graphics;
  accents: Phaser.GameObjects.Graphics;
  tick = 0;
  impactHold = 0;
  lastShake = -1000;
  world = "forest";
  lastHp = 100;
  skin = "";
  constructor(
    private scene: Phaser.Scene,
    g?: Simulation,
  ) {
    this.vfx = new CombatVfx(scene);
    this.dropShadows = scene.add.graphics().setDepth(-79);
    this.atmosphere = scene.add.graphics().setDepth(4500);
    this.accents = scene.add.graphics().setDepth(6100);
    this.world = g?.campaign?.world.id ?? "forest";
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
    this.rig = new CharacterRig(scene, 2);
    this.player = this.rig.root;
    this.health = scene.add.graphics();
    this.telegraphs = scene.add.graphics().setDepth(8500);
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
  consume(event: Feedback) {
    const prefs = useSettings.getState();
    this.vfx.emit(event, prefs);
    const sounds: Partial<Record<Feedback["kind"], SoundId>> = {
      slash: "attack",
      magic: "magic",
      burn: "fire",
      freeze: "ice",
      explosion: "explosion",
      shield: "shield",
      lightning: "lightning",
      heal: "heal",
      level: "level",
      pickup: "pickup",
      bossSpawn: "bossIntro",
      bossDeath: "bossDeath",
      telegraph: "anticipation",
      phase: "phase",
      shockwave: "heavy",
      damage: "damage",
      death: "enemyDeath",
      rare: "unlock",
      spark: "enemyHit",
    };
    const sound =
      event.kind === "death" && event.important
        ? "death"
        : event.kind === "spark" && event.important
          ? "critical"
          : sounds[event.kind];
    if (sound) audio.play(sound);
    if (event.kind === "damage" || (event.kind === "spark" && event.important))
      this.impactHold = 0.035;
    if (
      event.important &&
      !prefs.reducedEffects &&
      prefs.shake > 0 &&
      this.tick - this.lastShake > 160
    ) {
      this.scene.cameras.main.shake(
        event.kind === "bossDeath" ? 220 : 90,
        0.004 * prefs.shake,
      );
      this.lastShake = this.tick;
    }
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
    const prefs = useSettings.getState();
    const reduced = prefs.reducedEffects;
    const dt = ["paused", "upgrade"].includes(g.phase)
      ? 0
      : Math.min(0.05, delta / 1000);
    this.impactHold = Math.max(0, this.impactHold - dt);
    this.vfx.draw(dt, prefs);
    const camera = this.scene.cameras.main;
    this.light
      .setPosition(
        (camera.width / 2) * (1 - 1 / camera.zoom),
        (camera.height / 2) * (1 - 1 / camera.zoom),
      )
      .setDisplaySize(camera.width / camera.zoom, camera.height / camera.zoom);
    const attack = Math.max(0, (g.player.attackUntil ?? 0) - g.time);
    this.rig.update({
      x: g.player.x,
      y: g.player.y,
      character: g.character,
      outfit: this.scene.registry.get("outfit") ?? "moss",
      weapon: g.equippedWeapon ?? null,
      appearance: g.visualAppearance,
      pose:
        g.visualAction && g.time < g.visualAction.until
          ? g.visualAction.pose
          : undefined,
      poseAge: g.visualAction ? (g.time - g.visualAction.at) * 1000 : undefined,
      practice: g.equippedWeapon ? undefined : g.weaponId,
      facing:
        attack > 0
          ? facingFromAngle(g.player.attackAngle ?? g.player.angle)
          : (g.player.facing ?? facingFromAngle(g.player.angle)),
      time: this.tick,
      moving: g.player.moving,
      attack,
      attackId: g.player.attackUntil,
      angle: g.player.attackAngle ?? g.player.angle,
      hit: g.player.hit > 0,
      invincible: g.player.invincible > 0,
      dead: g.player.hp <= 0,
      deathComplete: g.phase === "gameover" && delta === 0,
      reduced,
    });
    this.light.setAlpha(0.7 + prefs.glow * 0.3);
    const accent = this.accents.clear();
    const charge = 1 - Math.max(0, g.weapon.cooldown) / g.weapon.delay;
    if (charge > 0.72 && g.phase === "playing") {
      accent.lineStyle(1, 0xd8ceb0, 0.22 + (charge - 0.72) * 1.1);
      accent.strokeCircle(g.player.x, g.player.y + 10, 17 + (1 - charge) * 15);
    }
    for (
      let n = 0;
      n < Math.min(g.bullets.length, prefs.quality === "low" ? 32 : 120);
      n++
    ) {
      const b = g.bullets[n];
      accent.lineStyle(
        b.hostile ? 2 : 1.5,
        b.hostile ? 0xf1ac9a : Number.parseInt(b.color.slice(1), 16),
        b.hostile ? 0.65 : 0.4,
      );
      const length = b.hostile ? 0.06 : 0.035;
      accent.lineBetween(b.x, b.y, b.x - b.vx * length, b.y - b.vy * length);
    }
    if (g.player.invincible > 0) {
      accent.lineStyle(1, 0xb6dce1, 0.5);
      accent.strokeCircle(g.player.x, g.player.y, 22);
    }
    if (g.campaign?.burn) {
      accent.lineStyle(2, 0xf9a26b, 0.8);
      accent.strokeCircle(g.player.x, g.player.y, 18);
    }
    const ambient = this.atmosphere.clear();
    const colors: Record<string, number> = {
      forest: 0xadd4ae,
      desert: 0xe4c28b,
      frozen: 0xc8e9ee,
      infernal: 0xf4a35e,
    };
    const count = reduced
      ? 0
      : Math.round((prefs.quality === "low" ? 10 : 28) * prefs.particles);
    const view = camera.worldView;
    for (let n = 0; n < count; n++) {
      const x =
        view.x + ((n * 197 + this.tick * 0.013) % Math.max(1, view.width));
      const y =
        view.y +
        ((n * 109 +
          this.tick * (this.world === "infernal" ? -0.016 : 0.008) +
          100000) %
          Math.max(1, view.height));
      ambient.fillStyle(colors[this.world], 0.18 + (n % 3) * 0.08);
      ambient.fillRect(x, y, this.world === "frozen" ? 2 : 3, 2);
    }
    this.lastHp = g.player.hp;

    const hp = this.health;
    hp.clear().setDepth(7000);
    let i = 0,
      statusCount = 0;
    for (const e of g.enemies) {
      const pose =
        (e.hit ?? 0) > 0
          ? "hit"
          : ((e.kind === "caster" || e.kind === "boss") &&
                (e.attack ?? 9) < 0.25) ||
              e.contact > 0.55
            ? "attack"
            : e.speed > 0
              ? "walk"
              : "idle";
      const frame = assetAnimationFrame(
        this.skin + e.kind,
        pose,
        this.tick + e.id * 39,
      );
      const image = this.image(this.enemies, i++, this.skin + e.kind, frame);
      image
        .setPosition(e.x, e.y)
        .setScale(2)
        .setDepth(e.y)
        .setFlipX(e.x > g.player.x);
      if ((e.hit ?? 0) > 0) image.setTint(0xf6e6bc).setTintFill();
      else if ((e.slow ?? 0) > 0) {
        image.setTint(0xa4e2ed);
        if (
          statusCount < (prefs.quality === "low" ? 24 : 64) &&
          camera.worldView.contains(e.x, e.y) &&
          this.scene.textures.exists("pixel-vfx-frost")
        ) {
          this.image(
            this.statuses,
            statusCount++,
            "pixel-vfx-frost",
            8 + (reduced ? 0 : Math.floor(this.tick / 100) % 8),
          )
            .setPosition(Math.round(e.x), Math.round(e.y - e.r - 12))
            .setScale(0.5)
            .setDepth(e.y + 5)
            .setAlpha(0.8);
        }
      }
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
    this.trim(this.statuses, statusCount);
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
    const shadows = this.dropShadows.clear().fillStyle(0x091b20, 0.4);
    for (const d of g.drops) {
      if (!camera.worldView.contains(d.x, d.y)) continue;
      shadows.fillEllipse(Math.round(d.x), Math.round(d.y + 5), 10, 4);
      this.image(this.drops, i++, "icons", d.kind === "heal" ? 7 : 0)
        .setPosition(
          Math.round(d.x),
          Math.round(d.y + (reduced ? 0 : Math.sin(this.tick / 260 + d.x) * 2)),
        )
        .setScale(0.8)
        .setDepth(d.y - 1)
        .setTint(d.kind === "heal" ? 0xffbeb1 : 0xa9e8cf);
    }
    this.trim(this.drops, i);
    i = 0;
    for (const p of g.sparks) {
      if (i >= (reduced ? 20 : Math.round(240 * prefs.particles))) break;
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
        if (t.value === "player") continue; // The modular rig owns the real character death.
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
      if (
        t.kind === "damage" &&
        (prefs.damageNumbers === "off" ||
          (prefs.damageNumbers === "sparse" && !t.critical && i >= 6))
      )
        continue;
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
        .setText(
          translateText(useLocale.getState().locale, t.value) +
            (t.critical ? "!" : ""),
        )
        .setColor(
          t.critical
            ? "#ffe0a2"
            : t.color === "#dbbf8b"
              ? "#e8e8c9"
              : (t.color ?? "#e8e8c9"),
        )
        .setScale(t.critical ? 1.2 : 1)
        .setPosition(t.x, t.y - t.age * 34)
        .setDepth(7100)
        .setAlpha(1 - t.age / t.life);
    }
    this.trim(this.texts, i);
    this.trim(this.deaths, deaths);
    for (const h of g.hazards) {
      const ratio = h.age / h.delay;
      this.telegraphs.lineStyle(5, 0x181b20, 0.95);
      this.telegraphs.strokeCircle(h.x, h.y, h.r + 1);
      this.telegraphs.fillStyle(0xe68b74, 0.12 + ratio * 0.2);
      this.telegraphs.fillCircle(h.x, h.y, h.r);
      this.telegraphs.lineStyle(3, 0xffd6a0, 1);
      this.telegraphs.strokeCircle(h.x, h.y, h.r);
      this.telegraphs.strokeCircle(h.x, h.y, h.r * Math.min(1, ratio));
      this.telegraphs.lineBetween(h.x - 5, h.y, h.x + 5, h.y);
      this.telegraphs.lineBetween(h.x, h.y - 5, h.x, h.y + 5);
    }
    // Draw the entire dash corridor, not just the destination circle.
    for (const e of g.enemies)
      if (e.charge && e.charge.delay > 0) {
        const c = e.charge,
          len = Math.hypot(c.vx, c.vy),
          nx = (-c.vy / len) * 22,
          ny = (c.vx / len) * 22;
        const tx = e.x + c.vx * c.left,
          ty = e.y + c.vy * c.left;
        this.telegraphs.fillStyle(0xe8b18b, 0.24);
        this.telegraphs.beginPath();
        this.telegraphs.moveTo(e.x + nx, e.y + ny);
        this.telegraphs.lineTo(tx + nx, ty + ny);
        this.telegraphs.lineTo(tx - nx, ty - ny);
        this.telegraphs.lineTo(e.x - nx, e.y - ny);
        this.telegraphs.closePath();
        this.telegraphs.fillPath();
        this.telegraphs.lineStyle(3, 0xffd6a0, 1);
        this.telegraphs.lineBetween(e.x, e.y, tx, ty);
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
    if ((this.registry.get("world") ?? "forest") === "forest") {
      const renderer = new ForestRenderer(this);
      renderer.draw(makeGame(), 0, null);
    }
    this.cameras.main.centerOn(900, 700);
    const off = bridge.on("command", (command) => {
      if (command.type === "start")
        this.scene.start("GameScene", {
          weapon: command.weapon,
          stage: command.stage,
          loadout: command.loadout,
          run: command.run,
          checkpoint: command.checkpoint,
          visualAppearance: command.visualAppearance,
          hold: command.hold,
        });
    });
    onSceneEnd(this, off);
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
  lastFrameAt = 0;
  renderFrames = 0;
  lastHud = 0;
  lastPhase = "";
  terminalTime = 0;
  reported = false;
  runId = "";
  run?: RunOwner;
  seed = 0;
  stage?: StageSelection;
  loadout?: Loadout;
  lastCheckpoint = 0;
  storageBlocked = false;
  farmNodes: Phaser.GameObjects.Image[] = [];
  pendingGather: { id: string; sequence: number }[] = [];
  tonicPending = false;
  transitionLocked = false;
  tonicReceipts = new Set<string>();
  constructor() {
    super("GameScene");
  }
  init(data: {
    weapon: WeaponId;
    visualAppearance?: CharacterAppearance;
    stage?: StageSelection;
    loadout?: Loadout;
    run?: RunOwner;
    checkpoint?: RunCheckpoint | null;
    hold?: boolean;
  }) {
    this.seed =
      data.checkpoint?.seed ??
      data.stage?.seed ??
      crypto.getRandomValues(new Uint32Array(1))[0];
    this.transitionLocked = !!data.hold;
    this.run = data.run;
    this.stage = data.checkpoint?.stage ?? data.stage;
    this.registry.set("outfit", this.stage?.outfit);
    this.loadout = data.checkpoint?.loadout ?? data.loadout;
    this.lastCheckpoint = 0;
    this.storageBlocked = false;
    this.simulation = data.checkpoint
      ? restoreCheckpoint(data.checkpoint)
      : data.stage
        ? loadStage(data.stage, data.weapon)
        : makeGame(FOREST.width, FOREST.height, data.weapon, seeded(this.seed));
    if (!data.checkpoint) {
      if (this.simulation.build)
        this.simulation.character =
          data.stage?.character ?? data.loadout?.character ?? "wanderer";
      else applyLoadout(this.simulation, data.loadout);
    }
    if (!data.checkpoint && !this.simulation.visualAppearance)
      this.simulation.visualAppearance =
        data.visualAppearance ??
        defaultAppearance(
          this.simulation.character,
          this.stage?.outfit ?? "moss",
        );
    this.pendingGather = [];
    this.lastFrameAt = performance.now();
    this.renderFrames = 0;
    this.lastHud = 0;
    this.lastPhase = "";
    this.terminalTime = 0;
    this.reported = false;
    this.runId = this.run?.id ?? crypto.randomUUID();
    this.simulation.id = this.runId;
    this.tonicPending = false;
    this.tonicReceipts = new Set(data.checkpoint?.tonics ?? []);
    this.joystick = null;
    this.pointer = null;
  }
  preload() {
    const look =
      this.simulation.visualAppearance ??
      defaultAppearance(
        this.simulation.character,
        this.stage?.outfit ?? "moss",
      );
    const queued = queueAppearanceAssets(
      this,
      appearanceAssets(look).map((asset) => asset.path),
    );
    this.load.once("complete", () => warmSceneAssets(queued));
    const progress = (value: number) =>
        (this.registry.get("bridge") as GameBridge).emit("loading", value),
      loadError = (file: Phaser.Loader.File) =>
        (this.registry.get("bridge") as GameBridge).emit(
          "error",
          `Missing art: ${file.key}. A fallback is in use; reload to retry.`,
        );
    this.load.on("progress", progress);
    this.load.on("loaderror", loadError);
    onSceneEnd(this, () => {
      this.load.off("progress", progress);
      this.load.off("loaderror", loadError);
    });
  }
  create() {
    this.bridge = this.registry.get("bridge");
    const g = this.simulation;
    this.visuals = new ForestRenderer(this, g);
    this.farmNodes = [];
    if (this.stage?.activity === "farming") {
      this.add
        .image(FARM.portal.x, FARM.portal.y, "haven-rift")
        .setScale(1.1)
        .setOrigin(0.5, 0.8)
        .setDepth(FARM.portal.y - 10);
      for (const node of FARM.nodes)
        this.farmNodes.push(
          this.add
            .image(node.x, node.y, "items", ITEMS[node.item].icon)
            .setScale(1.7)
            .setDepth(node.y),
        );
    }
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
      if (this.tonicPending || this.storageBlocked) return;
      togglePause(g);
      this.clearInput();
      this.publish();
    };
    this.keys?.ESC.on("down", escape);
    const farmInteract = () => this.command({ type: "expedition-interact" });
    this.input.keyboard?.on("keydown-E", farmInteract);
    const interrupt = () => {
      if (g.phase === "playing") togglePause(g);
      this.clearInput();
      this.publish();
    };
    const visibility = () => {
      if (document.hidden) {
        interrupt();
        this.checkpoint();
      }
    };
    const pagehide = () => {
      interrupt();
      this.checkpoint();
    };
    window.addEventListener("pagehide", pagehide);
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
      `${g.campaign?.world.name ?? "Forest"} arena. WASD, arrow keys, or touch drag to move. Weapons attack automatically.`,
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
      const area = useSettings.getState().touchArea;
      const bounds = canvas.getBoundingClientRect();
      if (
        (area === "left" && e.clientX > bounds.left + bounds.width / 2) ||
        (area === "right" && e.clientX < bounds.left + bounds.width / 2)
      )
        return;
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
    const setQuality = () =>
      this.game.loop.setFPSLimit(
        ["paused", "upgrade"].includes(g.phase)
          ? 15
          : useSettings.getState().quality === "low"
            ? 30
            : 60,
      );
    setQuality();
    const unsubSettings = useSettings.subscribe((next, previous) => {
      if (next.zoom !== previous.zoom) this.resize();
      if (next.quality !== previous.quality) setQuality();
    });
    onSceneEnd(this, () => {
      off();
      unsubSettings();
      this.clearInput();
      this.keys?.ESC.off("down", escape);
      this.input.keyboard?.off("keydown-E", farmInteract);
      window.removeEventListener("keydown", preventScroll);
      window.removeEventListener("blur", interrupt);
      window.removeEventListener("pagehide", pagehide);
      document.removeEventListener("visibilitychange", visibility);
      this.scale.off("resize", this.resize, this);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
    });
    // Render recovered paused runs before publishing their ready HUD. Waiting
    // for the first throttled update briefly exposes the default weapon/rig.
    this.visuals.draw(g, 0, null);
    this.publish();
    // Test-only fixture control is excluded unless explicitly enabled at build time.
    this.checkpoint();
    if (process.env.NEXT_PUBLIC_E2E === "1") {
      window.__NOWRIFT_TEST__ = {
        state: () => this.simulation,
        audio: () => audio.diagnostics(),
        effects: () => this.visuals.vfx.count,
        appearance: () => this.visuals.rig.describe(),
        vfx: () => this.visuals.vfx.describe(),
        metrics: () => ({
          frames: this.renderFrames,
          fpsLimit: this.game.loop.fpsLimit,
          effects: this.visuals.vfx.count,
          particles: g.sparks.length,
          feedback: g.feedback.length,
          textObjects: this.visuals.texts.length,
        }),
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
      const fixture = window.__NOWRIFT_TEST__;
      onSceneEnd(this, () => {
        if (window.__NOWRIFT_TEST__ === fixture) delete window.__NOWRIFT_TEST__;
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
  checkpoint() {
    const g = this.simulation;
    if (!this.run || !["playing", "paused", "upgrade"].includes(g.phase))
      return;
    try {
      this.run.sequence++;
      this.bridge.emit(
        "checkpoint",
        captureCheckpoint(
          g,
          { ...this.run },
          this.seed,
          this.stage,
          this.loadout,
          [...this.tonicReceipts],
        ),
      );
      this.lastCheckpoint = performance.now();
    } catch (error) {
      this.bridge.emit("error", String(error));
    }
  }
  command(command: Command) {
    if (command.type === "transition-lock") {
      this.transitionLocked = command.locked;
      this.clearInput();
      this.lastFrameAt = performance.now();
      return;
    }
    if (
      this.transitionLocked &&
      ![
        "checkpoint",
        "storage-blocked",
        "storage-ready",
        "start",
        "exit",
      ].includes(command.type)
    )
      return;
    if (command.type === "expedition-interact") {
      const g = this.simulation;
      if (
        this.stage?.activity !== "farming" ||
        g.phase !== "playing" ||
        this.storageBlocked ||
        this.tonicPending
      )
        return;
      const prompt = farmPrompt(
        g.player,
        g.time,
        g.kills,
        g.campaign?.harvested ?? [],
      );
      if (prompt.target === "extract" && prompt.ready) {
        g.phase = "victory";
        audio.play("launch");
      } else if (prompt.target && prompt.target !== "extract") {
        g.campaign!.harvested!.push(prompt.target);
        this.checkpoint();
        this.pendingGather.push({
          id: prompt.target,
          sequence: this.run?.sequence ?? 0,
        });
      }
      this.publish();
      return;
    }
    if (command.type === "checkpoint") {
      this.checkpoint();
      return;
    }
    if (command.type === "storage-blocked") {
      this.storageBlocked = true;
      if (this.simulation.phase === "playing") togglePause(this.simulation);
      this.clearInput();
      this.publish();
      return;
    }
    if (command.type === "storage-ready") {
      this.storageBlocked = false;
      if (command.sequence !== undefined) {
        const completed = this.pendingGather.filter(
          (pending) => pending.sequence <= command.sequence!,
        );
        this.pendingGather = this.pendingGather.filter(
          (pending) => pending.sequence > command.sequence!,
        );
        for (const receipt of completed) {
          const node = FARM.nodes.find((entry) => entry.id === receipt.id)!;
          const g = this.simulation,
            pose = receipt.id === "copper-vein" ? "mine" : "gather";
          g.visualAction = {
            pose,
            at: g.time,
            until: g.time + animationDuration(pose) / 1000,
          };
          feedback(
            g,
            pose === "mine" ? "spark" : "pickup",
            node.x,
            node.y,
            pose === "mine" ? 0xe8c990 : 0xb8dea6,
            26,
            0,
            true,
          );
          audio.play("pickup");
        }
        this.publish();
      }
      return;
    }
    if (this.storageBlocked && ["pause", "upgrade"].includes(command.type))
      return;
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
        this.checkpoint();
      }
      this.tonicPending = false;
      return;
    }
    if (this.tonicPending) return;

    switch (command.type) {
      case "start":
        this.scene.restart({
          weapon: command.weapon,
          stage: command.stage,
          loadout: command.loadout,
          run: command.run,
          checkpoint: command.checkpoint,
          visualAppearance: command.visualAppearance,
          hold: command.hold,
        });
        break;
      case "pause":
        togglePause(this.simulation);
        this.clearInput();
        this.publish();
        this.checkpoint();
        break;
      case "upgrade":
        chooseUpgrade(this.simulation, command.id);
        this.clearInput();
        this.publish();
        this.checkpoint();
        break;
      case "exit":
        this.scene.start("MainMenuScene");
        break;
    }
  }
  publish() {
    this.bridge.emit("hud", snapshot(this.simulation));
    if (this.stage?.activity === "farming") {
      const g = this.simulation;
      this.bridge.emit(
        "expedition",
        farmPrompt(g.player, g.time, g.kills, g.campaign?.harvested ?? []),
      );
      for (let i = 0; i < this.farmNodes.length; i++)
        this.farmNodes[i].setVisible(
          !g.campaign?.harvested?.includes(FARM.nodes[i].id) ||
            this.pendingGather.some(
              (pending) => pending.id === FARM.nodes[i].id,
            ),
        );
    }
  }
  update(_time: number, _delta: number) {
    // Phaser smooths and accumulates delta when FPS-limited. Combat uses elapsed
    // monotonic wall time so Low quality changes rendering, never game speed.
    const now = performance.now();
    const delta = Math.max(0, now - this.lastFrameAt);
    this.lastFrameAt = now;
    const time = now;
    this.renderFrames++;
    const g = this.simulation,
      k = this.keys;
    if (this.transitionLocked) {
      this.visuals.draw(g, 0, null);
      return;
    }
    const preset = useSettings.getState().keyboard,
      wasd = preset !== "arrows",
      arrows = preset !== "wasd";
    const x =
      Number((wasd && k?.D.isDown) || (arrows && k?.RIGHT.isDown)) -
      Number((wasd && k?.A.isDown) || (arrows && k?.LEFT.isDown)) +
      (this.joystick?.dx ?? 0);
    const y =
      Number((wasd && k?.S.isDown) || (arrows && k?.DOWN.isDown)) -
      Number((wasd && k?.W.isDown) || (arrows && k?.UP.isDown)) +
      (this.joystick?.dy ?? 0);
    advanceGame(g, delta / 1000, x, y);
    drainFeedback(g, (event) => this.visuals.consume(event));
    audio.setScene(
      g.phase === "victory"
        ? "victory"
        : g.phase === "gameover"
          ? "defeat"
          : g.bossSpawned
            ? "boss"
            : g.enemies.length > 6
              ? "combat"
              : "exploration",
      g.campaign?.world.id ?? "forest",
      g.phase === "paused" || g.phase === "upgrade",
    );
    if (g.player.moving && g.phase === "playing") audio.play("step");
    if (g.phase !== "playing" && this.pointer !== null) this.clearInput();
    this.visuals.draw(g, delta, this.joystick);
    if (g.phase !== this.lastPhase)
      this.game.loop.setFPSLimit(
        ["paused", "upgrade"].includes(g.phase)
          ? 15
          : useSettings.getState().quality === "low"
            ? 30
            : 60,
      );
    if (
      (time - this.lastCheckpoint >= 10000 && g.phase === "playing") ||
      (g.phase !== this.lastPhase && ["paused", "upgrade"].includes(g.phase))
    )
      this.checkpoint();
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
          run: this.run ? { ...this.run } : undefined,
          at: Date.now(),
          outcome: g.phase,
          kills: g.kills,
          gold: g.gold,
          level: g.level,
          seconds: Math.floor(g.time),
          weapon: g.weaponId,
          campaign: g.campaign
            ? {
                ...(this.stage?.activity === "farming"
                  ? {
                      activity: "farming" as const,
                      harvested: g.campaign.harvested ?? [],
                      hp: g.player.hp,
                    }
                  : {}),
                id: this.runId,
                run: this.run ? { ...this.run } : undefined,
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
    this.game.loop.setFPSLimit(15);
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
          loadout: command.loadout,
          run: command.run,
          checkpoint: command.checkpoint,
          visualAppearance: command.visualAppearance,
        });
      if (command.type === "exit") this.scene.start("MainMenuScene");
    });
    onSceneEnd(this, off);
  }
}
declare global {
  interface Window {
    __NOWRIFT_TEST__?: {
      state: () => Simulation;
      audio?: () => ReturnType<typeof audio.diagnostics>;
      appearance?: () => ReturnType<CharacterRig["describe"]>;
      vfx?: () => ReturnType<CombatVfx["describe"]>;
      effects?: () => number;
      metrics?: () => {
        frames: number;
        fpsLimit: number;
        effects: number;
        particles: number;
        feedback: number;
        textObjects: number;
      };
      scenario: (name: "boss" | "upgrade" | "defeat" | "stress") => void;
      strikeBoss: () => void;
    };
  }
}
