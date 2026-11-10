import type Phaser from "phaser";
/** A game can be destroyed without a preceding scene shutdown. */
export function onSceneEnd(scene: Phaser.Scene, dispose: () => void) {
  const cleanup = () => {
    scene.events.off("shutdown", cleanup);
    scene.events.off("destroy", cleanup);
    dispose();
  };
  scene.events.once("shutdown", cleanup);
  scene.events.once("destroy", cleanup);
}
