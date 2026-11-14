import { attachMovementInput } from "../input/keyboard";
import { keyHint } from "../input/bindings";
import Phaser from "phaser";
import { districtAt } from "../world/city";
import { HavenCity } from "./haven-city";
import { CharacterRig } from "./character-rig";
import { CombatVfx } from "./combat-vfx";
import { drainFeedback } from "../feedback";
import {
  createVisualActionState,
  commitVisualAction,
  advanceVisualAction,
  type ActionVisualReceipt,
} from "../presentation/action-feedback";
import { facingFromAngle, type Facing } from "../presentation/character";
import { GameBridge, type Command } from "../bridge";
import { move, nearest, validPosition, type Point } from "../world/content";
import { cityBounds, regionalCity } from "../world/regional-city";
import { emptyFog, validFog, revealFog } from "../world/exploration";
import { regionById } from "../world/regions";
import type { HavenStart } from "../world/bridge";
import { translate, translateText } from "../../i18n/translator";
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
  get region() {
    return this.startData?.region ?? "central";
  }
  get bounds() {
    return cityBounds(this.region);
  }
  get landmarks() {
    return regionalCity(this.region).landmarks;
  }
  private validPoint(value: unknown): value is Point {
    return validPosition(value, this.region);
  }
  private nearest(point: Point) {
    return nearest(point, this.region);
  }
  explored = "";
  fogCell = "";
  city!: HavenCity;
  bridge!: GameBridge;
  startData!: HavenStart;
  actor!: Phaser.GameObjects.Container;
  rig!: CharacterRig;
  facing: Facing = "down";
  trainingEffects!: Phaser.GameObjects.Graphics;
  trainingVfx!: CombatVfx;
  trainingGame: Game | null = null;
  trainingShots: Phaser.GameObjects.Image[] = [];
  position: Point = { ...this.bounds.spawn };
  positionEpoch = 0;
  locked = false;
  moving = false;
  inputSource?: ReturnType<typeof attachMovementInput>;
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
  stationLoops: { image: Phaser.GameObjects.Image }[] = [];
  visualAction = createVisualActionState();
  lastReceipt: ActionVisualReceipt | null = null;
  didEnter = false;
  constructor() {
    super("HavenScene");
  }
  create() {
    this.bridge = this.registry.get("bridge");
    this.startData = structuredClone(this.registry.get("haven"));
    this.position = this.validPoint(this.startData.position)
      ? { ...this.startData.position }
      : { ...this.bounds.spawn };
    this.positionEpoch = this.startData.positionEpoch ?? 0;
    this.locked = true;
    this.pointer = null;
    this.drag = null;
    this.labels = [];
    this.staticSprites = [];
    this.animated = [];
    this.stationLoops = [];
    this.lastSave = 0;
    this.trainingGame = null;
    this.trainingShots = [];
    this.training = 0;
    this.facing = "down";
    this.visualAction = createVisualActionState();
    this.lastReceipt = null;
    this.didEnter = false;
    this.lastHud = 0;
    this.lastFrameAt = performance.now();
    this.explored = revealFog(
      validFog(this.startData.explored, this.region)
        ? this.startData.explored
        : emptyFog(this.region),
      this.region,
      this.position,
    );
    this.city = new HavenCity(this, this.region);
    if (this.startData.questStates)
      this.city.setQuestStates(this.startData.questStates);
    this.labels = this.city.labels;
    this.staticSprites = this.city.sprites;
    if (this.startData.milestones)
      this.city.setMilestones(this.startData.milestones);
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
        translate(
          useLocale.getState().locale,
          "qol",
          "Move {up}/{left}/{down}/{right} or touch. Interact {interact}; Sanctuary {sanctuary}.",
          {
            up: keyHint(useSettings.getState(), "up"),
            left: keyHint(useSettings.getState(), "left"),
            down: keyHint(useSettings.getState(), "down"),
            right: keyHint(useSettings.getState(), "right"),
            interact: keyHint(useSettings.getState(), "interact"),
            sanctuary: keyHint(useSettings.getState(), "sanctuary"),
          },
        ),
      );
      for (const label of this.labels) {
        const l = this.landmarks.find((l) => l.id === label.id)!;
        label.text.setText(translateText(useLocale.getState().locale, l.name));
      }
    };
    locale();
    const offLocale = useLocale.subscribe(locale);
    const interact = () => {
      if (this.locked) return;
      const target = this.nearest(this.position);
      if (target) {
        audio.play("press");
        this.bridge.emit("interaction", {
          id: target.id,
          position: { ...this.position },
        });
      }
    };
    this.inputSource = attachMovementInput({
      preferences: () => useSettings.getState(),
      enabled: () => !this.locked,
      interact,
    });
    const off = this.bridge.on("command", (c) => this.command(c, interact));
    const canvas = this.game.canvas;
    canvas.classList.add("game-canvas");
    locale();
    const clear = () => {
      this.pointer = null;
      this.drag = null;
      this.input.keyboard?.resetKeys();
      this.inputSource?.clear();
      canvas.dataset.touchActive = "false";
      this.stick.clear();
    };
    const offInputSettings = useSettings.subscribe((next, previous) => {
      if (
        next.keyboard !== previous.keyboard ||
        JSON.stringify(next.keymap.keys) !==
          JSON.stringify(previous.keymap.keys) ||
        next.rebinding !== previous.rebinding
      ) {
        clear();
        locale();
      }
    });
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
      this.bridge.emit("haven-save", {
        position: { ...this.position },
        epoch: this.positionEpoch,
        explored: this.explored,
      });
      if (!this.locked) this.bridge.emit("haven-shortcut", "pause");
    };
    const visibility = () => {
      if (document.hidden) interrupt();
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", drag);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("lostpointercapture", up);
    window.addEventListener("blur", interrupt);
    window.addEventListener("pagehide", interrupt);
    document.addEventListener("visibilitychange", visibility);
    this.cameras.main.startFollow(this.actor, true, 0.1, 0.1);
    const resize = () => {
      this.resizeCamera();
      clear();
    };
    resize();
    this.scale.on("resize", resize);
    onSceneEnd(this, () => {
      off();
      offLocale();
      audio.setDistrict(null);
      clear();
      offInputSettings();
      this.inputSource?.destroy();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", drag);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
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
          epoch: this.positionEpoch,
          explored: this.explored,
        }),
        appearance: () => this.rig.describe(),
        city: () => this.city.describe(this.position),
        setCityTime: (phase) => this.city.setTime(phase),
        emitSave: (position, epoch) =>
          this.bridge.emit("haven-save", { position, epoch }),
        action: () => ({
          active: this.visualAction.active
            ? { ...this.visualAction.active }
            : null,
          lastReceipt: this.lastReceipt,
        }),
        place: (p) => {
          if (!this.validPoint(p)) throw new Error("Blocked test position");
          this.position = { ...p };
          this.actor.setPosition(p.x, p.y);
          this.cameras.main.centerOn(p.x, p.y);
          this.publish();
        },
      };
    const destination = this.startData.destination;
    if (destination?.region === this.region) {
      const l = this.landmarks.find((l) => l.id === destination.landmarkId);
      if (l) this.marker.setPosition(l.entrance.x, l.entrance.y - 35);
    }
    this.publish();
    this.bridge.emit("ready", true);
  }
  private resizeCamera() {
    const zoom =
      Math.max(0.65, Math.min(1.15, this.scale.width / 1050)) *
      useSettings.getState().zoom;
    // The camera may reveal scenery under the HUD, while physical movement stays
    // inside the authored city. Edge arrivals remain above the touch controls.
    const top = (this.scale.height < 500 ? 90 : 180) / zoom,
      bottom = (this.scale.width < 650 ? 174 : 94) / zoom;
    this.cameras.main
      .setZoom(zoom)
      .setBounds(0, -top, this.bounds.width, this.bounds.height + top + bottom);
  }
  command(c: Command, interact: () => void) {
    if (
      c.type === "haven-test" &&
      this.startData.weapon &&
      this.nearest(this.position)?.id === "training"
    ) {
      const equipped = this.startData.weapon;
      const g = makeGame(
        this.bounds.width,
        this.bounds.height,
        equipped.attackId,
      );
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
      const training = this.landmarks.find((l) => l.id === "training")!;
      const e = spawnEnemy(g, "elite", training.x, training.y)!;
      e.hp = e.maxHp = 1e9;
      e.speed = 0;
      e.attack = 1e6;
      this.trainingGame = g;
      this.training = 0;
      audio.play("attack");
    }
    if (c.type === "haven-teleport") {
      if (c.epoch > this.positionEpoch && this.validPoint(c.position)) {
        this.positionEpoch = c.epoch;
        this.position = { ...c.position };
        this.explored = revealFog(this.explored, this.region, c.position);
        this.facing = c.facing;
        this.drag = null;
        this.pointer = null;
        this.input.keyboard?.resetKeys();
        this.inputSource?.clear();
        this.game.canvas.dataset.touchActive = "false";
        this.actor.setPosition(c.position.x, c.position.y);
        this.cameras.main.centerOn(c.position.x, c.position.y);
        this.lastSave = performance.now();
        this.publish();
      }
    }
    if (c.type === "haven-equipment") {
      if (c.questStates) this.city.setQuestStates(c.questStates);
      if (c.milestones) this.city.setMilestones(c.milestones);
      this.startData.character = c.character;
      this.startData.weapon = c.weapon ? structuredClone(c.weapon) : null;
      this.startData.visualAppearance = c.visualAppearance
        ? structuredClone(c.visualAppearance)
        : undefined;
      this.trainingGame = null;
      this.trainingShots.forEach((s) => s.setVisible(false));
      this.trainingEffects.clear();
    }
    if (c.type === "haven-feedback") this.present(c.receipt);
    if (c.type === "haven-lock") {
      audio.setScene("exploration", regionById(this.region).worldId, c.locked);
      this.locked = c.locked;
      this.input.keyboard?.resetKeys();
      this.inputSource?.clear();
      if (!c.locked) {
        if (!this.didEnter) {
          this.didEnter = true;
          this.present({
            id: `${this.startData.session}:entry`,
            pose: "respawn",
            effect: "magic",
            label: "Saved",
            items: [],
            gold: 0,
          });
        }
        this.trainingGame = null;
        this.trainingShots.forEach((s) => s.setVisible(false));
        this.trainingEffects.clear();
      }
      if (c.locked) {
        this.drag = null;
        this.pointer = null;
        this.input.keyboard?.resetKeys();
        this.inputSource?.clear();
        this.game.canvas.dataset.touchActive = "false";
      }
      this.publish();
    }
    if (c.type === "haven-interact") interact();
    if (c.type === "haven-look") {
      this.startData.outfit = c.outfit;
    }
    if (c.type === "haven-locate") {
      const l = this.landmarks.find((l) => l.id === c.id);
      if (l) this.marker.setPosition(l.entrance.x, l.entrance.y - 35);
      else this.marker.setPosition(-100, -100);
    }
  }
  present(receipt: ActionVisualReceipt) {
    if (!commitVisualAction(this.visualAction, receipt)) return;
    this.lastReceipt = structuredClone(receipt);
    const station = this.nearest(this.position),
      point =
        receipt.pose === "craft" &&
        station &&
        ["crafting", "blacksmith"].includes(station.kind)
          ? station.entrance
          : this.position,
      color =
        receipt.effect === "heal"
          ? 0xb6dfba
          : receipt.effect === "spark"
            ? 0xe9bd78
            : receipt.effect === "rare"
              ? 0xd7b2f0
              : 0xb6dce3;
    this.trainingVfx.emit(
      {
        kind: receipt.effect,
        x: point.x,
        y: point.y - 14,
        tx: this.position.x,
        ty: this.position.y - 18,
        angle: 0,
        color,
        radius: receipt.pose === "craft" ? 32 : 22,
        important: true,
      },
      useSettings.getState(),
    );
  }
  publish() {
    this.nearId = this.nearest(this.position)?.id ?? null;
    const navigation = this.city?.navigation(this.position);
    this.bridge.emit("haven", {
      region: this.region,
      facing: this.facing,
      explored: this.explored,
      position: { ...this.position },
      near: this.nearId,
      paused: this.locked,
      moving: this.moving,
      training: this.training,
      district: navigation?.district ?? "plaza",
      night: navigation?.night ?? false,
      npcs: navigation?.npcs,
    });
  }
  update(_time: number, _delta: number) {
    const time = performance.now(),
      delta = Math.max(0, time - this.lastFrameAt);
    this.lastFrameAt = time;
    const prefs = useSettings.getState(),
      targetFps =
        this.locked && !this.trainingGame && !this.visualAction.active
          ? 15
          : prefs.quality === "low"
            ? 30
            : 60;
    const district = districtAt(
      this.position,
      regionalCity(this.region).districts,
    );
    audio.setDistrict(district.id, district.ambience);
    this.city.update(time, this.position, prefs);
    if (targetFps !== this.fpsLimit) {
      this.game.loop.setFPSLimit(targetFps);
      this.fpsLimit = targetFps;
    }
    const zoom =
      Math.max(0.65, Math.min(1.15, this.scale.width / 1050)) * prefs.zoom;
    if (this.cameras.main.zoom !== zoom) this.resizeCamera();
    if (this.trainingGame) {
      const g = this.trainingGame;
      for (const e of g.enemies) {
        const training = this.landmarks.find((l) => l.id === "training")!;
        e.x = training.x;
        e.y = training.y;
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
    advanceVisualAction(
      this.visualAction,
      Math.min(120, delta),
      document.hidden,
    );
    const axis = this.inputSource?.axis() ?? { x: 0, y: 0 },
      x = axis.x + (this.drag?.dx ?? 0),
      y = axis.y + (this.drag?.dy ?? 0);
    this.moving = !this.locked && Math.hypot(x, y) > 0.05;
    if (!this.locked)
      this.position = move(
        this.position,
        x,
        y,
        delta / 1000,
        this.bounds.speed,
        this.region,
      );
    if (this.moving) {
      this.facing = facingFromAngle(Math.atan2(y, x));
      const cell = `${Math.floor(this.position.x / 64)},${Math.floor(this.position.y / 64)}`;
      if (cell !== this.fogCell) {
        this.explored = revealFog(this.explored, this.region, this.position);
        this.fogCell = cell;
      }
    }
    const active = this.trainingGame;
    this.rig.update({
      x: this.position.x,
      y: this.position.y,
      character: this.startData.character,
      outfit: this.startData.outfit,
      weapon: this.startData.weapon,
      appearance: this.startData.visualAppearance,
      pose: this.visualAction.active?.pose,
      poseAge: this.visualAction.active?.ageMs,
      facing: active?.player.facing ?? this.facing,
      time,
      moving: this.moving,
      attack: active
        ? Math.max(0, (active.player.attackUntil ?? 0) - active.time)
        : 0,
      attackId: active?.player.attackUntil,
      angle: active?.player.attackAngle,
      reduced: prefs.reducedEffects,
      lowQuality: prefs.quality === "low",
    });
    if (this.moving && time - this.lastStep > 360) {
      audio.play("step");
      this.lastStep = time;
    }
    this.ring.clear();
    const target = this.nearest(this.position);
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
      this.bridge.emit("haven-save", {
        position: { ...this.position },
        epoch: this.positionEpoch,
        explored: this.explored,
      });
      this.lastSave = time;
    }
  }
}
declare global {
  interface Window {
    __NOWRIFT_HAVEN__?: {
      state: () => {
        position: Point;
        locked: boolean;
        session: string;
        epoch: number;
      };
      place: (p: Point) => void;
      appearance: () => ReturnType<CharacterRig["describe"]>;
      city: () => ReturnType<HavenCity["describe"]>;
      setCityTime: (phase: number) => void;
      emitSave: (position: Point, epoch: number) => void;
      action: () => {
        active: ReturnType<typeof createVisualActionState>["active"];
        lastReceipt: ActionVisualReceipt | null;
      };
    };
  }
}
