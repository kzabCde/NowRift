import type Phaser from "phaser";
import { onSceneEnd } from "./lifecycle";
import {
  assetsForScene,
  pixelAsset,
  type AssetWorld,
  type PixelAsset,
} from "../presentation/assets";

const pending = new WeakMap<Phaser.Loader.LoaderPlugin, Set<string>>();

/** Registry-backed queue shared by scene preload and on-demand equipment layers. */
export function queuePixelAsset(scene: Phaser.Scene, asset: PixelAsset): void {
  let queued = pending.get(scene.load);
  if (!queued) {
    queued = new Set();
    pending.set(scene.load, queued);
    const keys = queued;
    const complete = () => keys.clear();
    scene.load.on("complete", complete);
    onSceneEnd(scene, () => {
      scene.load.off("complete", complete);
      pending.delete(scene.load);
    });
  }
  if (scene.textures.exists(asset.key) || queued.has(asset.key)) return;
  queued.add(asset.key);
  if (asset.kind === "spritesheet")
    scene.load.spritesheet(asset.key, asset.path, {
      frameWidth: asset.frameWidth,
      frameHeight: asset.frameHeight,
    });
  else scene.load.image(asset.key, asset.path);
}
export function queueSceneAssets(
  scene: Phaser.Scene,
  world: AssetWorld,
  appearancePaths: readonly string[] = [],
): readonly PixelAsset[] {
  const assets = assetsForScene(world, appearancePaths);
  for (const asset of assets) queuePixelAsset(scene, asset);
  return assets;
}
export function queueAppearanceAssets(
  scene: Phaser.Scene,
  pathsOrKeys: readonly string[],
): readonly PixelAsset[] {
  const assets: PixelAsset[] = [];
  for (const id of pathsOrKeys) {
    const asset = pixelAsset(id);
    if (!asset) throw new Error(`Unresolved appearance asset: ${id}`);
    queuePixelAsset(scene, asset);
    assets.push(asset);
  }
  return assets;
}

/** Warm only visited sprites once the PWA controls the page; unvisited worlds stay lazy. */
export function warmSceneAssets(assets: readonly PixelAsset[]) {
  if (
    process.env.NODE_ENV !== "production" ||
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator)
  )
    return;
  void navigator.serviceWorker.ready
    .then((ready) => {
      ready.active?.postMessage({
        type: "WARM_ASSETS",
        urls: assets.map((asset) => asset.path),
      });
    })
    .catch(() => {});
}
