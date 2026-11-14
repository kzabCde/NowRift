import { ASSET_SOURCES } from "./asset-index";
import { ANIMATIONS, ANIMATION_DIRECTIONS } from "./animation";
import type { RegionId } from "../world/regions";

export type AssetPath = (typeof ASSET_SOURCES)[number]["path"];
export type AssetStatus = "READY" | "REFINE" | "REPLACE" | "MISSING" | "UNUSED";
export type AssetWorld = "haven" | "forest" | "desert" | "frozen" | "infernal";
export type AssetCategory =
  | "character"
  | "weapon"
  | "enemy"
  | "boss"
  | "terrain"
  | "prop"
  | "ui"
  | "item"
  | "vfx"
  | "branding";
export type SpriteAnimation = {
  frames: readonly number[];
  fps: number;
  loop: boolean;
};
export type PixelAsset = {
  id: AssetPath;
  path: AssetPath;
  key: string;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
  version: string;
  kind: "image" | "spritesheet" | "tileset";
  category: AssetCategory;
  bundle: AssetWorld | `region-${RegionId}` | "common" | "shell" | "appearance";
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  columns: number;
  rows: number;
  pivot: readonly [number, number];
  scale: number;
  directions?: readonly string[];
  animations?: Readonly<Record<string, SpriteAnimation>>;
  compatibility?: readonly string[];
  audit: AssetStatus;
};

