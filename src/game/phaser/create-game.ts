import Phaser from "phaser";
import {
  BootScene,
  PreloadScene,
  MainMenuScene,
  GameScene,
  ResultsScene,
} from "./scenes";
import type { GameBridge } from "../bridge";
/** This module is imported dynamically only after a React browser mount. */
export function createGame(parent: HTMLElement, bridge: GameBridge) {
  const game = new Phaser.Game({
    // Canvas2D avoids software WebGL overhead for this sprite-only pixel-art stage.
    type: Phaser.CANVAS,
    parent,
    width: parent.clientWidth || 960,
    height: parent.clientHeight || 540,
    backgroundColor: "#182a25",
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 2 },
    fps: { target: 60, forceSetTimeOut: false },
    scene: [BootScene, PreloadScene, MainMenuScene, GameScene, ResultsScene],
    callbacks: {
      preBoot: (instance) => instance.registry.set("bridge", bridge),
    },
  });
  return game;
}
