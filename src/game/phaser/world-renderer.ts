import type Phaser from "phaser";
import type { StageRuntime } from "../campaign/runtime";
import { regionForWorld } from "../world/regions";
import { useSettings } from "../../state/settings";
import { onSceneEnd } from "./lifecycle";
export function buildWorld(scene: Phaser.Scene, c: StageRuntime) {
  const key = c.world.id + "-tiles";
  const map = scene.make.tilemap({
    data: c.map.tiles,
    tileWidth: 32,
    tileHeight: 32,
  });
  const set = map.addTilesetImage(key, key, 32, 32, 0, 0);
  if (set) map.createLayer(0, set, 0, 0)?.setDepth(-100);
  const regionalTrees: { image: Phaser.GameObjects.Image; variant: number }[] =
      [],
    treeKey = `region-${regionForWorld(c.world.id).id}-city-trees`;
  for (const [i, o] of c.map.props.entries()) {
    const regional = o.type === "tree" && scene.textures.exists(treeKey);
    const image = scene.add
      .image(
        o.x,
        o.y,
        regional ? treeKey : c.world.id + "-" + o.type,
        regional ? (i % 3) * 4 : 0,
      )
      .setOrigin(0.5, regional ? 0.94 : 0.87)
      .setScale(1.5)
      .setDepth(o.y);
    if (regional) regionalTrees.push({ image, variant: i % 3 });
  }
  const runes = scene.add.graphics().setDepth(-90);
  runes.lineStyle(2, c.world.hazard.color, 0.24);
  for (const z of c.map.zones) runes.strokeCircle(z.x, z.y, z.r);
  // Fixed pools of ambient motes: fog spores, wind-blown dust, snow or rising embers.
  const motes = Array.from({ length: 22 }, (_, i) =>
    scene.add
      .image(
        (i * 139) % 1800,
        (i * 197) % 1400,
        "particles",
        c.world.id === "infernal" ? 1 : c.world.id === "frozen" ? 2 : 0,
      )
      .setAlpha(0.4)
      .setDepth(6500),
  );
  let lastFoliage = 0;
  const tick = (time: number) => {
    if (time - lastFoliage > 450) {
      lastFoliage = time;
      const frame = useSettings.getState().reducedEffects
        ? 0
        : Math.floor(time / 450) % 4;
      for (const t of regionalTrees) t.image.setFrame(t.variant * 4 + frame);
    }
    motes.forEach((m, i) => {
      m.y =
        (i * 197 +
          time * (c.world.id === "infernal" ? -0.014 : 0.009) +
          1400 * 100) %
        1400;
      m.x = (i * 139 + Math.sin(time / 1700 + i) * 16) % 1800;
    });
  };
  scene.events.on("update", tick);
  onSceneEnd(scene, () => {
    scene.events.off("update", tick);
    map.destroy();
  });
}