function definition(source: (typeof ASSET_SOURCES)[number]): PixelAsset {
  const path: string = source.path,
    name = path.split("/").at(-1)!.replace(".png", "");
  let key: string,
    kind: PixelAsset["kind"] = "image",
    category: AssetCategory = "prop",
    bundle: PixelAsset["bundle"] = "shell";
  let frameWidth: number = source.width,
    frameHeight: number = source.height;
  let scale = 1,
    pivot: readonly [number, number] = [0.5, 0.5],
    audit: AssetStatus = "READY";
  let directions: PixelAsset["directions"],
    animations: PixelAsset["animations"],
    compatibility: PixelAsset["compatibility"];
  const layer = /^\/assets\/characters\/layers\/([^/]+)\/([^/]+)\.png$/.exec(
    path,
  );
  const effect = /^\/assets\/pixel\/skills\/([^/]+)\.png$/.exec(path);
  const world =
    /^\/assets\/worlds\/(forest|desert|frozen|infernal)\/([^/]+)\.png$/.exec(
      path,
    );
  if (layer) {
    key = `character-layer-${layer[1]}-${layer[2]}`;
    kind = "spritesheet";
    category = "character";
    bundle = "appearance";
    frameWidth = frameHeight = 48;
    pivot = [0.5, 0.75];
    directions = ANIMATION_DIRECTIONS;
    animations = ANIMATIONS;
    compatibility = [layer[1], "all-owned-weapons"];
  } else if (path.startsWith("/assets/pixel/interactions/")) {
    key = `pixel-station-${name}`;
    kind = "spritesheet";
    category = "vfx";
    bundle = "haven";
    frameWidth = frameHeight = 32;
    animations = {
      idle: {
        frames: [0, 1, 2, 3, 4, 5, 6, 7],
        fps: name === "fire" ? 10 : name === "water" ? 7 : 8,
        loop: true,
      },
    };
  } else if (effect) {
    key = `pixel-vfx-${effect[1]}`;
    kind = "spritesheet";
    category = "vfx";
    bundle = "common";
    frameWidth = frameHeight = 48;
    animations = {
      release: { frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 16, loop: false },
      impact: { frames: [8, 9, 10, 11, 12, 13, 14, 15], fps: 16, loop: false },
    };
  } else if (path.startsWith("/assets/characters/")) {
    kind = "spritesheet";
    const weapon = name === "weapons" || name === "weapon-evolution";
    category = weapon ? "weapon" : "character";
    bundle = weapon ? "common" : "appearance";
    frameWidth = frameHeight = 32;
    pivot = [0.5, 0.75];
    key =
      name === "weapons"
        ? "equipment-weapons"
        : name === "weapon-evolution"
          ? name
          : `character-${name}`;
    compatibility = ["wanderer", "sentinel", "strider"];
    if (!weapon) audit = "UNUSED";
  } else if (
    path === "/assets/items/atlas.png" ||
    path === "/assets/items/outfitters.png"
  ) {
    kind = "spritesheet";
    category = "item";
    bundle = "common";
    key = name === "outfitters" ? "outfitters-items" : "items";
    frameWidth = frameHeight = 32;
  } else if (
    /^\/assets\/regions\/(north|northeast|central|south)\//.test(path)
  ) {
    const region = path.split("/")[3] as RegionId;
    key = `region-${region}-${name}`;
    bundle = `region-${region}`;
    pivot = [0.5, 1];
    scale = 2;
    if (name === "city-tiles") {
      kind = "spritesheet";
      category = "terrain";
      frameWidth = frameHeight = 16;
      pivot = [0, 0];
    } else if (name === "city-residents") {
      kind = "spritesheet";
      category = "character";
      frameWidth = frameHeight = 48;
      pivot = [0.5, 0.75];
    } else if (name === "city-trees") {
      kind = "spritesheet";
      category = "prop";
      frameWidth = 96;
      frameHeight = 128;
    } else if (name === "waterfall") {
      kind = "spritesheet";
      category = "vfx";
      frameWidth = 32;
      frameHeight = 96;
    } else if (name === "props") {
      kind = "spritesheet";
      frameWidth = 32;
      frameHeight = 48;
    }
  } else if (path.startsWith("/assets/haven/")) {
    key = `haven-${name}`;
    bundle = "haven";
    pivot = [0.5, 1];
    scale = 2;
    if (name === "city-tiles") {
      kind = "spritesheet";
      category = "terrain";
      frameWidth = frameHeight = 16;
      pivot = [0, 0];
    } else if (name === "city-props" || name === "city-fx") {
      kind = "spritesheet";
      category = name === "city-fx" ? "vfx" : "prop";
      frameWidth = 32;
      frameHeight = 48;
    } else if (name === "city-trees") {
      kind = "spritesheet";
      category = "prop";
      frameWidth = 96;
      frameHeight = 128;
    } else if (name === "city-residents") {
      kind = "spritesheet";
      category = "character";
      frameWidth = frameHeight = 48;
      pivot = [0.5, 0.75];
    } else if (name === "npc" || name.startsWith("player-")) {
      kind = "spritesheet";
      category = "character";
      frameWidth = frameHeight = source.height;
      pivot = name === "npc" ? [0.5, 1] : [0.5, 0.75];
      scale = (1.6 * 32) / source.height;
      if (name === "npc")
        animations = {
          idle: { frames: [0, 1, 2, 3], fps: 6, loop: true },
        };
      if (name.startsWith("player-")) audit = "UNUSED";
    } else if (name === "terrain") {
      category = "terrain";
      pivot = [0, 0];
    }
  } else if (world || path.startsWith("/assets/forest/")) {
    const biome = world?.[1] ?? "forest",
      asset = world?.[2] ?? name;
    key = world ? `${biome}-${asset}` : asset;
    bundle = biome as AssetWorld;
    if (
      ["player", "icons", "particles", "projectiles"].includes(asset) &&
      !world
    )
      bundle = "common";
    if (
      ["slime", "goblin", "wolf", "caster", "elite", "boss", "player"].includes(
        asset,
      )
    ) {
      kind = "spritesheet";
      frameWidth = frameHeight = source.height;
      category =
        asset === "boss" ? "boss" : asset === "player" ? "character" : "enemy";
      pivot = [0.5, 0.75];
      scale = 2;
      animations = {
        idle: { frames: [0], fps: 6, loop: true },
        walk: { frames: [1, 2, 3], fps: 8, loop: true },
        attack: { frames: [4], fps: 12, loop: false },
        hit: { frames: [5], fps: 10, loop: false },
        death: { frames: [6, 7], fps: 9, loop: false },
      };
    } else if (["icons", "particles", "projectiles"].includes(asset)) {
      kind = "spritesheet";
      frameWidth = frameHeight = asset === "particles" ? 4 : 16;
      category = asset === "icons" ? "ui" : "vfx";
    } else if (asset === "tiles") {
      kind = "tileset";
      category = "terrain";
      frameWidth = frameHeight = 32;
      pivot = [0, 0];
    } else if (asset === "ground") {
      category = "terrain";
      pivot = [0, 0];
    } else if (["preview", "key-art"].includes(asset)) {
      bundle = "shell";
      category = "ui";
    } else {
      pivot = [0.5, 0.87];
      scale = 1.5;
    }
  } else {
    category = "branding";
    key = `branding-${name}`;
  }
  const columns = source.width / frameWidth,
    rows = source.height / frameHeight;
  return {
    ...source,
    id: source.path,
    key,
    version: source.sha256.slice(0, 12),
    kind,
    category,
    bundle,
    frameWidth,
    frameHeight,
    frameCount: columns * rows,
    columns,
    rows,
    pivot,
    scale,
    directions,
    animations,
    compatibility,
    audit,
  };
}
export const ASSETS: readonly PixelAsset[] = ASSET_SOURCES.map(definition);
const byPath = new Map<string, PixelAsset>(
  ASSETS.map((asset) => [asset.path, asset]),
);
const byKey = new Map<string, PixelAsset>(
  ASSETS.map((asset) => [asset.key, asset]),
);
export function pixelAsset(pathOrKey: string): PixelAsset | undefined {
  return byPath.get(pathOrKey) ?? byKey.get(pathOrKey);
}
/** Only the current world and explicitly requested appearance layers; no eager wardrobe download. */
export function assetsForScene(
  world: AssetWorld,
  appearancePaths: readonly string[] = [],
): PixelAsset[] {
  const current = new Set(appearancePaths);
  return ASSETS.filter(
    (asset) =>
      asset.audit !== "UNUSED" &&
      (asset.bundle === "common" ||
        asset.bundle === world ||
        current.has(asset.path) ||
        current.has(asset.key)),
  );
}
export function validateManifest(
  assets: readonly PixelAsset[] = ASSETS,
): string[] {
  const errors: string[] = [],
    paths = new Set<string>(),
    keys = new Set<string>();
  for (const asset of assets) {
    if (paths.has(asset.path))
      errors.push(`Duplicate asset path: ${asset.path}`);
    if (keys.has(asset.key)) errors.push(`Duplicate texture key: ${asset.key}`);
    paths.add(asset.path);
    keys.add(asset.key);
    if (
      !asset.path.startsWith("/") ||
      asset.path.includes("..") ||
      !asset.path.endsWith(".png")
    )
      errors.push(`Unsafe asset path: ${asset.path}`);
    if (
      ![
        asset.width,
        asset.height,
        asset.frameWidth,
        asset.frameHeight,
        asset.frameCount,
        asset.columns,
        asset.rows,
      ].every((value) => Number.isSafeInteger(value) && value > 0)
    )
      errors.push(`Invalid frame grid: ${asset.path}`);
    if (
      asset.width % asset.frameWidth ||
      asset.height % asset.frameHeight ||
      asset.frameCount !== asset.columns * asset.rows
    )
      errors.push(`Partial frame: ${asset.path}`);
    if (asset.pivot.some((value) => value < 0 || value > 1) || asset.scale <= 0)
      errors.push(`Invalid anchor or scale: ${asset.path}`);
    for (const [name, animation] of Object.entries(asset.animations ?? {})) {
      if (
        animation.fps <= 0 ||
        !animation.frames.length ||
        animation.frames.some(
          (frame) =>
            !Number.isSafeInteger(frame) ||
            frame < 0 ||
            frame >= (asset.directions ? asset.columns : asset.frameCount),
        )
      )
        errors.push(`Invalid ${name} animation: ${asset.path}`);
    }
  }
  return errors;
}

/** Non-player actors share the registry clock; grid and playback rates are not scene constants. */
export function assetAnimationFrame(
  key: string,
  pose: string,
  timeMs: number,
): number {
  const track = pixelAsset(key)?.animations?.[pose];
  if (!track) return 0;
  const index = Math.floor((Math.max(0, timeMs) * track.fps) / 1000);
  return track.frames[
    track.loop
      ? index % track.frames.length
      : Math.min(index, track.frames.length - 1)
  ];
}
