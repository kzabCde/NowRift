import Phaser from "phaser";
import mapData from "../../../public/assets/haven/city-map.json";
import {
  CITY,
  cityLighting,
  districtAt,
  npcPosition,
  type Point,
  type CityMilestones,
} from "../world/city";
import { validPosition } from "../world/content";
import type { Preferences } from "../../state/settings";
import { onSceneEnd } from "./lifecycle";
import { regionalCity, type CityLayout } from "../world/regional-city";
import { regionalTerrain } from "../world/regional-terrain";
import type { RegionId } from "../world/regions";
import type { QuestGiverStates } from "../quests/presentation";

/** World presentation only. Economy, collisions, rewards and session ownership stay authoritative elsewhere. */
export class HavenCity {
  readonly labels: { id: string; text: Phaser.GameObjects.Text }[] = [];
  readonly sprites: Phaser.GameObjects.Image[] = [];
  readonly landmarks = new Map<string, Phaser.GameObjects.Image>();
  private questMarkers = new Map<string, Phaser.GameObjects.Image>();
  private questStates: QuestGiverStates = {};
  private maps: Phaser.Tilemaps.Tilemap[] = [];
  private trees: { image: Phaser.GameObjects.Image; variant: number }[] = [];
  private residents: {
    image: Phaser.GameObjects.Image;
    data: (typeof CITY.npcs)[number];
  }[] = [];
  private loops: { image: Phaser.GameObjects.Image; kind: number }[] = [];
  private seals: Phaser.GameObjects.Image[] = [];
  private blooms: Phaser.GameObjects.Image[] = [];
  private motes: Phaser.GameObjects.Graphics;
  private dark: Phaser.GameObjects.Graphics;
  private light: Phaser.GameObjects.Graphics;
  private lastCull = 0;
  private culledView = { x: -1e9, y: -1e9, width: 0, height: 0 };
  private lastPaint = 0;
  private lastClock = 0;
  private guardians = 0;
  private questClaimed = false;
  private extractions = 0;
  private cameraTime: number | null = null;
  private lighting = cityLighting(Date.now());
  private visibleMotes = 0;
  private frames = 0;
  private dayBanner: Phaser.GameObjects.Image;
  private layout: CityLayout;
  constructor(
    private scene: Phaser.Scene,
    private region: RegionId = "central",
  ) {
    this.layout = regionalCity(region);
    // Native 12 × 18 original pixel glyphs, shared by every giver. No font blur.
    for (const [kind, rows] of Object.entries({
      available: [
        "0011100",
        "0011100",
        "0011100",
        "0011100",
        "0011100",
        "0000000",
        "0011100",
      ],
      ready: [
        "0111110",
        "1100011",
        "0000011",
        "0001110",
        "0011000",
        "0000000",
        "0011000",
      ],
      active: [
        "0000000",
        "0000000",
        "0000000",
        "1101101",
        "1101101",
        "0000000",
        "0000000",
      ],
    })) {
      const key = "quest-marker-" + kind;
      if (scene.textures.exists(key)) continue;
      const texture = scene.textures.createCanvas(key, 12, 18)!;
      const ctx = texture.context;
      ctx.fillStyle = "#172a2d";
      ctx.fillRect(0, 0, 12, 18);
      ctx.fillStyle =
        kind === "ready"
          ? "#9ee2cf"
          : kind === "active"
            ? "#a0aea0"
            : "#ffe095";
      rows.forEach((row, y) =>
        [...row].forEach((v, x) => {
          if (v === "1") ctx.fillRect(x + 2, y * 2 + 2, 1, 2);
        }),
      );
      texture.refresh();
    }
    const depths = {
      ground: -10000,
      terrain: -9990,
      structures: -9980,
      foreground: -9970,
      collision: -9960,
    };
    for (const [name, data] of Object.entries(
      (region === "central" ? mapData : regionalTerrain(this.layout, region))
        .layers,
    )) {
      const map = scene.make.tilemap({ data, tileWidth: 16, tileHeight: 16 });
      const set = map.addTilesetImage(
        this.texture("city-tiles"),
        this.texture("city-tiles"),
        16,
        16,
        0,
        0,
      );
      if (!set) throw new Error("Missing city tile atlas");
      map
        .createLayer(0, set, 0, 0)!
        .setName(`city-${name}`)
        .setScale(2)
        .setDepth(depths[name as keyof typeof depths])
        .setVisible(name !== "collision");
      this.maps.push(map);
    }
    const masonry = scene.add.graphics().setDepth(-9950);
    for (const wall of this.layout.boundaries)
      masonry
        .fillStyle(0x596e67)
        .fillRect(wall.x, wall.y, wall.w, wall.h)
        .lineStyle(4, 0xb5b99a)
        .lineBetween(wall.x, wall.y, wall.x + wall.w, wall.y);
    for (const rail of this.layout.rails) {
      masonry
        .fillStyle(0x69533d)
        .fillRect(rail.x, rail.y, rail.w, rail.h)
        .lineStyle(2, 0xc5aa76)
        .lineBetween(rail.x, rail.y, rail.x + rail.w, rail.y + rail.h);
      const length = Math.max(rail.w, rail.h);
      for (let i = 0; i < length; i += 24)
        masonry
          .fillStyle(0xa28b60)
          .fillRect(
            rail.x + (rail.w > rail.h ? i : 0),
            rail.y + (rail.h > rail.w ? i : 0) - 12,
            8,
            22,
          );
    }
    for (const bridge of this.layout.bridges) {
      masonry
        .lineStyle(4, 0xc4aa7d)
        .lineBetween(bridge.x, bridge.y, bridge.x + bridge.w, bridge.y)
        .lineBetween(
          bridge.x,
          bridge.y + bridge.h,
          bridge.x + bridge.w,
          bridge.y + bridge.h,
        );
    }
    for (const arcade of this.layout.arcades)
      this.image(arcade.x, arcade.y, "haven-" + arcade.art);
    for (const structure of this.layout.structures)
      this.image(structure.x, structure.y, "haven-" + structure.art);
    for (const landmark of this.layout.landmarks) {
      const image = this.image(landmark.x, landmark.y, "haven-" + landmark.art);
      if (landmark.kind === "npc") image.setScale(1.6);
      this.landmarks.set(landmark.id, image);
      if (landmark.kind !== "treasure")
        this.labels.push({
          id: landmark.id,
          text: scene.add
            .text(landmark.entrance.x, landmark.entrance.y + 17, "", {
              fontFamily: "monospace",
              fontSize: "10px",
              color: "#e1d7b3",
              backgroundColor: "#1a2a26cc",
              padding: { x: 5, y: 4 },
            })
            .setOrigin(0.5, 0)
            .setDepth(landmark.y + 2),
        });
    }
    for (const prop of this.layout.props) {
      const tree = prop.frame >= 56;
      const image = this.image(
        prop.x,
        prop.y,
        tree ? "haven-city-trees" : "haven-city-props",
        tree ? (prop.frame - 56) * 4 : prop.frame,
      );
      if (tree) this.trees.push({ image, variant: prop.frame - 56 });
    }
    for (const effect of this.layout.effects) {
      const image = this.image(
        effect.x,
        effect.y,
        "haven-city-fx",
        effect.kind * 8,
      )
        .setScale(effect.scale)
        .setDepth(effect.depth);
      this.loops.push({ image, kind: effect.kind });
    }
    for (const npc of this.layout.npcs) {
      const image = this.image(
        npc.home.x,
        npc.home.y,
        "haven-city-residents",
        npc.variant * 16,
      )
        .setOrigin(0.5, 0.75)
        .setScale(1.6);
      this.residents.push({ image, data: npc });
    }
    for (const point of this.layout.guardianSeals)
      this.seals.push(
        this.image(point.x, point.y, "haven-city-props", 33).setVisible(false),
      );
    for (const point of this.layout.gardenBlooms)
      this.blooms.push(
        this.image(point.x, point.y, "haven-city-props", 30).setVisible(false),
      );
    this.dayBanner = this.image(
      this.layout.questBanner.x,
      this.layout.questBanner.y,
      "haven-city-props",
      44,
    ).setVisible(false);
    this.motes = scene.add.graphics().setDepth(60000);
    this.dark = scene.add.graphics().setDepth(1e7);
    this.light = scene.add.graphics().setDepth(1e7 + 1);
    onSceneEnd(scene, () => this.maps.forEach((map) => map.destroy()));
  }
  private texture(art: string) {
    const key = `region-${this.region}-${art}`;
    return this.scene.textures.exists(key) ? key : `haven-${art}`;
  }
  private image(x: number, y: number, key: string, frame = 0) {
    const image = this.scene.add
      .image(
        x,
        y,
        key.startsWith("haven-") ? this.texture(key.slice(6)) : key,
        frame,
      )
      .setOrigin(0.5, 1)
      .setScale(2)
      .setDepth(y);
    this.sprites.push(image);
    return image;
  }
  setMilestones(milestones: CityMilestones) {
    this.guardians = milestones.guardians;
    this.questClaimed = milestones.questClaimed;
    this.extractions = milestones.extractions;
    this.dayBanner.setVisible(milestones.questClaimed);
    this.landmarks
      .get("cache")
      ?.setTint(milestones.cacheClaimed ? 0x829485 : 0xffffff);
  }
  setQuestStates(states: QuestGiverStates) {
    this.questStates = states;
    for (const [id, state] of Object.entries(states)) {
      const landmark = this.layout.landmarks.find((l) => l.id === id);
      if (!landmark) continue;
      let image = this.questMarkers.get(id);
      if (!image) {
        image = this.scene.add
          .image(
            landmark.entrance.x,
            landmark.entrance.y - 62,
            "quest-marker-available",
          )
          .setScale(2)
          .setDepth(landmark.y + 4);
        this.questMarkers.set(id, image);
      }
      image.setVisible(state !== "none");
      if (state !== "none") image.setTexture("quest-marker-" + state);
    }
  }
  setTime(phase: number) {
    if (!Number.isFinite(phase) || phase < 0 || phase >= 1)
      throw new Error("Invalid city clock");
    this.cameraTime = phase * 1_200_000;
  }
  navigation(position: Point) {
    return {
      district: districtAt(position, this.layout.districts).id,
      night: this.lighting.night,
      npcs: this.residents.map(({ data, image }) => ({
        id: data.id,
        name: data.name,
        x: image.x,
        y: image.y,
      })),
    };
  }
  describe(position: Point) {
    return {
      district: districtAt(position, this.layout.districts).id,
      lighting: { ...this.lighting },
      tileLayers: this.maps.length,
      sprites: this.sprites.length,
      questMarkers: [...this.questMarkers].map(([id, image]) => ({
        id,
        state: this.questStates[id],
        visible: image.visible,
        texture: image.texture.key,
      })),
      visibleSprites: this.sprites.filter((s) => s.visible).length,
      motes: this.visibleMotes,
      moteLimit: 72,
      guardians: this.guardians,
      extractions: this.extractions,
      frames: this.frames,
      effects: this.loops.map(({ image, kind }) => ({
        kind,
        frame: Number(image.frame.name),
        depth: image.depth,
        visible: image.visible,
      })),
      fps: this.scene.game.loop.actualFps,
      textureBytes: this.scene.textures
        .getTextureKeys()
        .reduce((bytes, key) => {
          const image = this.scene.textures.get(key).getSourceImage() as {
            width?: number;
            height?: number;
          };
          return bytes + (image.width ?? 0) * (image.height ?? 0) * 4;
        }, 0),
      camera: {
        x: this.scene.cameras.main.worldView.x,
        y: this.scene.cameras.main.worldView.y,
        width: this.scene.cameras.main.worldView.width,
        height: this.scene.cameras.main.worldView.height,
      },
      residents: this.residents.map(({ data, image }) => ({
        id: data.id,
        x: image.x,
        y: image.y,
        frame: Number(image.frame.name),
        visible: image.visible,
      })),
    };
  }
  update(time: number, position: Point, prefs: Preferences) {
    const clock = this.cameraTime ?? Date.now(),
      view = this.scene.cameras.main.worldView;
    if (time - this.lastClock > 100) {
      this.lastClock = time;
      this.frames++;
      this.lighting = cityLighting(clock);
      for (const [id, image] of this.questMarkers)
        image.setVisible(
          this.questStates[id] !== "none" && view.contains(image.x, image.y),
        );
      for (const { image, variant } of this.trees)
        image.setFrame(
          variant * 4 + (prefs.reducedEffects ? 0 : Math.floor(time / 470) % 4),
        );
      for (const { image, kind } of this.loops)
        image.setFrame(
          kind * 8 +
            (prefs.reducedEffects
              ? 0
              : Math.floor(time / (kind === 0 ? 110 : 170)) % 8),
        );
      for (const { image, data } of this.residents) {
        const pose = npcPosition(data, prefs.reducedEffects ? 300_000 : clock);
        if (validPosition(pose, this.region))
          image
            .setPosition(Math.round(pose.x), Math.round(pose.y))
            .setDepth(pose.y);
        const facing = ["down", "right", "up", "left"].indexOf(pose.facing),
          frame =
            pose.moving && !prefs.reducedEffects
              ? 1 + (Math.floor(time / 160) % 3)
              : 0;
        image.setFrame(data.variant * 16 + facing * 4 + frame);
      }
      for (let i = 0; i < 4; i++) {
        this.seals[i].setVisible(i < this.guardians);
        this.blooms[i].setVisible(i < this.extractions);
      }
      this.landmarks
        .get("mara")
        ?.setFrame(prefs.reducedEffects ? 0 : Math.floor(time / 180) % 4);
    }
    const jumped =
      Math.abs(view.x - this.culledView.x) > 96 ||
      Math.abs(view.y - this.culledView.y) > 96 ||
      view.width !== this.culledView.width ||
      view.height !== this.culledView.height;
    if ((jumped || time - this.lastCull > 220) && view.width) {
      this.lastCull = time;
      this.culledView = {
        x: view.x,
        y: view.y,
        width: view.width,
        height: view.height,
      };
      for (const sprite of this.sprites) {
        const conditional = this.seals.includes(sprite)
          ? this.seals.indexOf(sprite) < this.guardians
          : this.blooms.includes(sprite)
            ? this.blooms.indexOf(sprite) < this.extractions
            : sprite === this.dayBanner
              ? this.questClaimed
              : true;
        sprite.setVisible(
          conditional &&
            sprite.x + sprite.displayWidth / 2 > view.left - 64 &&
            sprite.x - sprite.displayWidth / 2 < view.right + 64 &&
            sprite.y > view.top - 64 &&
            sprite.y - sprite.displayHeight < view.bottom + 64,
        );
      }
      for (const label of this.labels)
        label.text.setVisible(
          label.text.x > view.left - 130 &&
            label.text.x < view.right + 130 &&
            label.text.y > view.top - 40 &&
            label.text.y < view.bottom + 40 &&
            Math.hypot(label.text.x - position.x, label.text.y - position.y) <
              360,
        );
    }
    if (time - this.lastPaint < (prefs.quality === "low" ? 200 : 90)) return;
    this.lastPaint = time;
    this.dark
      .clear()
      .fillStyle(0x18233a, this.lighting.darkness)
      .fillRect(view.x - 96, view.y - 96, view.width + 192, view.height + 192);
    this.light.clear();
    for (const prop of this.layout.props)
      if (
        prop.light &&
        prop.x > view.left - 90 &&
        prop.x < view.right + 90 &&
        prop.y > view.top - 90 &&
        prop.y < view.bottom + 90
      ) {
        const color = prop.light === "rift" ? 0x9edbce : 0xf2bd77,
          alpha =
            (prop.light === "fire" ? 0.16 : 0.12) *
            (1 - this.lighting.daylight * 0.8);
        this.light
          .fillStyle(color, alpha * 0.3)
          .fillCircle(prop.x + 12, prop.y - 46, 36)
          .fillStyle(color, alpha)
          .fillRect(prop.x + 7, prop.y - 54, 10, 16);
      }
    if (this.lighting.night)
      for (const point of this.layout.windowLights)
        if (
          point.x > view.left &&
          point.x < view.right &&
          point.y > view.top &&
          point.y < view.bottom
        )
          this.light
            .fillStyle(0xf2c77d, 0.15)
            .fillRect(point.x - 6, point.y - 8, 12, 16);
    this.motes.clear();
    this.visibleMotes = 0;
    if (prefs.reducedEffects) return;
    const cap = prefs.quality === "low" ? 18 : 72;
    for (let i = 0; i < cap; i++) {
      const d = this.layout.districts[i % this.layout.districts.length],
        x = Math.round(
          d.center.x +
            Math.sin(i * 31.7) * 150 +
            Math.sin(time / 2600 + i) * 12,
        ),
        y = Math.round(
          d.center.y -
            ((i * 39 + time * (d.id === "emberforge" ? 0.035 : 0.009)) % 190),
        );
      if (x < view.left || x > view.right || y < view.top || y > view.bottom)
        continue;
      const color =
        d.id === "emberforge"
          ? 0xeeb872
          : d.id === "garden"
            ? 0xc4acd3
            : d.id === "gate"
              ? 0x9bdacd
              : 0xbcc898;
      this.motes.fillStyle(color, 0.45).fillRect(x, y, 2 + (i % 2), 2);
      this.visibleMotes++;
    }
  }
}
