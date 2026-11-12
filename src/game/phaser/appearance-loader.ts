import type Phaser from "phaser";
import type { CharacterAppearance } from "../presentation/appearance";
import { pixelAsset } from "../presentation/assets";
import { warmSceneAssets } from "./asset-preloader";
import type { GameBridge } from "../bridge";
import { onSceneEnd } from "./lifecycle";
const pendingLoads = new WeakMap<
  Phaser.Scene,
  { pending: Set<string>; failed: Set<string> }
>();
/** Live wardrobe/equipment swaps load only the selected modular parts, without remounting the scene. */
export function queueAppearance(
  scene: Phaser.Scene,
  look: CharacterAppearance,
): boolean {
  let state = pendingLoads.get(scene);
  if (!state) {
    state = { pending: new Set(), failed: new Set() };
    pendingLoads.set(scene, state);
    const loadError = (file: { key: string }) => {
      if (!state!.pending.has(file.key)) return;
      state!.pending.delete(file.key);
      state!.failed.add(file.key);
      (scene.registry.get("bridge") as GameBridge | undefined)?.emit(
        "error",
        `Missing art: ${file.key}. A fallback is in use; reload to retry.`,
      );
    };
    const complete = (key: string) => {
      if (!state!.pending.delete(key)) return;
      const meta = pixelAsset(key);
      if (meta) warmSceneAssets([meta]);
    };
    scene.load.on("loaderror", loadError);
    scene.load.on("filecomplete", complete);
    onSceneEnd(scene, () => {
      scene.load.off("loaderror", loadError);
      scene.load.off("filecomplete", complete);
      pendingLoads.delete(scene);
    });
  }
  let queued = false,
    complete = true;
  for (const asset of look.layers) {
    if (scene.textures.exists(asset.key)) continue;
    complete = false;
    if (state.pending.has(asset.key) || state.failed.has(asset.key)) continue;
    state.pending.add(asset.key);
    queued = true;
    scene.load.spritesheet(asset.key, asset.path, {
      frameWidth: 48,
      frameHeight: 48,
    });
  }
  if (queued && !scene.load.isLoading()) scene.load.start();
  return complete;
}
